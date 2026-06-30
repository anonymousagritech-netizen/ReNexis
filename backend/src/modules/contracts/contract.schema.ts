import { z } from 'zod';

export const contractPartyInput = z.object({
  partyId: z.string().uuid(),
  role: z.enum(['CEDENT', 'BROKER', 'REINSURER', 'RETROCESSIONAIRE']),
  sharePct: z.number().min(0).max(100).optional(),
});

export const createContractSchema = z.object({
  contractNumber: z.string().min(1),
  name: z.string().min(1),
  direction: z.enum(['INWARD', 'OUTWARD']),
  kind: z.enum(['TREATY', 'FACULTATIVE']),
  treatyType: z.enum([
    'QUOTA_SHARE',
    'SURPLUS_SHARE',
    'EXCESS_OF_LOSS',
    'CATASTROPHE_XL',
    'STOP_LOSS',
    'FACULTATIVE_PROPORTIONAL',
    'FACULTATIVE_NON_PROPORTIONAL',
  ]),
  isRetrocession: z.boolean().default(false),
  entityId: z.string().uuid(),
  inceptionDate: z.coerce.date(),
  expiryDate: z.coerce.date(),
  currency: z.string().default('USD'),
  retention: z.number().nonnegative().optional(),
  limit: z.number().nonnegative().optional(),
  reinstatements: z.number().int().nonnegative().default(0),
  reinstatementPremiumPct: z.number().min(0).max(100).optional(),
  brokeragePct: z.number().min(0).max(100).optional(),
  commissionType: z.enum(['FLAT', 'SLIDING_SCALE']).optional(),
  commissionFlatPct: z.number().min(0).max(100).optional(),
  commissionScale: z
    .array(z.object({ lossRatioFrom: z.number(), lossRatioTo: z.number(), commissionPct: z.number() }))
    .optional(),
  profitCommissionPct: z.number().min(0).max(100).optional(),
  totalCapacity: z.number().nonnegative().optional(),
  underwriterId: z.string().uuid().optional(),
  parties: z.array(contractPartyInput).min(1),
});

export const updateContractSchema = createContractSchema.partial().omit({ parties: true });

export const endorseContractSchema = z.object({
  description: z.string().min(1),
  effectiveDate: z.coerce.date(),
  changes: z.record(z.any()),
});

export type CreateContractInput = z.infer<typeof createContractSchema>;
