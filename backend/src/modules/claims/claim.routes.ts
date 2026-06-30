import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import prisma from '@/lib/prisma';
import { authenticate } from '@/middleware/authenticate';
import { requireRole } from '@/middleware/requireRole';
import { validateBody, validateQuery } from '@/middleware/validate';
import { writeAudit } from '@/middleware/audit';
import { NotFoundError, AppError } from '@/utils/errors';
import { calculateLayerRecovery } from './recovery.calc';

const router = Router();
router.use(authenticate);

const createClaimSchema = z.object({
  contractId: z.string().uuid(),
  riskId: z.string().uuid().optional(),
  cedentId: z.string().uuid().optional(),
  catastropheEventId: z.string().uuid().optional(),
  dateOfLoss: z.coerce.date(),
  currency: z.string().default('USD'),
  grossIncurred: z.number().nonnegative(),
  description: z.string().optional(),
  handlerId: z.string().uuid().optional(),
});

router.get(
  '/',
  validateQuery(
    z.object({
      contractId: z.string().uuid().optional(),
      status: z.string().optional(),
      catastropheEventId: z.string().uuid().optional(),
      page: z.coerce.number().default(1),
      pageSize: z.coerce.number().default(25),
    })
  ),
  async (req: Request, res: Response) => {
    const { contractId, status, catastropheEventId, page, pageSize } = req.query as any;
    const where: any = {};
    if (contractId) where.contractId = contractId;
    if (status) where.status = status;
    if (catastropheEventId) where.catastropheEventId = catastropheEventId;

    const [claims, total] = await Promise.all([
      prisma.claim.findMany({
        where,
        include: { contract: true, cedent: true, handler: true },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { dateNotified: 'desc' },
      }),
      prisma.claim.count({ where }),
    ]);
    res.json({ claims, total, page, pageSize });
  }
);

router.get('/:id', async (req: Request, res: Response) => {
  const claim = await prisma.claim.findUnique({
    where: { id: req.params.id },
    include: { contract: true, risk: true, cedent: true, handler: true, movements: { orderBy: { createdAt: 'asc' } }, documents: true },
  });
  if (!claim) throw new NotFoundError('Claim not found');
  res.json({ claim });
});

router.post('/', requireRole('ADMIN', 'CLAIMS'), validateBody(createClaimSchema), async (req: Request, res: Response) => {
  const contract = await prisma.contract.findUnique({ where: { id: req.body.contractId } });
  if (!contract) throw new NotFoundError('Contract not found');

  const recoveryAmount = calculateLayerRecovery(req.body.grossIncurred, contract);
  const claimNumber = `CLM-${new Date().getFullYear()}-${uuidv4().slice(0, 8).toUpperCase()}`;

  const claim = await prisma.$transaction(async (tx) => {
    const created = await tx.claim.create({
      data: {
        ...req.body,
        claimNumber,
        status: 'NOTIFIED',
        reserveAmount: req.body.grossIncurred,
        recoveryAmount,
      },
    });
    await tx.claimMovement.create({
      data: { claimId: created.id, type: 'RESERVE_SET', amount: req.body.grossIncurred, notes: 'Initial reserve on notification' },
    });
    return created;
  });

  await writeAudit({ req, action: 'CREATE', entityName: 'Claim', recordId: claim.id, afterData: claim });
  res.status(201).json({ claim, calculatedRecovery: recoveryAmount });
});

// Reserve adjustment (RBNS/IBNR movement)
router.post(
  '/:id/reserve',
  requireRole('ADMIN', 'CLAIMS', 'ACTUARY'),
  validateBody(z.object({ newReserveAmount: z.number().nonnegative(), notes: z.string().optional(), status: z.enum(['RBNS', 'IBNR', 'RESERVED']).optional() })),
  async (req: Request, res: Response) => {
    const claim = await prisma.claim.findUnique({ where: { id: req.params.id }, include: { contract: true } });
    if (!claim) throw new NotFoundError('Claim not found');

    const delta = req.body.newReserveAmount - Number(claim.reserveAmount);
    const recoveryAmount = calculateLayerRecovery(req.body.newReserveAmount, claim.contract);

    const updated = await prisma.$transaction(async (tx) => {
      const u = await tx.claim.update({
        where: { id: claim.id },
        data: {
          reserveAmount: req.body.newReserveAmount,
          recoveryAmount,
          status: req.body.status ?? claim.status,
          grossIncurred: req.body.newReserveAmount,
        },
      });
      await tx.claimMovement.create({
        data: { claimId: claim.id, type: 'RESERVE_CHANGE', amount: delta, notes: req.body.notes },
      });
      return u;
    });

    await writeAudit({ req, action: 'UPDATE', entityName: 'Claim.Reserve', recordId: claim.id, beforeData: claim, afterData: updated });
    res.json({ claim: updated });
  }
);

