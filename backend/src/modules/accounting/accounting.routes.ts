import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { authenticate } from '@/middleware/authenticate';
import { requireRole } from '@/middleware/requireRole';
import { validateBody, validateQuery } from '@/middleware/validate';
import { writeAudit } from '@/middleware/audit';
import { NotFoundError } from '@/utils/errors';
import { calculateCommission } from '@/modules/claims/recovery.calc';

const router = Router();
router.use(authenticate);

/**
 * Generate a Statement of Account for a treaty over a period.
 * Aggregates premium, claims, commission, brokerage from the technical accounting tables
 * and computes profit commission off the period loss ratio — this is the
 * "technical account" view (the business of reinsurance), separate from current account (cash).
 */
router.post(
  '/soa/generate',
  requireRole('ADMIN', 'ACCOUNTS'),
  validateBody(z.object({ contractId: z.string().uuid(), periodStart: z.coerce.date(), periodEnd: z.coerce.date() })),
  async (req: Request, res: Response) => {
    const { contractId, periodStart, periodEnd } = req.body;
    const contract = await prisma.contract.findUnique({ where: { id: contractId } });
    if (!contract) throw new NotFoundError('Contract not found');

    const premiums = await prisma.premiumTransaction.findMany({
      where: { contractId, transactionDate: { gte: periodStart, lte: periodEnd } },
    });
    const claims = await prisma.claim.findMany({
      where: { contractId, dateNotified: { gte: periodStart, lte: periodEnd } },
    });

    const isOutward = contract.direction === 'OUTWARD';
    const premiumTotal = premiums.reduce((s, p) => s + Number(p.grossPremium), 0);
    const brokerageTotal = premiums.reduce((s, p) => s + Number(p.brokerage), 0);
    const commissionTotal = premiums.reduce((s, p) => s + Number(p.commission), 0);
    const claimsTotal = claims.reduce((s, c) => s + Number(c.recoveryAmount || c.grossIncurred), 0);

    const lossRatioPct = premiumTotal > 0 ? (claimsTotal / premiumTotal) * 100 : 0;
    const profitCommission =
      contract.profitCommissionPct && lossRatioPct < 100
        ? Math.round(premiumTotal * (1 - lossRatioPct / 100) * (Number(contract.profitCommissionPct) / 100) * 100) / 100
        : 0;

    const balance =
      (isOutward ? -premiumTotal : premiumTotal) +
      (isOutward ? claimsTotal : -claimsTotal) -
      commissionTotal -
      brokerageTotal -
      profitCommission;

    const soa = await prisma.statementOfAccount.create({
      data: {
        contractId,
        periodStart,
        periodEnd,
        currency: contract.currency,
        premiumIn: isOutward ? 0 : premiumTotal,
        premiumOut: isOutward ? premiumTotal : 0,
        claimsIn: isOutward ? claimsTotal : 0,
        claimsOut: isOutward ? 0 : claimsTotal,
        commission: commissionTotal,
        brokerage: brokerageTotal,
        profitCommission,
        balance,
        status: 'DRAFT',
      },
    });

    await writeAudit({ req, action: 'CREATE', entityName: 'StatementOfAccount', recordId: soa.id, afterData: soa });
    res.status(201).json({ statementOfAccount: soa, lossRatioPct });
  }
);

router.get(
  '/soa',
  validateQuery(z.object({ contractId: z.string().uuid().optional(), page: z.coerce.number().default(1), pageSize: z.coerce.number().default(25) })),
  async (req: Request, res: Response) => {
    const { contractId, page, pageSize } = req.query as any;
    const where: any = {};
    if (contractId) where.contractId = contractId;
    const [statements, total] = await Promise.all([
      prisma.statementOfAccount.findMany({ where, include: { contract: true }, skip: (page - 1) * pageSize, take: pageSize, orderBy: { createdAt: 'desc' } }),
      prisma.statementOfAccount.count({ where }),
    ]);
    res.json({ statements, total, page, pageSize });
  }
);

router.patch(
  '/soa/:id/issue',
  requireRole('ADMIN', 'ACCOUNTS'),
  async (req: Request, res: Response) => {
    const soa = await prisma.statementOfAccount.update({ where: { id: req.params.id }, data: { status: 'ISSUED', issuedAt: new Date() } });
    await writeAudit({ req, action: 'UPDATE', entityName: 'StatementOfAccount.Issue', recordId: soa.id, afterData: soa });
    res.json({ statementOfAccount: soa });
  }
);

router.patch('/soa/:id/settle', requireRole('ADMIN', 'ACCOUNTS'), async (req: Request, res: Response) => {
  const soa = await prisma.statementOfAccount.update({ where: { id: req.params.id }, data: { status: 'SETTLED' } });
  await writeAudit({ req, action: 'UPDATE', entityName: 'StatementOfAccount.Settle', recordId: soa.id, afterData: soa });
  res.json({ statementOfAccount: soa });
});

