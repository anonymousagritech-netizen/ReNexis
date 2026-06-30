import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { authenticate } from '@/middleware/authenticate';
import { requireRole } from '@/middleware/requireRole';
import { validateBody, validateQuery } from '@/middleware/validate';
import { writeAudit } from '@/middleware/audit';

const router = Router();
router.use(authenticate);

router.get(
  '/checks',
  validateQuery(z.object({ type: z.string().optional(), status: z.string().optional(), page: z.coerce.number().default(1), pageSize: z.coerce.number().default(25) })),
  async (req: Request, res: Response) => {
    const { type, status, page, pageSize } = req.query as any;
    const where: any = {};
    if (type) where.type = type;
    if (status) where.status = status;
    const [checks, total] = await Promise.all([
      prisma.complianceCheck.findMany({ where, skip: (page - 1) * pageSize, take: pageSize, orderBy: { checkedAt: 'desc' } }),
      prisma.complianceCheck.count({ where }),
    ]);
    res.json({ checks, total, page, pageSize });
  }
);

router.post(
  '/checks',
  requireRole('ADMIN', 'COMPLIANCE'),
  validateBody(z.object({ type: z.enum(['KYC', 'AML', 'SOLVENCY', 'SCHEDULE_F', 'IFRS17_CSM', 'GDPR']), subjectType: z.enum(['PARTY', 'CONTRACT', 'ENTITY']), subjectId: z.string().uuid(), status: z.enum(['PENDING', 'PASS', 'FAIL', 'FLAGGED']).default('PENDING'), details: z.record(z.any()).optional() })),
  async (req: Request, res: Response) => {
    const check = await prisma.complianceCheck.create({ data: { ...req.body, checkedById: req.user!.userId } });
    await writeAudit({ req, action: 'CREATE', entityName: 'ComplianceCheck', recordId: check.id, afterData: check });
    res.status(201).json({ check });
  }
);

// Compliance dashboard: flagged parties, pending KYC, AML high-risk counterparties
router.get('/dashboard', async (_req: Request, res: Response) => {
  const [pendingKyc, highRiskParties, flaggedChecks] = await Promise.all([
    prisma.party.count({ where: { kycStatus: 'PENDING' } }),
    prisma.party.findMany({ where: { amlRiskRating: 'HIGH' }, select: { id: true, name: true, type: true, country: true } }),
    prisma.complianceCheck.findMany({ where: { status: 'FLAGGED' }, orderBy: { checkedAt: 'desc' }, take: 20 }),
  ]);
  res.json({ pendingKyc, highRiskParties, flaggedChecks });
});

// ---- Regulatory Reports (Schedule F, Solvency II QRT, IFRS17) ----

router.post(
  '/reports',
  requireRole('ADMIN', 'COMPLIANCE', 'ACTUARY'),
  validateBody(z.object({ reportType: z.enum(['SCHEDULE_F', 'SOLVENCY_II_QRT', 'IFRS17_DISCLOSURE', 'LOCAL']), entityId: z.string().uuid(), periodStart: z.coerce.date(), periodEnd: z.coerce.date() })),
  async (req: Request, res: Response) => {
    const report = await prisma.regulatoryReport.create({ data: req.body });
    await writeAudit({ req, action: 'CREATE', entityName: 'RegulatoryReport', recordId: report.id, afterData: report });
    res.status(201).json({ report });
  }
);

router.get('/reports', validateQuery(z.object({ entityId: z.string().uuid().optional(), reportType: z.string().optional() })), async (req: Request, res: Response) => {
  const where: any = {};
  if (req.query.entityId) where.entityId = req.query.entityId;
  if (req.query.reportType) where.reportType = req.query.reportType;
  const reports = await prisma.regulatoryReport.findMany({ where, orderBy: { createdAt: 'desc' } });
  res.json({ reports });
});

/**
 * Schedule F style export — ceded/assumed reinsurance disclosure.
 * Builds the dataset from contracts + premiums + claims for a given entity/period.
 */
