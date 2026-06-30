import prisma from '@/lib/prisma';
import { AppError, NotFoundError } from '@/utils/errors';
import { CreateContractInput } from './contract.schema';

export async function createContract(input: CreateContractInput, createdById: string) {
  const existing = await prisma.contract.findUnique({ where: { contractNumber: input.contractNumber } });
  if (existing) throw new AppError('Contract number already exists', 409);

  const { parties, ...contractData } = input;

  const contract = await prisma.contract.create({
    data: {
      ...contractData,
      createdById,
      status: 'DESIGN',
      parties: {
        create: parties.map((p) => ({ partyId: p.partyId, role: p.role, sharePct: p.sharePct })),
      },
      lifecycleEvents: {
        create: [{ stage: 'DESIGN', notes: 'Contract created' }],
      },
    },
    include: { parties: { include: { party: true } } },
  });

  return contract;
}

export async function getContract(id: string) {
  const contract = await prisma.contract.findUnique({
    where: { id },
    include: {
      parties: { include: { party: true } },
      underwriter: true,
      entity: true,
      risks: true,
      _count: { select: { claims: true, premiums: true } },
    },
  });
  if (!contract) throw new NotFoundError('Contract not found');
  return contract;
}

export async function listContracts(filters: {
  direction?: string;
  status?: string;
  kind?: string;
  entityId?: string;
  search?: string;
  page: number;
  pageSize: number;
}) {
  const where: any = {};
  if (filters.direction) where.direction = filters.direction;
  if (filters.status) where.status = filters.status;
  if (filters.kind) where.kind = filters.kind;
  if (filters.entityId) where.entityId = filters.entityId;
  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: 'insensitive' } },
      { contractNumber: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  const [contracts, total] = await Promise.all([
    prisma.contract.findMany({
      where,
      include: { parties: { include: { party: true } }, underwriter: true },
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.contract.count({ where }),
  ]);

  return { contracts, total };
}

export async function updateContractStatus(id: string, status: string, notes?: string) {
  const contract = await prisma.contract.update({
    where: { id },
    data: {
      status: status as any,
      lifecycleEvents: { create: [{ stage: status as any, notes }] },
    },
  });
  return contract;
}

export async function createEndorsement(
  contractId: string,
  data: { description: string; effectiveDate: Date; changes: Record<string, any> }
) {
  const contract = await prisma.contract.findUnique({ where: { id: contractId } });
  if (!contract) throw new NotFoundError('Contract not found');

  const count = await prisma.endorsement.count({ where: { contractId } });

  const [endorsement] = await prisma.$transaction([
    prisma.endorsement.create({
      data: {
        contractId,
        endorsementNo: count + 1,
        description: data.description,
        effectiveDate: data.effectiveDate,
        changes: data.changes,
      },
    }),
    prisma.contract.update({
      where: { id: contractId },
      data: {
        ...data.changes,
        status: 'ENDORSED',
        lifecycleEvents: { create: [{ stage: 'ENDORSED', notes: data.description }] },
      },
    }),
  ]);

  return endorsement;
}

/**
 * Renew a contract: creates a new Contract record linked via parentContractId,
 * carrying forward structural terms, and marks the prior contract closed/run-off.
 */
export async function renewContract(contractId: string, overrides: Partial<CreateContractInput>, createdById: string) {
  const prior = await prisma.contract.findUnique({ where: { id: contractId }, include: { parties: true } });
  if (!prior) throw new NotFoundError('Contract not found');

  const newContractNumber = overrides.contractNumber || `${prior.contractNumber}-R${new Date().getFullYear()}`;

  const renewed = await prisma.contract.create({
    data: {
      contractNumber: newContractNumber,
      name: overrides.name || prior.name,
      direction: prior.direction,
      kind: prior.kind,
      treatyType: prior.treatyType,
      isRetrocession: prior.isRetrocession,
      entityId: prior.entityId,
      inceptionDate: overrides.inceptionDate || prior.expiryDate,
      expiryDate: overrides.expiryDate!,
      currency: prior.currency,
      retention: overrides.retention ?? prior.retention ?? undefined,
      limit: overrides.limit ?? prior.limit ?? undefined,
      reinstatements: prior.reinstatements,
      brokeragePct: prior.brokeragePct ?? undefined,
      commissionType: prior.commissionType ?? undefined,
      commissionFlatPct: prior.commissionFlatPct ?? undefined,
      profitCommissionPct: prior.profitCommissionPct ?? undefined,
      totalCapacity: overrides.totalCapacity ?? prior.totalCapacity ?? undefined,
      underwriterId: prior.underwriterId ?? undefined,
      createdById,
      parentContractId: prior.id,
      status: 'QUOTED',
      parties: {
        create: prior.parties.map((p) => ({ partyId: p.partyId, role: p.role, sharePct: p.sharePct ?? undefined })),
      },
      lifecycleEvents: { create: [{ stage: 'QUOTED', notes: `Renewed from ${prior.contractNumber}` }] },
    },
  });

  await prisma.contract.update({
    where: { id: prior.id },
    data: { status: 'RENEWAL_DUE' },
  });

  return renewed;
}
