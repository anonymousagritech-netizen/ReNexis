import 'dotenv/config';
import { createApp } from './app';
import { logger } from '@/lib/logger';
import prisma from '@/lib/prisma';
import { startScheduledJobs } from '@/jobs/scheduler';

const PORT = Number(process.env.PORT) || 4000;

async function main() {
  await prisma.$connect();
  logger.info('Database connected');

  const app = createApp();

  app.listen(PORT, () => {
    logger.info(`ReNexis backend listening on port ${PORT}`);
  });

  startScheduledJobs();
}

main().catch((err) => {
  logger.error({ err }, 'Failed to start server');
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'Unhandled promise rejection');
});
