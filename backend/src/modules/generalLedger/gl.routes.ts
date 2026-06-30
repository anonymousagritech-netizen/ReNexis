import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import prisma from '@/lib/prisma';
import { authenticate } from '@/middleware/authenticate';
import { requireRole } from '@/middleware/requireRole';
import { validateBody, validateQuery } from '@/middleware/validate';
import { writeAudit } from '@/middleware/audit';
import { AppError, NotFoundError } from '@/utils/errors';

const router = Router();
router.use(authenticate);

// ---- Chart of Accounts ----

const glAccountSchema = z.object({
  entityId: z.string().uuid(),
  code: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(['ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE']),
  parentId: z.string().uuid().optional(),
});

router.get('/accounts', validateQuery(z.object({ entityId: z.string().uuid().optional() })), async (req: Request, res: Response) => {
  const where: any = { isActive: true };
  if (req.query.entityId) where.entityId = req.query.entityId;
  const accounts = await prisma.gLAccount.findMany({ where, orderBy: { code: 'asc' } });
  res.json({ accounts });
});

router.post('/accounts', requireRole('ADMIN', 'ACCOUNTS'), validateBody(glAccountSchema), async (req: Request, res: Response) => {
  const account = await prisma.gLAccount.create({ data: req.body });
  await writeAudit({ req, action: 'CREATE', entityName: 'GLAccount', recordId: account.id, afterData: account });
  res.status(201).json({ account });
});

// ---- Journal Postings (double-entry) ----

const journalLineSchema = z.object({ glAccountId: z.string().uuid(), debit: z.number().nonnegative().default(0), credit: z.number().nonnegative().default(0), description: z.string() });

const postJournalSchema = z.object({
  entityId: z.string().uuid(),
  postingDate: z.coerce.date(),
  currency: z.string().default('USD'),
  source: z.enum(['TECHNICAL_ACCOUNTING', 'GENERAL_ACCOUNTING', 'INVESTMENT', 'MANUAL']).default('MANUAL'),
  contractId: z.string().uuid().optional(),
  claimId: z.string().uuid().optional(),
  lines: z.array(journalLineSchema).min(2),
});

router.post('/journal', requireRole('ADMIN', 'ACCOUNTS'), validateBody(postJournalSchema), async (req: Request, res: Response) => {
  const totalDebit = req.body.lines.reduce((s: number, l: any) => s + l.debit, 0);
  const totalCredit = req.body.lines.reduce((s: number, l: any) => s + l.credit, 0);
  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    throw new AppError(`Journal does not balance: debit ${totalDebit} vs credit ${totalCredit}`, 422);
  }

  const journalRef = `JNL-${Date.now()}-${uuidv4().slice(0, 6)}`;
  const entries = await prisma.$transaction(
    req.body.lines.map((line: any) =>
      prisma.ledgerEntry.create({
        data: {
          entityId: req.body.entityId,
          glAccountId: line.glAccountId,
          journalRef,
          description: line.description,
          debit: line.debit,
          credit: line.credit,
          currency: req.body.currency,
          postingDate: req.body.postingDate,
          source: req.body.source,
          contractId: req.body.contractId,
          claimId: req.body.claimId,
        },
      })
    )
  );

  await writeAudit({ req, action: 'CREATE', entityName: 'LedgerEntry.Journal', recordId: journalRef, afterData: entries });
  res.status(201).json({ journalRef, entries });
});

router.get(
  '/journal',
  validateQuery(z.object({ entityId: z.string().uuid().optional(), glAccountId: z.string().uuid().optional(), from: z.coerce.date().optional(), to: z.coerce.date().optional(), page: z.coerce.number().default(1), pageSize: z.coerce.number().default(50) })),
  async (req: Request, res: Response) => {
    const { entityId, glAccountId, from, to, page, pageSize } = req.query as any;
    const where: any = {};
    if (entityId) where.entityId = entityId;
    if (glAccountId) where.glAccountId = glAccountId;
    if (from || to) where.postingDate = { ...(from && { gte: from }), ...(to && { lte: to }) };

    const [entries, total] = await Promise.all([
      prisma.ledgerEntry.findMany({ where, include: { glAccount: true }, skip: (page - 1) * pageSize, take: pageSize, orderBy: { postingDate: 'desc' } }),
      prisma.ledgerEntry.count({ where }),
    ]);
    res.json({ entries, total, page, pageSize });
  }
);

// ---- Trial Balance / P&L / Balance Sheet ----

