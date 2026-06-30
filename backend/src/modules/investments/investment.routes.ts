import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { authenticate } from '@/middleware/authenticate';
import { requireRole } from '@/middleware/requireRole';
import { validateBody, validateQuery } from '@/middleware/validate';
import { writeAudit } from '@/middleware/audit';
import { NotFoundError } from '@/utils/errors';

const router = Router();
router.use(authenticate);

const investmentSchema = z.object({
  assetName: z.string().min(1),
  assetClass: z.enum(['BOND', 'EQUITY', 'REAL_ESTATE', 'CASH_EQUIVALENT', 'ALTERNATIVE', 'LOAN']),
  identifier: z.string().optional(),
  currency: z.string().default('USD'),
  quantity: z.number().positive(),
  costBasis: z.number().nonnegative(),
  marketValue: z.number().nonnegative(),
  maturityDate: z.coerce.date().optional(),
  acquisitionDate: z.coerce.date(),
  yieldRate: z.number().optional(),
  regulatoryLimitPct: z.number().min(0).max(100).optional(),
  durationYears: z.number().optional(),
});

router.get(
  '/',
  validateQuery(z.object({ assetClass: z.string().optional(), page: z.coerce.number().default(1), pageSize: z.coerce.number().default(25) })),
  async (req: Request, res: Response) => {
    const { assetClass, page, pageSize } = req.query as any;
    const where: any = { isActive: true };
    if (assetClass) where.assetClass = assetClass;
    const [investments, total] = await Promise.all([
      prisma.investment.findMany({ where, skip: (page - 1) * pageSize, take: pageSize, orderBy: { marketValue: 'desc' } }),
      prisma.investment.count({ where }),
    ]);
    res.json({ investments, total, page, pageSize });
  }
);

// Portfolio summary - allocation by asset class, vs regulatory limits
router.get('/portfolio/summary', async (_req: Request, res: Response) => {
  const investments = await prisma.investment.findMany({ where: { isActive: true } });
  const totalMarketValue = investments.reduce((s, i) => s + Number(i.marketValue), 0);

  const byClass = new Map<string, { marketValue: number; count: number; limitPct?: number }>();
  for (const inv of investments) {
    const existing = byClass.get(inv.assetClass) || { marketValue: 0, count: 0 };
    existing.marketValue += Number(inv.marketValue);
    existing.count += 1;
    if (inv.regulatoryLimitPct) existing.limitPct = Number(inv.regulatoryLimitPct);
    byClass.set(inv.assetClass, existing);
  }

  const allocation = Array.from(byClass.entries()).map(([assetClass, v]) => {
    const actualPct = totalMarketValue > 0 ? (v.marketValue / totalMarketValue) * 100 : 0;
    return {
      assetClass,
      marketValue: v.marketValue,
      count: v.count,
      actualPct: Math.round(actualPct * 100) / 100,
      regulatoryLimitPct: v.limitPct ?? null,
      breachesLimit: v.limitPct ? actualPct > v.limitPct : false,
    };
  });

  res.json({ totalMarketValue, allocation });
});

router.post('/', requireRole('ADMIN', 'INVESTMENT_MANAGER'), validateBody(investmentSchema), async (req: Request, res: Response) => {
  const investment = await prisma.investment.create({ data: req.body });
  await writeAudit({ req, action: 'CREATE', entityName: 'Investment', recordId: investment.id, afterData: investment });
  res.status(201).json({ investment });
});

router.get('/:id', async (req: Request, res: Response) => {
  const investment = await prisma.investment.findUnique({
    where: { id: req.params.id },
    include: { incomeRecords: { orderBy: { recognizedDate: 'desc' } }, valuations: { orderBy: { valuationDate: 'desc' } } },
  });
  if (!investment) throw new NotFoundError('Investment not found');
  res.json({ investment });
});

router.post(
  '/:id/income',
  requireRole('ADMIN', 'INVESTMENT_MANAGER'),
  validateBody(z.object({ type: z.enum(['INTEREST', 'DIVIDEND', 'REALIZED_GAIN', 'UNREALIZED_GAIN']), amount: z.number(), recognizedDate: z.coerce.date() })),
  async (req: Request, res: Response) => {
    const income = await prisma.investmentIncome.create({ data: { ...req.body, investmentId: req.params.id } });
    await writeAudit({ req, action: 'CREATE', entityName: 'InvestmentIncome', recordId: income.id, afterData: income });
    res.status(201).json({ income });
  }
);

router.post(
  '/:id/valuation',
  requireRole('ADMIN', 'INVESTMENT_MANAGER'),
  validateBody(z.object({ marketValue: z.number().nonnegative(), valuationDate: z.coerce.date(), source: z.string().default('MANUAL') })),
  async (req: Request, res: Response) => {
    const [valuation] = await prisma.$transaction([
      prisma.investmentValuation.create({ data: { ...req.body, investmentId: req.params.id } }),
      prisma.investment.update({ where: { id: req.params.id }, data: { marketValue: req.body.marketValue } }),
    ]);
    await writeAudit({ req, action: 'UPDATE', entityName: 'Investment.Valuation', recordId: req.params.id, afterData: valuation });
    res.status(201).json({ valuation });
  }
);

// Asset-liability duration matching view (important for life RI reserves)
router.get('/alm/duration-gap', validateQuery(z.object({ liabilityDurationYears: z.coerce.number() })), async (req: Request, res: Response) => {
  const investments = await prisma.investment.findMany({ where: { isActive: true, durationYears: { not: null } } });
  const totalMarketValue = investments.reduce((s, i) => s + Number(i.marketValue), 0);
  const weightedAssetDuration =
    totalMarketValue > 0
      ? investments.reduce((s, i) => s + Number(i.marketValue) * Number(i.durationYears), 0) / totalMarketValue
      : 0;
  const liabilityDuration = Number(req.query.liabilityDurationYears);
  res.json({
    weightedAssetDuration: Math.round(weightedAssetDuration * 100) / 100,
    liabilityDuration,
    durationGap: Math.round((weightedAssetDuration - liabilityDuration) * 100) / 100,
  });
});

export default router;
