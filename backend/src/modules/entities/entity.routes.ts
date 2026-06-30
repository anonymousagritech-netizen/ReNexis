import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { authenticate } from '@/middleware/authenticate';
import { requireRole } from '@/middleware/requireRole';
import { validateBody } from '@/middleware/validate';
import { writeAudit } from '@/middleware/audit';

const router = Router();
router.use(authenticate);

const entitySchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  country: z.string().min(1),
  baseCurrency: z.string().default('USD'),
  gaapStandard: z.enum(['IFRS17', 'US_GAAP', 'LOCAL_GAAP']).default('IFRS17'),
});

router.get('/', async (_req: Request, res: Response) => {
  const entities = await prisma.entity.findMany({ orderBy: { name: 'asc' } });
  res.json({ entities });
});

router.get('/:id', async (req: Request, res: Response) => {
  const entity = await prisma.entity.findUniqueOrThrow({ where: { id: req.params.id } });
  res.json({ entity });
});

router.post('/', requireRole('ADMIN'), validateBody(entitySchema), async (req: Request, res: Response) => {
  const entity = await prisma.entity.create({ data: req.body });
  await writeAudit({ req, action: 'CREATE', entityName: 'Entity', recordId: entity.id, afterData: entity });
  res.status(201).json({ entity });
});

router.put('/:id', requireRole('ADMIN'), validateBody(entitySchema.partial()), async (req: Request, res: Response) => {
  const before = await prisma.entity.findUniqueOrThrow({ where: { id: req.params.id } });
  const entity = await prisma.entity.update({ where: { id: req.params.id }, data: req.body });
  await writeAudit({ req, action: 'UPDATE', entityName: 'Entity', recordId: entity.id, beforeData: before, afterData: entity });
  res.json({ entity });
});

export default router;
