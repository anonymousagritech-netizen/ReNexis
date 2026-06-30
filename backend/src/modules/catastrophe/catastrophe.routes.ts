import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { authenticate } from '@/middleware/authenticate';
import { requireRole } from '@/middleware/requireRole';
import { validateBody } from '@/middleware/validate';
import { writeAudit } from '@/middleware/audit';

const router = Router();
router.use(authenticate);

const eventSchema = z.object({
  name: z.string().min(1),
  peril: z.string().min(1),
  eventDate: z.coerce.date(),
  zone: z.string().optional(),
  description: z.string().optional(),
});

router.get('/', async (_req: Request, res: Response) => {
  const events = await prisma.catastropheEvent.findMany({
    include: { _count: { select: { claims: true } } },
    orderBy: { eventDate: 'desc' },
  });
  res.json({ events });
});

router.post('/', requireRole('ADMIN', 'CLAIMS', 'UNDERWRITER'), validateBody(eventSchema), async (req: Request, res: Response) => {
  const event = await prisma.catastropheEvent.create({ data: req.body });
  await writeAudit({ req, action: 'CREATE', entityName: 'CatastropheEvent', recordId: event.id, afterData: event });
  res.status(201).json({ event });
});

router.get('/:id', async (req: Request, res: Response) => {
  const event = await prisma.catastropheEvent.findUnique({
    where: { id: req.params.id },
    include: { claims: { include: { contract: { select: { contractNumber: true, name: true } } } } },
  });
  const totalGrossIncurred = event?.claims.reduce((s, c) => s + Number(c.grossIncurred), 0) || 0;
  const totalRecovery = event?.claims.reduce((s, c) => s + Number(c.recoveryAmount), 0) || 0;
  res.json({ event, totalGrossIncurred, totalRecovery });
});

export default router;