router.get('/reports/schedule-f/data', validateQuery(z.object({ entityId: z.string().uuid(), periodStart: z.coerce.date(), periodEnd: z.coerce.date() })), async (req: Request, res: Response) => {
  const { entityId, periodStart, periodEnd } = req.query as any;
  const contracts = await prisma.contract.findMany({
    where: { entityId },
    include: {
      parties: { include: { party: true } },
      premiums: { where: { transactionDate: { gte: periodStart, lte: periodEnd } } },
      claims: { where: { dateNotified: { gte: periodStart, lte: periodEnd } } },
    },
  });

  const rows = contracts.map((c) => {
    const reinsurer = c.parties.find((p) => p.role === 'REINSURER')?.party?.name || c.parties.find((p) => p.role === 'CEDENT')?.party?.name;
    return {
      contractNumber: c.contractNumber,
      direction: c.direction,
      counterparty: reinsurer,
      premiumWritten: c.premiums.reduce((s, p) => s + Number(p.grossPremium), 0),
      claimsIncurred: c.claims.reduce((s, cl) => s + Number(cl.grossIncurred), 0),
      reserves: c.claims.reduce((s, cl) => s + Number(cl.reserveAmount), 0),
    };
  });

  res.json({ scheduleF: rows });
});

/**
 * Solvency II QRT-style data extract — a simplified capital-adequacy reporting view:
 * technical provisions (reserves), premium volume, and investment asset breakdown
 * for a given entity/period, structured similarly to the EIOPA Quantitative Reporting
 * Template categories (this is a simplified data extract, not a certified QRT filing).
 */
router.get('/reports/solvency-ii/data', validateQuery(z.object({ entityId: z.string().uuid(), periodStart: z.coerce.date(), periodEnd: z.coerce.date() })), async (req: Request, res: Response) => {
  const { entityId, periodStart, periodEnd } = req.query as any;

  const [premiums, claims, investments] = await Promise.all([
    prisma.premiumTransaction.aggregate({
      where: { contract: { entityId }, transactionDate: { gte: periodStart, lte: periodEnd } },
      _sum: { grossPremium: true, netPremium: true },
    }),
    prisma.claim.aggregate({
      where: { contract: { entityId }, dateNotified: { gte: periodStart, lte: periodEnd } },
      _sum: { reserveAmount: true, paidAmount: true },
    }),
    prisma.investment.groupBy({ by: ['assetClass'], _sum: { marketValue: true }, where: { isActive: true } }),
  ]);

  const totalAssets = investments.reduce((s, i) => s + Number(i._sum.marketValue || 0), 0);
  const technicalProvisions = Number(claims._sum.reserveAmount || 0);
  const ownFunds = totalAssets - technicalProvisions;

  res.json({
    solvencyII: {
      premiumWritten: Number(premiums._sum.grossPremium || 0),
      premiumNetOfReinsurance: Number(premiums._sum.netPremium || 0),
      technicalProvisions,
      claimsPaid: Number(claims._sum.paidAmount || 0),
      totalInvestmentAssets: totalAssets,
      assetBreakdown: investments.map((i) => ({ assetClass: i.assetClass, marketValue: Number(i._sum.marketValue || 0) })),
      estimatedOwnFunds: ownFunds,
      solvencyRatioIndicative: technicalProvisions > 0 ? Math.round((ownFunds / technicalProvisions) * 10000) / 100 : null,
    },
  });
});

// ---- IFRS17 CSM tracking ----

const csmSchema = z.object({
  contractId: z.string().uuid(),
  periodStart: z.coerce.date(),
  periodEnd: z.coerce.date(),
  openingCSM: z.number(),
  newBusinessCSM: z.number().default(0),
  interestAccretion: z.number().default(0),
  changesInEstimate: z.number().default(0),
  csmRelease: z.number().default(0),
});

router.post('/csm', requireRole('ADMIN', 'ACTUARY', 'COMPLIANCE'), validateBody(csmSchema), async (req: Request, res: Response) => {
  const closingCSM =
    req.body.openingCSM + req.body.newBusinessCSM + req.body.interestAccretion + req.body.changesInEstimate - req.body.csmRelease;
  const record = await prisma.cSMRecord.create({ data: { ...req.body, closingCSM } });
  await writeAudit({ req, action: 'CREATE', entityName: 'CSMRecord', recordId: record.id, afterData: record });
  res.status(201).json({ csmRecord: record });
});

router.get('/csm', validateQuery(z.object({ contractId: z.string().uuid().optional() })), async (req: Request, res: Response) => {
  const where: any = {};
  if (req.query.contractId) where.contractId = req.query.contractId;
  const records = await prisma.cSMRecord.findMany({ where, orderBy: { periodStart: 'desc' } });
  res.json({ csmRecords: records });
});

export default router;
