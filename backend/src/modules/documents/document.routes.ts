import { Router, Request, Response } from 'express';
import { z } from 'zod';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import prisma from '@/lib/prisma';
import { authenticate } from '@/middleware/authenticate';
import { validateQuery } from '@/middleware/validate';
import { writeAudit } from '@/middleware/audit';
import { NotFoundError } from '@/utils/errors';

const router = Router();
router.use(authenticate);

/**
 * Storage note: this uses local disk storage under /uploads, which is fine for local
 * development and demos but is NOT durable on most PaaS hosts (Render's filesystem is
 * ephemeral and wipes on redeploy). For production, swap DiskStorage below for an S3 or
 * Supabase Storage client — the rest of this module (DB records, API contract) stays the same.
 */
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 25 * 1024 * 1024 } });

router.get(
  '/',
  validateQuery(
    z.object({
      contractId: z.string().uuid().optional(),
      claimId: z.string().uuid().optional(),
      category: z.string().optional(),
      page: z.coerce.number().default(1),
      pageSize: z.coerce.number().default(50),
    })
  ),
  async (req: Request, res: Response) => {
    const { contractId, claimId, category, page, pageSize } = req.query as any;
    const where: any = {};
    if (contractId) where.contractId = contractId;
    if (claimId) where.claimId = claimId;
    if (category) where.category = category;

    const [documents, total] = await Promise.all([
      prisma.document.findMany({
        where,
        include: { uploadedBy: { select: { firstName: true, lastName: true } } },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.document.count({ where }),
    ]);
    res.json({ documents, total, page, pageSize });
  }
);

router.post(
  '/upload',
  upload.single('file'),
  async (req: Request, res: Response) => {
    if (!req.file) throw new NotFoundError('No file uploaded');
    const { title, category, contractId, claimId } = req.body;

    const document = await prisma.document.create({
      data: {
        title: title || req.file.originalname,
        category: category || 'OTHER',
        storageKey: req.file.filename,
        mimeType: req.file.mimetype,
        sizeBytes: req.file.size,
        contractId: contractId || undefined,
        claimId: claimId || undefined,
        uploadedById: req.user!.userId,
      },
    });

    await writeAudit({ req, action: 'CREATE', entityName: 'Document', recordId: document.id, afterData: document });
    res.status(201).json({ document });
  }
);

router.get('/:id/download', async (req: Request, res: Response) => {
  const doc = await prisma.document.findUnique({ where: { id: req.params.id } });
  if (!doc) throw new NotFoundError('Document not found');
  const filePath = path.join(uploadDir, doc.storageKey);
  if (!fs.existsSync(filePath)) throw new NotFoundError('File no longer available in storage');
  res.download(filePath, doc.title);
});

router.delete('/:id', async (req: Request, res: Response) => {
  const doc = await prisma.document.findUnique({ where: { id: req.params.id } });
  if (!doc) throw new NotFoundError('Document not found');
  const filePath = path.join(uploadDir, doc.storageKey);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  await prisma.document.delete({ where: { id: req.params.id } });
  await writeAudit({ req, action: 'DELETE', entityName: 'Document', recordId: req.params.id, beforeData: doc });
  res.json({ message: 'Document deleted' });
});

export default router;
