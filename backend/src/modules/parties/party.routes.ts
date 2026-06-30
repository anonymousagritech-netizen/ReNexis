import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { authenticate } from '@/middleware/authenticate';
import { requireRole } from '@/middleware/requireRole';
import { validateBody, validateQuery } from '@/middleware/validate';
import { writeAudit } from '@/middleware/audit';

const router = Router();
router.use(authenticate);

const partySchema = z.object({
  name: z.string().min(1),
  type: z.enum(['CEDENT', 'BROKER', 'REINSURER', 'RETROCESSIONAIRE']),
  country: z.string().min(1),
  currency: z.string().default('USD'),
  registrationNo: z.string().optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
  address: z.string().optional(),
  creditRating: z.string().optional(),
  ratingAgency: z.string().optional(),
});

const listQuerySchema = z.object({
  type: z.enum(['CEDENT', 'BROKER', 'REINSURER', 'RETROCESSIONAIRE']).optional(),
  search: z.string().optional(),
  page: z.coerce.number().default(1),
  pageSize: z.coerce.number().default(25),
});

router.get('/', validateQuery(listQuerySchema), async (req: Request, res: Response) => {
  const { type, search, page, pageSize } = req.query as any;
  const where: any = {};
  if (type) where.type = type;
  if (search) where.name = { contains: search, mode: 'insensitive' };

  const [parties, total] = await Promise.all([
    prisma.party.findMany({ where, skip: (page - 1) * pageSize, take: pageSize, orderBy: { name: 'asc' } }),
    prisma.party.count({ where }),
  ]);
  res.json({ parties, total, page, pageSize });
});

router.get('/:id', async (req: Request, res: Response) => {
  const party = await prisma.party.findUniqueOrThrow({
    where: { id: req.params.id },
    include: { contractParties: { include: { contract: true } } },
  });
  res.json({ party });
});

router.post(
  '/',
  requireRole('ADMIN', 'UNDERWRITER', 'COMPLIANCE'),
  validateBody(partySchema),
  async (req: Request, res: Response) => {
    const party = await prisma.party.create({ data: req.body });
    await writeAudit({ req, action: 'CREATE', entityName: 'Party', recordId: party.id, afterData: party });
    res.status(201).json({ party });
  }
);

router.put(
  '/:id',
  requireRole('ADMIN', 'UNDERWRITER', 'COMPLIANCE'),
  validateBody(partySchema.partial()),
  async (req: Request, res: Response) => {
    const before = await prisma.party.findUniqueOrThrow({ where: { id: req.params.id } });
    const party = await prisma.party.update({ where: { id: req.params.id }, data: req.body });
    await writeAudit({ req, action: 'UPDATE', entityName: 'Party', recordId: party.id, beforeData: before, afterData: party });
    res.json({ party });
  }
);

// KYC/AML status update — restricted to compliance officers (segregation of duties)
router.patch(
  '/:id/kyc',
  requireRole('ADMIN', 'COMPLIANCE'),
  validateBody(z.object({ kycStatus: z.enum(['PENDING', 'VERIFIED', 'REJECTED', 'EXPIRED']), amlRiskRating: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional() })),
  async (req: Request, res: Response) => {
    const before = await prisma.party.findUniqueOrThrow({ where: { id: req.params.id } });
    const party = await prisma.party.update({ where: { id: req.params.id }, data: req.body });
    await prisma.complianceCheck.create({
      data: {
        type: 'KYC',
        subjectType: 'PARTY',
        subjectId: party.id,
        status: req.body.kycStatus === 'VERIFIED' ? 'PASS' : req.body.kycStatus === 'REJECTED' ? 'FAIL' : 'PENDING',
        checkedById: req.user?.userId,
        details: { amlRiskRating: party.amlRiskRating },
      },
    });
    await writeAudit({ req, action: 'UPDATE', entityName: 'Party.KYC', recordId: party.id, beforeData: before, afterData: party });
    res.json({ party });
  }
);

router.delete('/:id', requireRole('ADMIN'), async (req: Request, res: Response) => {
  const before = await prisma.party.findUniqueOrThrow({ where: { id: req.params.id } });
  await prisma.party.update({ where: { id: req.params.id }, data: { isActive: false } });
  await writeAudit({ req, action: 'DELETE', entityName: 'Party', recordId: req.params.id, beforeData: before });
  res.json({ message: 'Party deactivated' });
});

export default router;