router.get('/trial-balance', validateQuery(z.object({ entityId: z.string().uuid(), asOf: z.coerce.date().optional() })), async (req: Request, res: Response) => {
  const { entityId, asOf } = req.query as any;
  const accounts = await prisma.gLAccount.findMany({ where: { entityId } });

  const results = await Promise.all(
    accounts.map(async (account) => {
      const agg = await prisma.ledgerEntry.aggregate({
        where: { glAccountId: account.id, ...(asOf && { postingDate: { lte: asOf } }) },
        _sum: { debit: true, credit: true },
      });
      const debit = Number(agg._sum.debit || 0);
      const credit = Number(agg._sum.credit || 0);
      return { accountCode: account.code, accountName: account.name, type: account.type, debit, credit, balance: debit - credit };
    })
  );

  const totalDebit = results.reduce((s, r) => s + r.debit, 0);
  const totalCredit = results.reduce((s, r) => s + r.credit, 0);

  res.json({ accounts: results, totalDebit, totalCredit, balanced: Math.abs(totalDebit - totalCredit) < 0.01 });
});

router.get('/financial-statements', validateQuery(z.object({ entityId: z.string().uuid(), periodStart: z.coerce.date(), periodEnd: z.coerce.date() })), async (req: Request, res: Response) => {
  const { entityId, periodStart, periodEnd } = req.query as any;
  const accounts = await prisma.gLAccount.findMany({ where: { entityId } });

  const balances = await Promise.all(
    accounts.map(async (account) => {
      const agg = await prisma.ledgerEntry.aggregate({
        where: { glAccountId: account.id, postingDate: { gte: periodStart, lte: periodEnd } },
        _sum: { debit: true, credit: true },
      });
      const net = Number(agg._sum.debit || 0) - Number(agg._sum.credit || 0);
      return { ...account, net };
    })
  );

  const income = balances.filter((a) => a.type === 'INCOME');
  const expense = balances.filter((a) => a.type === 'EXPENSE');
  const assets = balances.filter((a) => a.type === 'ASSET');
  const liabilities = balances.filter((a) => a.type === 'LIABILITY');
  const equity = balances.filter((a) => a.type === 'EQUITY');

  const totalIncome = income.reduce((s, a) => s - a.net, 0); // income accounts carry credit balance
  const totalExpense = expense.reduce((s, a) => s + a.net, 0);
  const netProfit = totalIncome - totalExpense;

  res.json({
    profitAndLoss: { income, expense, totalIncome, totalExpense, netProfit },
    balanceSheet: {
      assets,
      liabilities,
      equity,
      totalAssets: assets.reduce((s, a) => s + a.net, 0),
      totalLiabilities: liabilities.reduce((s, a) => s - a.net, 0),
      totalEquity: equity.reduce((s, a) => s - a.net, 0),
    },
  });
});

// ---- Fixed Assets ----

const fixedAssetSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  acquisitionDate: z.coerce.date(),
  cost: z.number().positive(),
  usefulLifeYears: z.number().int().positive(),
  depreciationMethod: z.string().default('STRAIGHT_LINE'),
});

router.post('/fixed-assets', requireRole('ADMIN', 'ACCOUNTS'), validateBody(fixedAssetSchema), async (req: Request, res: Response) => {
  const asset = await prisma.fixedAsset.create({ data: { ...req.body, currentValue: req.body.cost } });
  await writeAudit({ req, action: 'CREATE', entityName: 'FixedAsset', recordId: asset.id, afterData: asset });
  res.status(201).json({ asset });
});

router.get('/fixed-assets', async (_req: Request, res: Response) => {
  const assets = await prisma.fixedAsset.findMany({ where: { isActive: true } });
  res.json({ assets });
});

// Run straight-line depreciation for a period (called manually or by scheduler)
router.post('/fixed-assets/run-depreciation', requireRole('ADMIN', 'ACCOUNTS'), async (req: Request, res: Response) => {
  const assets = await prisma.fixedAsset.findMany({ where: { isActive: true } });
  const updates = [];
  for (const asset of assets) {
    const annualDep = Number(asset.cost) / asset.usefulLifeYears;
    const monthlyDep = annualDep / 12;
    const newAccum = Number(asset.accumulatedDepreciation) + monthlyDep;
    const newValue = Math.max(0, Number(asset.cost) - newAccum);
    updates.push(
      prisma.fixedAsset.update({ where: { id: asset.id }, data: { accumulatedDepreciation: newAccum, currentValue: newValue } })
    );
  }
  const results = await prisma.$transaction(updates);
  await writeAudit({ req, action: 'UPDATE', entityName: 'FixedAsset.Depreciation', recordId: 'batch' });
  res.json({ updatedAssets: results.length });
});

export default router;
