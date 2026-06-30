import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { authenticate } from '@/middleware/authenticate';
import { validateQuery } from '@/middleware/validate';

const router = Router();
router.use(authenticate);

// Treaty performance: premium, claims, loss ratio per contract
router.get('/treaty-performance', validateQuery(z.object({ entityId: z.string().uuid().optional() })), async (req: Request, res: Response) => {
  const where: any = {};
  if (req.query.entityId) where.entityId = req.query.entityId;
  const contracts = await prisma.contract.findMany({
    where,
    include: { premiums: true, claims: true },
  });
  const performance = contracts.map((c) => {
    const premium = c.premiums.reduce((s, p) => s + Number(p.grossPremium), 0);
    const claims = c.claims.reduce((s, cl) => s + Number(cl.grossIncurred), 0);
    return {
      contractId: c.id,
      contractNumber: c.contractNumber,
      name: c.name,
      direction: c.direction,
      status: c.status,
      premium,
      claims,
      lossRatioPct: premium > 0 ? Math.round((claims / premium) * 10000) / 100 : 0,
    };
  });
  res.json({ performance });
});

// Claims aging - days since notification, by status
router.get('/claims-aging', async (_req: Request, res: Response) => {
  const claims = await prisma.claim.findMany({ where: { status: { notIn: ['SETTLED', 'CLOSED', 'REJECTED'] } } });
  const now = Date.now();
  const aging = claims.map((c) => ({
    claimNumber: c.claimNumber,
    status: c.status,
    daysOpen: Math.floor((now - c.dateNotified.getTime()) / (1000 * 60 * 60 * 24)),
    grossIncurred: c.grossIncurred,
    reserveAmount: c.reserveAmount,
  }));
  res.json({ aging });
});

// Bordereaux status summary
router.get('/bordereaux-status', async (_req: Request, res: Response) => {
  const batches = await prisma.bordereauxBatch.groupBy({ by: ['status', 'type'], _count: { id: true } });
  res.json({ batches });
});

// Combined ratio (loss ratio + expense ratio) for management/board reporting
router.get('/combined-ratio', validateQuery(z.object({ periodStart: z.coerce.date(), periodEnd: z.coerce.date() })), async (req: Request, res: Response) => {
  const { periodStart, periodEnd } = req.query as any;
  const premiums = await prisma.premiumTransaction.aggregate({
    where: { transactionDate: { gte: periodStart, lte: periodEnd } },
    _sum: { grossPremium: true, commission: true, brokerage: true },
  });
  const claims = await prisma.claim.aggregate({
    where: { dateNotified: { gte: periodStart, lte: periodEnd } },
    _sum: { grossIncurred: true },
  });

  const premiumTotal = Number(premiums._sum.grossPremium || 0);
  const claimsTotal = Number(claims._sum.grossIncurred || 0);
  const expenseTotal = Number(premiums._sum.commission || 0) + Number(premiums._sum.brokerage || 0);

  const lossRatio = premiumTotal > 0 ? (claimsTotal / premiumTotal) * 100 : 0;
  const expenseRatio = premiumTotal > 0 ? (expenseTotal / premiumTotal) * 100 : 0;

  res.json({
    premiumTotal,
    claimsTotal,
    expenseTotal,
    lossRatioPct: Math.round(lossRatio * 100) / 100,
    expenseRatioPct: Math.round(expenseRatio * 100) / 100,
    combinedRatioPct: Math.round((lossRatio + expenseRatio) * 100) / 100,
  });
});

// Top cedents / reinsurers by premium volume
router.get('/top-counterparties', validateQuery(z.object({ limit: z.coerce.number().default(10) })), async (req: Request, res: Response) => {
  const contractParties = await prisma.contractParty.findMany({
    include: { party: true, contract: { include: { premiums: true } } },
  });
  const byParty = new Map<string, { party: any; totalPremium: number }>();
  for (const cp of contractParties) {
    const premium = cp.contract.premiums.reduce((s, p) => s + Number(p.grossPremium), 0);
    const existing = byParty.get(cp.partyId);
    if (existing) existing.totalPremium += premium;
    else byParty.set(cp.partyId, { party: cp.party, totalPremium: premium });
  }
  const sorted = Array.from(byParty.values()).sort((a, b) => b.totalPremium - a.totalPremium).slice(0, Number(req.query.limit));
  res.json({ topCounterparties: sorted });
});

// Retrocession net position: nets outward-ceded exposure against retro recoveries
// so management can see true risk retained after all layers of protection.
router.get('/retro-net-position', validateQuery(z.object({ entityId: z.string().uuid().optional() })), async (req: Request, res: Response) => {
  const entityIdParam = req.query.entityId as string | undefined;
  const where: any = { isRetrocession: false, direction: 'INWARD' };
  if (entityIdParam) where.entityId = entityIdParam;

  const inwardContracts = await prisma.contract.findMany({ where, include: { claims: true } });
  const retroWhere: any = { isRetrocession: true };
  if (entityIdParam) retroWhere.entityId = entityIdParam;
  const retroContracts = await prisma.contract.findMany({ where: retroWhere, include: { claims: true } });

  const grossAssumedIncurred = inwardContracts.reduce((s, c) => s + c.claims.reduce((s2: number, cl: any) => s2 + Number(cl.grossIncurred), 0), 0);
  const retroRecovered = retroContracts.reduce((s, c) => s + c.claims.reduce((s2: number, cl: any) => s2 + Number(cl.recoveryAmount), 0), 0);
  const netRetainedPosition = grossAssumedIncurred - retroRecovered;

  res.json({
    grossAssumedIncurred,
    retroRecovered,
    netRetainedPosition,
    inwardContractCount: inwardContracts.length,
    retroContractCount: retroContracts.length,
  });
});

// Catastrophe accumulation heatmap data
router.get('/exposure-heatmap', async (_req: Request, res: Response) => {
  const risks = await prisma.risk.findMany({ where: { latitude: { not: null }, longitude: { not: null } }, select: { latitude: true, longitude: true, sumInsured: true, catZone: true, peril: true } });
  res.json({ points: risks });
});

export default router;