// Payment against a claim
router.post(
  '/:id/payment',
  requireRole('ADMIN', 'CLAIMS', 'ACCOUNTS'),
  validateBody(z.object({ amount: z.number().positive(), notes: z.string().optional() })),
  async (req: Request, res: Response) => {
    const claim = await prisma.claim.findUnique({ where: { id: req.params.id } });
    if (!claim) throw new NotFoundError('Claim not found');

    const newPaid = Number(claim.paidAmount) + req.body.amount;
    if (newPaid > Number(claim.grossIncurred) + 0.01) {
      throw new AppError('Payment exceeds gross incurred reserve, adjust reserve first', 400);
    }

    const updated = await prisma.$transaction(async (tx) => {
      const u = await tx.claim.update({
        where: { id: claim.id },
        data: {
          paidAmount: newPaid,
          status: newPaid >= Number(claim.grossIncurred) ? 'SETTLED' : 'PARTIALLY_PAID',
        },
      });
      await tx.claimMovement.create({ data: { claimId: claim.id, type: 'PAYMENT', amount: req.body.amount, notes: req.body.notes } });
      return u;
    });

    await writeAudit({ req, action: 'UPDATE', entityName: 'Claim.Payment', recordId: claim.id, beforeData: claim, afterData: updated });
    res.json({ claim: updated });
  }
);

// Cash call processing for large losses
router.post(
  '/:id/cash-call',
  requireRole('ADMIN', 'CLAIMS', 'ACCOUNTS'),
  validateBody(z.object({ amount: z.number().positive(), notes: z.string().optional() })),
  async (req: Request, res: Response) => {
    const claim = await prisma.claim.findUnique({ where: { id: req.params.id } });
    if (!claim) throw new NotFoundError('Claim not found');

    const updated = await prisma.$transaction(async (tx) => {
      const u = await tx.claim.update({
        where: { id: claim.id },
        data: { cashCallAmount: req.body.amount, cashCallStatus: 'REQUESTED' },
      });
      await tx.claimMovement.create({ data: { claimId: claim.id, type: 'CASH_CALL', amount: req.body.amount, notes: req.body.notes } });
      return u;
    });

    await writeAudit({ req, action: 'CREATE', entityName: 'Claim.CashCall', recordId: claim.id, afterData: updated });
    res.json({ claim: updated });
  }
);

router.patch(
  '/:id/cash-call/status',
  requireRole('ADMIN', 'ACCOUNTS'),
  validateBody(z.object({ status: z.enum(['RECEIVED', 'DECLINED']) })),
  async (req: Request, res: Response) => {
    const claim = await prisma.claim.update({ where: { id: req.params.id }, data: { cashCallStatus: req.body.status } });
    await writeAudit({ req, action: 'UPDATE', entityName: 'Claim.CashCallStatus', recordId: claim.id, afterData: claim });
    res.json({ claim });
  }
);

router.patch(
  '/:id/status',
  requireRole('ADMIN', 'CLAIMS'),
  validateBody(z.object({ status: z.enum(['NOTIFIED', 'RBNS', 'IBNR', 'RESERVED', 'PARTIALLY_PAID', 'SETTLED', 'CLOSED', 'REOPENED', 'REJECTED']) })),
  async (req: Request, res: Response) => {
    const before = await prisma.claim.findUniqueOrThrow({ where: { id: req.params.id } });
    const claim = await prisma.claim.update({ where: { id: req.params.id }, data: { status: req.body.status } });
    await writeAudit({ req, action: 'UPDATE', entityName: 'Claim.Status', recordId: claim.id, beforeData: before, afterData: claim });
    res.json({ claim });
  }
);

// Catastrophe accumulation view — total exposure across all treaties to one event
router.get('/catastrophe/:eventId/exposure', async (req: Request, res: Response) => {
  const claims = await prisma.claim.findMany({
    where: { catastropheEventId: req.params.eventId },
    include: { contract: { select: { contractNumber: true, name: true, treatyType: true } } },
  });
  const totalGrossIncurred = claims.reduce((sum, c) => sum + Number(c.grossIncurred), 0);
  const totalRecovery = claims.reduce((sum, c) => sum + Number(c.recoveryAmount), 0);
  res.json({ claims, totalGrossIncurred, totalRecovery, claimCount: claims.length });
});

export default router;
