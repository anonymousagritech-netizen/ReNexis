import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { authenticate } from '@/middleware/authenticate';
import { validateQuery } from '@/middleware/validate';

const router = Router();
router.use(authenticate);

router.get(
  '/',
  validateQuery(z.object({ unreadOnly: z.coerce.boolean().optional(), page: z.coerce.number().default(1), pageSize: z.coerce.number().default(30) })),
  async (req: Request, res: Response) => {
    const { unreadOnly, page, pageSize } = req.query as any;
    const where: any = { userId: req.user!.userId };
    if (unreadOnly) where.isRead = false;

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({ where, skip: (page - 1) * pageSize, take: pageSize, orderBy: { createdAt: 'desc' } }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId: req.user!.userId, isRead: false } }),
    ]);
    res.json({ notifications, total, unreadCount, page, pageSize });
  }
);

router.patch('/:id/read', async (req: Request, res: Response) => {
  const notification = await prisma.notification.update({
    where: { id: req.params.id },
    data: { isRead: true },
  });
  res.json({ notification });
});

router.patch('/read-all', async (req: Request, res: Response) => {
  await prisma.notification.updateMany({ where: { userId: req.user!.userId, isRead: false }, data: { isRead: true } });
  res.json({ message: 'All notifications marked as read' });
});

export default router;
