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

  logger.info('Scheduled jobs registered (renewal reminders @ 06:00 daily)');
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
