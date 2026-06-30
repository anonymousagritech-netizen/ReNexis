import { Router, Request, Response } from 'express';
import prisma from '@/lib/prisma';
import { seedDemoData } from '@/lib/seedData';
import { UnauthorizedError } from '@/utils/errors';

const router = Router();

/**
 * One-off demo data seeding, triggered over HTTPS instead of requiring shell access
 * (useful on Render's free tier, which doesn't include a Shell). Protected by a
 * shared secret read from the SEED_SECRET env var — set this in Render, then call
 * this endpoint once. Safe to call multiple times: idempotent past the first run.
 */
router.post('/seed', async (req: Request, res: Response) => {
  const expectedSecret = process.env.SEED_SECRET;
  if (!expectedSecret) {
    return res.status(503).json({ error: 'SEED_SECRET is not configured on this server.' });
  }
  const providedSecret = req.headers['x-seed-secret'];
  if (providedSecret !== expectedSecret) {
    throw new UnauthorizedError('Invalid or missing seed secret.');
  }

  const result = await seedDemoData(prisma);
  res.json({
    message: result.alreadySeeded
      ? 'Demo business data already present, users/entity refreshed only.'
      : 'Demo data seeded successfully.',
    alreadySeeded: result.alreadySeeded,
    demoAccounts: result.demoAccounts,
    defaultPassword: 'Demo@12345',
  });
});

export default router;
