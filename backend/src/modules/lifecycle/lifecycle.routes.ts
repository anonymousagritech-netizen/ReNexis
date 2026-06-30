import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { authenticate } from '@/middleware/authenticate';
import { validateQuery } from '@/middleware/validate';

const router = Router();
router.use(authenticate);

const STAGES = ['DESIGN', 'QUOTED', 'BOUND', 'IN_FORCE', 'RENEWAL_DUE', 'ENDORSED', 'RUN_OFF', 'CLOSED', 'CANCELLED'];

// Kanban board view: contracts grouped by lifecycle stage
router.get('/board', validateQuery(z.object({ entityId: z.string().uuid().optional() })), async (req: Request, res: Response) => {
  const where: any = {};
  if (req.query.entityId) where.entityId = req.query.entityId;

  const contracts = await prisma.contract.findMany({
    where,
    select: { id: true, contractNumber: true, name: true, status: true, direction: true, kind: true, expiryDate: true, underwriter: { select: { firstName: true, lastName: true } } },
  });

  const board: Record<string, any[]> = {};
  for (const stage of STAGES) board[stage] = [];
  for (const c of contracts) {
    if (board[c.status]) board[c.status].push(c);
  }
  res.json({ board, stages: STAGES });
});

// Renewal radar: contracts expiring within N days that aren't yet marked for renewal
router.get('/renewals-due', validateQuery(z.object({ withinDays: z.coerce.number().default(60) })), async (req: Request, res: Response) => {
  const withinDays = Number(req.query.withinDays);
  const cutoff = new Date(Date.now() + withinDays * 24 * 60 * 60 * 1000);
  const contracts = await prisma.contract.findMany({
    where: {
      expiryDate: { lte: cutoff },
      status: { in: ['IN_FORCE', 'BOUND', 'ENDORSED'] },
    },
    orderBy: { expiryDate: 'asc' },
  });
  res.json({ contracts });
});

// Run-off claims: contracts closed/run-off but with still-open claims (long-tail servicing)
router.get('/run-off-watch', async (_req: Request, res: Response) => {
  const contracts = await prisma.contract.findMany({
    where: { status: { in: ['RUN_OFF', 'CLOSED'] } },
    include: { claims: { where: { status: { notIn: ['SETTLED', 'CLOSED', 'REJECTED'] } } } },
  });
  const withOpenClaims = contracts.filter((c) => c.claims.length > 0).map((c) => ({
    contractNumber: c.contractNumber,
    name: c.name,
    status: c.status,
    openClaimsCount: c.claims.length,
    openClaimsReserve: c.claims.reduce((s, cl) => s + Number(cl.reserveAmount), 0),
  }));
  res.json({ runOffContracts: withOpenClaims });
});

export default router;
