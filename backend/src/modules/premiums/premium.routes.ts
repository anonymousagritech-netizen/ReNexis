import { Router, Request, Response } from 'express';
import { z } from 'zod';
import multer from 'multer';
import ExcelJS from 'exceljs';
import prisma from '@/lib/prisma';
import { authenticate } from '@/middleware/authenticate';
import { requireRole } from '@/middleware/requireRole';
import { validateBody, validateQuery } from '@/middleware/validate';
import { writeAudit } from '@/middleware/audit';
import { NotFoundError } from '@/utils/errors';

const router = Router();
router.use(authenticate);
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });

const premiumSchema = z.object({
  contractId: z.string().uuid(),
  riskId: z.string().uuid().optional(),
  transactionDate: z.coerce.date(),
  grossPremium: z.number().nonnegative(),
  brokerage: z.number().nonnegative().default(0),
  commission: z.number().nonnegative().default(0),
  currency: z.string().default('USD'),
});

router.get(
  '/',
  validateQuery(
    z.object({
      contractId: z.string().uuid().optional(),
      status: z.string().optional(),
      page: z.coerce.number().default(1),
      pageSize: z.coerce.number().default(25),
    })
  ),
  async (req: Request, res: Response) => {
    const { contractId, status, page, pageSize } = req.query as any;
    const where: any = {};
    if (contractId) where.contractId = contractId;
    if (status) where.status = status;
    const [premiums, total] = await Promise.all([
      prisma.premiumTransaction.findMany({ where, include: { contract: true }, skip: (page - 1) * pageSize, take: pageSize, orderBy: { transactionDate: 'desc' } }),
      prisma.premiumTransaction.count({ where }),
    ]);
    res.json({ premiums, total, page, pageSize });
  }
);

router.post('/', requireRole('ADMIN', 'UNDERWRITER', 'ACCOUNTS'), validateBody(premiumSchema), async (req: Request, res: Response) => {
  const contract = await prisma.contract.findUnique({ where: { id: req.body.contractId } });
  if (!contract) throw new NotFoundError('Contract not found');

  const netPremium = req.body.grossPremium - req.body.brokerage - req.body.commission;
  const premium = await prisma.premiumTransaction.create({
    data: { ...req.body, netPremium, status: 'WRITTEN' },
  });

  await writeAudit({ req, action: 'CREATE', entityName: 'PremiumTransaction', recordId: premium.id, afterData: premium });
  res.status(201).json({ premium });
});

/**
 * Bordereaux ingestion: cedent-submitted Excel/CSV premium data.
 * Parses the file, maps rows, and bulk-inserts as premium transactions linked to a batch
 * for traceability. Expected columns: contractNumber, riskRef, transactionDate, grossPremium,
 * brokerage, commission, currency.
 */
router.post(
  '/bordereaux/upload',
  requireRole('ADMIN', 'UNDERWRITER', 'ACCOUNTS'),
  upload.single('file'),
  async (req: Request, res: Response) => {
    if (!req.file) throw new NotFoundError('No file uploaded');

    const batch = await prisma.bordereauxBatch.create({
      data: { type: 'PREMIUM', fileName: req.file.originalname, status: 'PROCESSING' },
    });

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer as any);
    const sheet = workbook.worksheets[0];

    const headerRow = sheet.getRow(1).values as string[];
    const colIndex = (name: string) => headerRow.findIndex((h) => (h || '').toString().toLowerCase().trim() === name.toLowerCase());

    const idx = {
      contractNumber: colIndex('contractNumber'),
      riskRef: colIndex('riskRef'),
      transactionDate: colIndex('transactionDate'),
      grossPremium: colIndex('grossPremium'),
      brokerage: colIndex('brokerage'),
      commission: colIndex('commission'),
      currency: colIndex('currency'),
    };

    const errors: any[] = [];
    let successCount = 0;
    const rows: any[] = [];

    for (let i = 2; i <= sheet.rowCount; i++) {
      const row = sheet.getRow(i);
      if (!row.hasValues) continue;
      const contractNumber = row.getCell(idx.contractNumber).text?.trim();
      if (!contractNumber) continue;

      const contract = await prisma.contract.findUnique({ where: { contractNumber } });
      if (!contract) {
        errors.push({ row: i, error: `Contract ${contractNumber} not found` });
        continue;
      }

      const grossPremium = Number(row.getCell(idx.grossPremium).value) || 0;
      const brokerage = idx.brokerage >= 0 ? Number(row.getCell(idx.brokerage).value) || 0 : 0;
      const commission = idx.commission >= 0 ? Number(row.getCell(idx.commission).value) || 0 : 0;

      rows.push({
        contractId: contract.id,
        transactionDate: new Date(row.getCell(idx.transactionDate).value as any) || new Date(),
        grossPremium,
        brokerage,
        commission,
        netPremium: grossPremium - brokerage - commission,
        currency: (idx.currency >= 0 && row.getCell(idx.currency).text) || contract.currency,
        status: 'WRITTEN' as const,
        bordereauxBatchId: batch.id,
      });
      successCount++;
    }

    if (rows.length) {
      await prisma.premiumTransaction.createMany({ data: rows });
    }

    const updatedBatch = await prisma.bordereauxBatch.update({
      where: { id: batch.id },
      data: {
        status: errors.length && successCount === 0 ? 'FAILED' : 'COMPLETED',
        totalRecords: successCount,
        errorLog: errors.length ? errors : undefined,
      },
    });

    await writeAudit({ req, action: 'CREATE', entityName: 'BordereauxBatch', recordId: batch.id, afterData: updatedBatch });
    res.status(201).json({ batch: updatedBatch, successCount, errors });
  }
);

router.get('/bordereaux/:batchId', async (req: Request, res: Response) => {
  const batch = await prisma.bordereauxBatch.findUnique({ where: { id: req.params.batchId }, include: { premiums: true } });
  if (!batch) throw new NotFoundError('Batch not found');
  res.json({ batch });
});

export default router;