// ---- Current Account (cash owed between RI company and cedent/broker) ----

const currentAccountSchema = z.object({
  partyId: z.string().uuid(),
  currency: z.string().default('USD'),
  description: z.string().min(1),
  debit: z.number().nonnegative().default(0),
  credit: z.number().nonnegative().default(0),
  transactionDate: z.coerce.date(),
  reference: z.string().optional(),
});

router.post('/current-account', requireRole('ADMIN', 'ACCOUNTS'), validateBody(currentAccountSchema), async (req: Request, res: Response) => {
  const entry = await prisma.currentAccountEntry.create({ data: req.body });
  await writeAudit({ req, action: 'CREATE', entityName: 'CurrentAccountEntry', recordId: entry.id, afterData: entry });
  res.status(201).json({ entry });
});

router.get(
  '/current-account',
  validateQuery(z.object({ partyId: z.string().uuid().optional(), reconciled: z.coerce.boolean().optional(), page: z.coerce.number().default(1), pageSize: z.coerce.number().default(25) })),
  async (req: Request, res: Response) => {
    const { partyId, reconciled, page, pageSize } = req.query as any;
    const where: any = {};
    if (partyId) where.partyId = partyId;
    if (reconciled !== undefined) where.reconciled = reconciled;
    const [entries, total] = await Promise.all([
      prisma.currentAccountEntry.findMany({ where, include: { party: true }, skip: (page - 1) * pageSize, take: pageSize, orderBy: { transactionDate: 'desc' } }),
      prisma.currentAccountEntry.count({ where }),
    ]);
    const outstanding = entries.reduce((sum, e) => sum + Number(e.debit) - Number(e.credit), 0);
    res.json({ entries, total, page, pageSize, outstanding });
  }
);

// Bank reconciliation matching: compares amount + date + reference against a bank statement line
router.post(
  '/current-account/reconcile',
  requireRole('ADMIN', 'ACCOUNTS'),
  validateBody(z.object({ entryId: z.string().uuid(), bankStatementRef: z.string().min(1) })),
  async (req: Request, res: Response) => {
    const entry = await prisma.currentAccountEntry.update({
      where: { id: req.body.entryId },
      data: { reconciled: true, bankStatementRef: req.body.bankStatementRef },
    });
    await writeAudit({ req, action: 'UPDATE', entityName: 'CurrentAccountEntry.Reconcile', recordId: entry.id, afterData: entry });
    res.json({ entry });
  }
);

// Aging report - outstanding balances per party
router.get('/current-account/aging', async (_req: Request, res: Response) => {
  const entries = await prisma.currentAccountEntry.findMany({ where: { reconciled: false }, include: { party: true } });
  const byParty = new Map<string, { party: any; outstanding: number; oldestDate: Date }>();
  for (const e of entries) {
    const net = Number(e.debit) - Number(e.credit);
    const existing = byParty.get(e.partyId);
    if (existing) {
      existing.outstanding += net;
      if (e.transactionDate < existing.oldestDate) existing.oldestDate = e.transactionDate;
    } else {
      byParty.set(e.partyId, { party: e.party, outstanding: net, oldestDate: e.transactionDate });
    }
  }
  const now = Date.now();
  const aging = Array.from(byParty.values()).map((v) => ({
    ...v,
    daysOutstanding: Math.floor((now - v.oldestDate.getTime()) / (1000 * 60 * 60 * 24)),
  }));
  res.json({ aging });
});

// ---- FX Rates & Revaluation ----

router.post(
  '/fx-rates',
  requireRole('ADMIN', 'ACCOUNTS'),
  validateBody(z.object({ baseCurrency: z.string(), quoteCurrency: z.string(), rate: z.number().positive(), rateDate: z.coerce.date(), source: z.string().default('MANUAL') })),
  async (req: Request, res: Response) => {
    const fx = await prisma.fxRate.upsert({
      where: { baseCurrency_quoteCurrency_rateDate: { baseCurrency: req.body.baseCurrency, quoteCurrency: req.body.quoteCurrency, rateDate: req.body.rateDate } },
      update: { rate: req.body.rate, source: req.body.source },
      create: req.body,
    });
    res.status(201).json({ fxRate: fx });
  }
);

router.get('/fx-rates', validateQuery(z.object({ baseCurrency: z.string().optional() })), async (req: Request, res: Response) => {
  const rates = await prisma.fxRate.findMany({
    where: req.query.baseCurrency ? { baseCurrency: req.query.baseCurrency as string } : {},
    orderBy: { rateDate: 'desc' },
    take: 100,
  });
  res.json({ rates });
});

export default router;
