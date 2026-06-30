import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { authenticate } from '@/middleware/authenticate';
import { requireRole } from '@/middleware/requireRole';
import { validateQuery } from '@/middleware/validate';

const router = Router();
router.use(authenticate);
router.use(requireRole('ADMIN', 'AUDITOR', 'COMPLIANCE'));

router.get(
  '/',
  validateQuery(
    z.object({
      entityName: z.string().optional(),
      recordId: z.string().optional(),
      userId: z.string().uuid().optional(),
      action: z.string().optional(),
      from: z.coerce.date().optional(),
      to: z.coerce.date().optional(),
      page: z.coerce.number().default(1),
      pageSize: z.coerce.number().default(50),
    })
  ),
  async (req: Request, res: Response) => {
    const { entityName, recordId, userId, action, from, to, page, pageSize } = req.query as any;
    const where: any = {};
    if (entityName) where.entityName = entityName;
    if (recordId) where.recordId = recordId;
    if (userId) where.userId = userId;
    if (action) where.action = action;
    if (from || to) where.createdAt = { ...(from && { gte: from }), ...(to && { lte: to }) };

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: { user: { select: { firstName: true, lastName: true, email: true, role: true } } },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.auditLog.count({ where }),
    ]);
    res.json({ logs, total, page, pageSize });
  }
);

export default router;
