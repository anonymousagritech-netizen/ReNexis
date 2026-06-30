import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { authenticate } from '@/middleware/authenticate';
import { requireRole } from '@/middleware/requireRole';
import { validateBody, validateQuery } from '@/middleware/validate';
import { writeAudit } from '@/middleware/audit';
import { AppError, NotFoundError } from '@/utils/errors';

const router = Router();
router.use(authenticate);

const riskSchema = z.object({
  contractId: z.string().uuid(),
  riskRef: z.string().min(1),
  description: z.string().optional(),
  sumInsured: z.number().positive(),
  premiumAmount: z.number().nonnegative(),
  currency: z.string().default('USD'),
  catZone: z.string().optional(),
  peril: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  inceptionDate: z.coerce.date(),
  expiryDate: z.coerce.date(),
});

router.get(
  '/',
  validateQuery(
    z.object({
      contractId: z.string().uuid().optional(),
      catZone: z.string().optional(),
      page: z.coerce.number().default(1),
      pageSize: z.coerce.number().default(25),
    })
  ),
  async (req: Request, res: Response) => {
    const { contractId, catZone, page, pageSize } = req.query as any;
    const where: any = {};
    if (contractId) where.contractId = contractId;
    if (catZone) where.catZone = catZone;
    const [risks, total] = await Promise.all([
      prisma.risk.findMany({ where, skip: (page - 1) * pageSize, take: pageSize, orderBy: { createdAt: 'desc' } }),
      prisma.risk.count({ where }),
    ]);
    res.json({ risks, total, page, pageSize });
  }
);

// Catastrophe accumulation / exposure by zone — used for heatmaps
router.get('/accumulation/by-zone', async (_req: Request, res: Response) => {
  const grouped = await prisma.risk.groupBy({
    by: ['catZone', 'peril'],
    _sum: { sumInsured: true, allocatedAmount: true },
    where: { catZone: { not: null } },
  });
  res.json({ accumulation: grouped });
});

router.post('/', requireRole('ADMIN', 'UNDERWRITER'), validateBody(riskSchema), async (req: Request, res: Response) => {
  const contract = await prisma.contract.findUnique({ where: { id: req.body.contractId } });
  if (!contract) throw new NotFoundError('Contract not found');

  // Automatic allocation against treaty capacity
  let allocatedAmount = req.body.sumInsured;
  let exceedsAutoCapacity = false;
  let specialAcceptanceStatus: string | null = null;

  if (contract.totalCapacity) {
    const remainingCapacity = Number(contract.totalCapacity) - Number(contract.capacityUsed);
    if (allocatedAmount > remainingCapacity) {
      exceedsAutoCapacity = true;
      specialAcceptanceStatus = 'PENDING';
    }
  }

  const risk = await prisma.$transaction(async (tx) => {
    const created = await tx.risk.create({
      data: { ...req.body, allocatedAmount, exceedsAutoCapacity, specialAcceptanceStatus },
    });
    if (!exceedsAutoCapacity) {
      await tx.contract.update({
        where: { id: contract.id },
        data: { capacityUsed: { increment: allocatedAmount } },
      });
    } else {
      // Raise an approval request for special acceptance
      await tx.approval.create({
        data: {
          subjectType: 'RISK',
          subjectId: created.id,
          requestedAmount: allocatedAmount,
          status: 'PENDING',
        },
      });
    }
    return created;
  });

  await writeAudit({ req, action: 'CREATE', entityName: 'Risk', recordId: risk.id, afterData: risk });
  res.status(201).json({ risk, requiresSpecialAcceptance: exceedsAutoCapacity });
});

router.get('/:id', async (req: Request, res: Response) => {
  const risk = await prisma.risk.findUnique({ where: { id: req.params.id }, include: { contract: true, claims: true } });
  if (!risk) throw new NotFoundError('Risk not found');
  res.json({ risk });
});

// Special acceptance approval workflow
router.patch(
  '/:id/special-acceptance',
  requireRole('ADMIN', 'UNDERWRITER'),
  validateBody(z.object({ decision: z.enum(['APPROVED', 'REJECTED']), comments: z.string().optional() })),
  async (req: Request, res: Response) => {
    const risk = await prisma.risk.findUnique({ where: { id: req.params.id } });
    if (!risk) throw new NotFoundError('Risk not found');
    if (risk.specialAcceptanceStatus !== 'PENDING') {
      throw new AppError('This risk is not pending special acceptance', 400);
    }

    const updated = await prisma.$transaction(async (tx) => {
      const r = await tx.risk.update({
        where: { id: req.params.id },
        data: { specialAcceptanceStatus: req.body.decision },
      });
      if (req.body.decision === 'APPROVED') {
        await tx.contract.update({
          where: { id: risk.contractId },
          data: { capacityUsed: { increment: Number(risk.allocatedAmount) } },
        });
      }
      await tx.approval.updateMany({
        where: { subjectType: 'RISK', subjectId: risk.id, status: 'PENDING' },
        data: { status: req.body.decision, approverId: req.user!.userId, comments: req.body.comments, decidedAt: new Date() },
      });
      return r;
    });

    await writeAudit({ req, action: 'APPROVE', entityName: 'Risk.SpecialAcceptance', recordId: risk.id, afterData: updated });
    res.json({ risk: updated });
  }
);

export default router;
