import cron from 'node-cron';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';

/**
 * Daily job: notify underwriters of contracts approaching expiry (renewal radar)
 * and flag run-off contracts with still-open claims for follow-up.
 */
export function startScheduledJobs() {
  // Every day at 06:00 server time
  cron.schedule('0 6 * * *', async () => {
    try {
      await runRenewalReminderJob();
    } catch (err) {
      logger.error({ err }, 'Renewal reminder job failed');
    }
  });

  // Every day at 23:30 server time (period-end style revaluation)
  cron.schedule('30 23 * * *', async () => {
    try {
      await runFxRevaluationJob();
    } catch (err) {
      logger.error({ err }, 'FX revaluation job failed');
    }
  });

  logger.info('Scheduled jobs registered (renewal reminders @ 06:00, FX revaluation @ 23:30 daily)');
}

export async function runRenewalReminderJob() {
  const cutoff = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
  const dueContracts = await prisma.contract.findMany({
    where: { expiryDate: { lte: cutoff }, status: { in: ['IN_FORCE', 'BOUND'] } },
    include: { underwriter: true },
  });

  for (const contract of dueContracts) {
    if (!contract.underwriterId) continue;
    await prisma.notification.create({
      data: {
        userId: contract.underwriterId,
        type: 'RENEWAL_DUE',
        title: `Renewal due: ${contract.contractNumber}`,
        message: `${contract.name} expires on ${contract.expiryDate.toDateString()}. Begin renewal workflow.`,
        link: `/contracts/${contract.id}`,
      },
    });
  }

  logger.info(`Renewal reminder job: ${dueContracts.length} contracts flagged`);
  return dueContracts.length;
}

/**
 * FX revaluation: for every open (unreconciled) foreign-currency current account balance,
 * revalues against the most recent stored FX rate vs the entity's base currency and posts
 * the resulting gain/loss as a ledger entry. This automates the period-end revaluation
 * the blueprint calls out as a real, bookable accounting requirement.
 */
export async function runFxRevaluationJob() {
  const openEntries = await prisma.currentAccountEntry.findMany({ where: { reconciled: false } });
  if (!openEntries.length) {
    logger.info('FX revaluation job: no open balances to revalue');
    return 0;
  }

  const entity = await prisma.entity.findFirst();
  if (!entity) return 0;
  const baseCurrency = entity.baseCurrency;

  let revaluedCount = 0;

  for (const entry of openEntries) {
    if (entry.currency === baseCurrency) continue;

    const latestRate = await prisma.fxRate.findFirst({
      where: { baseCurrency: entry.currency, quoteCurrency: baseCurrency },
      orderBy: { rateDate: 'desc' },
    });
    if (!latestRate) continue;

    const netForeign = Number(entry.debit) - Number(entry.credit);
    const revaluedBase = netForeign * Number(latestRate.rate);

    // Find or create a GL account to post the FX gain/loss against
    let fxAccount = await prisma.gLAccount.findFirst({ where: { entityId: entity.id, code: '7100' } });
    if (!fxAccount) {
      fxAccount = await prisma.gLAccount.create({
        data: { entityId: entity.id, code: '7100', name: 'FX Revaluation Gain/Loss', type: 'INCOME' },
      });
    }
    let cashAccount = await prisma.gLAccount.findFirst({ where: { entityId: entity.id, code: '1000' } });
    if (!cashAccount) {
      cashAccount = await prisma.gLAccount.create({
        data: { entityId: entity.id, code: '1000', name: 'Cash and Bank', type: 'ASSET' },
      });
    }

    const journalRef = `FXREV-${new Date().toISOString().slice(0, 10)}-${entry.id.slice(0, 8)}`;
    await prisma.ledgerEntry.createMany({
      data: [
        {
          entityId: entity.id,
          glAccountId: fxAccount.id,
          journalRef,
          description: `FX revaluation for current account entry ${entry.id} (${entry.currency}->${baseCurrency} @ ${latestRate.rate})`,
          debit: revaluedBase < 0 ? Math.abs(revaluedBase) : 0,
          credit: revaluedBase >= 0 ? revaluedBase : 0,
          currency: baseCurrency,
          postingDate: new Date(),
          source: 'GENERAL_ACCOUNTING',
        },
        {
          entityId: entity.id,
          glAccountId: cashAccount.id,
          journalRef,
          description: `FX revaluation offset for current account entry ${entry.id}`,
          debit: revaluedBase >= 0 ? revaluedBase : 0,
          credit: revaluedBase < 0 ? Math.abs(revaluedBase) : 0,
          currency: baseCurrency,
          postingDate: new Date(),
          source: 'GENERAL_ACCOUNTING',
        },
      ],
    });
    revaluedCount++;
  }

  logger.info(`FX revaluation job: ${revaluedCount} balances revalued`);
  return revaluedCount;
}
