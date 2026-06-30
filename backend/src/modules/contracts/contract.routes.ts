import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticate } from '@/middleware/authenticate';
import { requireRole } from '@/middleware/requireRole';
import { validateBody, validateQuery } from '@/middleware/validate';
import { writeAudit } from '@/middleware/audit';
import { createContractSchema, updateContractSchema, endorseContractSchema } from './contract.schema';
import {
  createContract,
  getContract,
  listContracts,
  updateContractStatus,
  createEndorsement,
  renewContract,
} from './contract.service';
import prisma from '@/lib/prisma';

const router = Router();
router.use(authenticate);

const listQuerySchema = z.object({
  direction: z.enum(['INWARD', 'OUTWARD']).optional(),
  status: z.string().optional(),
  kind: z.enum(['TREATY', 'FACULTATIVE']).optional(),
  entityId: z.string().uuid().optional(),
  search: z.string().optional(),
  page: z.coerce.number().default(1),
  pageSize: z.coerce.number().default(25),
});

router.get('/', validateQuery(listQuerySchema), async (req: Request, res: Response) => {
  const { page, pageSize, ...filters } = req.query as any;
  const result = await listContracts({ ...filters, page, pageSize });
  res.json({ ...result, page, pageSize });
});

router.get('/:id', async (req: Request, res: Response) => {
  const contract = await getContract(req.params.id);
  res.json({ contract });
});

router.post(
  '/',
  requireRole('ADMIN', 'UNDERWRITER'),
  validateBody(createContractSchema),
  async (req: Request, res: Response) => {
    const contract = await createContract(req.body, req.user!.userId);
    await writeAudit({ req, action: 'CREATE', entityName: 'Contract', recordId: contract.id, afterData: contract });
    res.status(201).json({ contract });
  }
);

router.put(
  '/:id',
  requireRole('ADMIN', 'UNDERWRITER'),
  validateBody(updateContractSchema),
  async (req: Request, res: Response) => {
    const before = await prisma.contract.findUniqueOrThrow({ where: { id: req.params.id } });
    const contract = await prisma.contract.update({ where: { id: req.params.id }, data: req.body });
    await writeAudit({ req, action: 'UPDATE', entityName: 'Contract', recordId: contract.id, beforeData: before, afterData: contract });
    res.json({ contract });
  }
);

router.patch(
  '/:id/status',
  requireRole('ADMIN', 'UNDERWRITER'),
  validateBody(
    z.object({
      status: z.enum(['DESIGN', 'QUOTED', 'BOUND', 'IN_FORCE', 'RENEWAL_DUE', 'ENDORSED', 'RUN_OFF', 'CLOSED', 'CANCELLED']),
      notes: z.string().optional(),
    })
  ),
  async (req: Request, res: Response) => {
    const before = await prisma.contract.findUniqueOrThrow({ where: { id: req.params.id } });
    const contract = await updateContractStatus(req.params.id, req.body.status, req.body.notes);
    await writeAudit({ req, action: 'UPDATE', entityName: 'Contract.Status', recordId: contract.id, beforeData: before, afterData: contract });
    res.json({ contract });
  }
);

router.post(
  '/:id/endorsements',
  requireRole('ADMIN', 'UNDERWRITER'),
  validateBody(endorseContractSchema),
  async (req: Request, res: Response) => {
    const endorsement = await createEndorsement(req.params.id, req.body);
    await writeAudit({ req, action: 'CREATE', entityName: 'Endorsement', recordId: endorsement.id, afterData: endorsement });
    res.status(201).json({ endorsement });
  }
);

router.post(
  '/:id/renew',
  requireRole('ADMIN', 'UNDERWRITER'),
  validateBody(createContractSchema.partial().extend({ expiryDate: z.coerce.date() })),
  async (req: Request, res: Response) => {
    const renewed = await renewContract(req.params.id, req.body, req.user!.userId);
    await writeAudit({ req, action: 'CREATE', entityName: 'Contract.Renewal', recordId: renewed.id, afterData: renewed });
    res.status(201).json({ contract: renewed });
  }
);

router.get('/:id/lifecycle', async (req: Request, res: Response) => {
  const events = await prisma.lifecycleEvent.findMany({
    where: { contractId: req.params.id },
    orderBy: { createdAt: 'asc' },
  });
  res.json({ events });
});

export default router;
