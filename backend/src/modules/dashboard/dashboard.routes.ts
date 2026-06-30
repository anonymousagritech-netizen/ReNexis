import { Router, Request, Response } from 'express';
import prisma from '@/lib/prisma';
import { authenticate } from '@/middleware/authenticate';

const router = Router();
router.use(authenticate);

router.get('/overview', async (_req: Request, res: Response) => {
  const [
    totalContracts,
    inForceContracts,
    renewalsDueSoon,
    openClaims,
    totalReserves,
    pendingApprovals,
    totalInvestmentValue,
    pendingKyc,
  ] = await Promise.all([
    prisma.contract.count(),
    prisma.contract.count({ where: { status: 'IN_FORCE' } }),
    prisma.contract.count({ where: { expiryDate: { lte: new Date(Date.now() + 60 * 86400000) }, status: { in: ['IN_FORCE', 'BOUND'] } } }),
    prisma.claim.count({ where: { status: { notIn: ['SETTLED', 'CLOSED', 'REJECTED'] } } }),
    prisma.claim.aggregate({ _sum: { reserveAmount: true }, where: { status: { notIn: ['SETTLED', 'CLOSED', 'REJECTED'] } } }),
    prisma.approval.count({ where: { status: 'PENDING' } }),
    prisma.investment.aggregate({ _sum: { marketValue: true }, where: { isActive: true } }),
    prisma.party.count({ where: { kycStatus: 'PENDING' } }),
  ]);

  res.json({
    totalContracts,
    inForceContracts,
    renewalsDueSoon,
    openClaims,
    totalReserves: totalReserves._sum.reserveAmount || 0,
    pendingApprovals,
    totalInvestmentValue: totalInvestmentValue._sum.marketValue || 0,
    pendingKyc,
  });
});

export default router;
