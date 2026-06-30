import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

export async function seedDemoData(prisma: PrismaClient): Promise<{ alreadySeeded: boolean; demoAccounts: { role: string; email: string }[] }> {
  const passwordHash = await bcrypt.hash('Demo@12345', 12);

  // --- Entity ---
  const entity = await prisma.entity.upsert({
    where: { code: 'RENX-HQ' },
    update: {},
    create: { name: 'ReNexis Re (Demo) Ltd', code: 'RENX-HQ', country: 'Singapore', baseCurrency: 'USD', gaapStandard: 'IFRS17' },
  });

  // --- Users (one per role for demo walkthrough) ---
  const roles: { role: any; email: string; first: string; last: string }[] = [
    { role: 'ADMIN', email: 'admin@renexis.demo', first: 'Avery', last: 'Admin' },
    { role: 'UNDERWRITER', email: 'underwriter@renexis.demo', first: 'Uma', last: 'Underwriter' },
    { role: 'CLAIMS', email: 'claims@renexis.demo', first: 'Carl', last: 'Claims' },
    { role: 'ACCOUNTS', email: 'accounts@renexis.demo', first: 'Anya', last: 'Accounts' },
    { role: 'ACTUARY', email: 'actuary@renexis.demo', first: 'Ravi', last: 'Actuary' },
    { role: 'AUDITOR', email: 'auditor@renexis.demo', first: 'Olu', last: 'Auditor' },
    { role: 'COMPLIANCE', email: 'compliance@renexis.demo', first: 'Mia', last: 'Compliance' },
    { role: 'INVESTMENT_MANAGER', email: 'investments@renexis.demo', first: 'Ken', last: 'Invest' },
  ];

  const users: Record<string, any> = {};
  for (const r of roles) {
    users[r.role] = await prisma.user.upsert({
      where: { email: r.email },
      update: {},
      create: { email: r.email, passwordHash, firstName: r.first, lastName: r.last, role: r.role, entityId: entity.id, delegationLimit: 5000000 },
    });
  }

  const demoAccounts = roles.map((r) => ({ role: r.role, email: r.email }));

  // Idempotency guard: if the demo treaty already exists, the rest of the business
  // data has already been seeded — skip re-creating it (these aren't upserts, and
  // re-running would hit unique constraint errors on contractNumber/claimNumber).
  const existing = await prisma.contract.findUnique({ where: { contractNumber: 'TRTY-2026-001' } });
  if (existing) {
    return { alreadySeeded: true, demoAccounts };
  }

  // --- Parties ---
  const cedent = await prisma.party.create({ data: { name: 'Pacific Shield Insurance Co.', type: 'CEDENT', country: 'Philippines', currency: 'USD', kycStatus: 'VERIFIED', creditRating: 'A-', registrationNo: 'PH-INS-00123' } });
  const broker = await prisma.party.create({ data: { name: 'Anderson & Walsh Re Brokers', type: 'BROKER', country: 'United Kingdom', currency: 'GBP', kycStatus: 'VERIFIED', creditRating: 'A' } });
  const reinsurer = await prisma.party.create({ data: { name: 'Meridian Global Re', type: 'REINSURER', country: 'Bermuda', currency: 'USD', kycStatus: 'VERIFIED', creditRating: 'AA-' } });
  const retro = await prisma.party.create({ data: { name: 'Alpine Retrocession Group', type: 'RETROCESSIONAIRE', country: 'Switzerland', currency: 'CHF', kycStatus: 'PENDING', amlRiskRating: 'MEDIUM' } });

  // --- Contracts ---
  const xolTreaty = await prisma.contract.create({
    data: {
      contractNumber: 'TRTY-2026-001',
      name: 'Pacific Shield Property Cat XL 2026',
      direction: 'INWARD',
      kind: 'TREATY',
      treatyType: 'CATASTROPHE_XL',
      entityId: entity.id,
      inceptionDate: new Date('2026-01-01'),
      expiryDate: new Date('2026-12-31'),
      currency: 'USD',
      retention: 5_000_000,
      limit: 20_000_000,
      reinstatements: 1,
      reinstatementPremiumPct: 100,
      brokeragePct: 10,
      commissionType: 'FLAT',
      commissionFlatPct: 5,
      profitCommissionPct: 15,
      totalCapacity: 20_000_000,
      status: 'IN_FORCE',
      underwriterId: users.UNDERWRITER.id,
      createdById: users.ADMIN.id,
      parties: { create: [{ partyId: cedent.id, role: 'CEDENT' }, { partyId: broker.id, role: 'BROKER' }, { partyId: reinsurer.id, role: 'REINSURER' }] },
      lifecycleEvents: { create: [{ stage: 'IN_FORCE', notes: 'Bound at inception' }] },
    },
  });

  const qsTreaty = await prisma.contract.create({
    data: {
      contractNumber: 'TRTY-2026-002',
      name: 'Pacific Shield Motor Quota Share 2026',
      direction: 'INWARD',
      kind: 'TREATY',
      treatyType: 'QUOTA_SHARE',
      entityId: entity.id,
      inceptionDate: new Date('2026-01-01'),
      expiryDate: new Date('2026-12-31'),
      currency: 'USD',
      retention: 30, // cedent retains 30%
      brokeragePct: 7.5,
      commissionType: 'SLIDING_SCALE',
      commissionScale: [
        { lossRatioFrom: 0, lossRatioTo: 40, commissionPct: 35 },
        { lossRatioFrom: 40, lossRatioTo: 60, commissionPct: 25 },
        { lossRatioFrom: 60, lossRatioTo: 200, commissionPct: 15 },
      ],
      totalCapacity: 50_000_000,
      status: 'IN_FORCE',
      underwriterId: users.UNDERWRITER.id,
      createdById: users.ADMIN.id,
      parties: { create: [{ partyId: cedent.id, role: 'CEDENT' }, { partyId: broker.id, role: 'BROKER' }] },
      lifecycleEvents: { create: [{ stage: 'IN_FORCE' }] },
    },
  });

  const retroContract = await prisma.contract.create({
    data: {
      contractNumber: 'RETRO-2026-001',
      name: 'Outward Retro Cat Protection 2026',
      direction: 'OUTWARD',
      kind: 'TREATY',
      treatyType: 'EXCESS_OF_LOSS',
      isRetrocession: true,
      entityId: entity.id,
      inceptionDate: new Date('2026-01-01'),
      expiryDate: new Date('2026-12-31'),
      currency: 'USD',
      retention: 10_000_000,
      limit: 15_000_000,
      status: 'IN_FORCE',
      underwriterId: users.UNDERWRITER.id,
      createdById: users.ADMIN.id,
      parties: { create: [{ partyId: retro.id, role: 'RETROCESSIONAIRE' }] },
      lifecycleEvents: { create: [{ stage: 'IN_FORCE' }] },
    },
  });

  // --- Catastrophe Event ---
  const catEvent = await prisma.catastropheEvent.create({
    data: { name: 'Typhoon Marigold', peril: 'WINDSTORM', eventDate: new Date('2026-04-15'), zone: 'PH-LUZON', description: 'Category 4 typhoon landfall, Luzon' },
  });

  // --- Risks ---
  const risk1 = await prisma.risk.create({
    data: { contractId: xolTreaty.id, riskRef: 'PSI-PROP-00457', sumInsured: 8_000_000, premiumAmount: 120_000, currency: 'USD', catZone: 'PH-LUZON', peril: 'WINDSTORM', latitude: 14.5995, longitude: 120.9842, allocatedAmount: 8_000_000, inceptionDate: new Date('2026-01-01'), expiryDate: new Date('2026-12-31') },
  });

  await prisma.contract.update({ where: { id: xolTreaty.id }, data: { capacityUsed: 8_000_000 } });

  // --- Premiums ---
  await prisma.premiumTransaction.createMany({
    data: [
      { contractId: xolTreaty.id, transactionDate: new Date('2026-01-05'), grossPremium: 1_800_000, brokerage: 180_000, commission: 90_000, netPremium: 1_530_000, currency: 'USD', status: 'EARNED', earnedToDate: 1_800_000 },
      { contractId: qsTreaty.id, transactionDate: new Date('2026-01-10'), grossPremium: 4_200_000, brokerage: 315_000, commission: 1_050_000, netPremium: 2_835_000, currency: 'USD', status: 'EARNED', earnedToDate: 4_200_000 },
    ],
  });

  // --- Claims (linked to cat event) ---
  const claim1 = await prisma.claim.create({
    data: {
      claimNumber: 'CLM-2026-A1B2C3D4',
      contractId: xolTreaty.id,
      riskId: risk1.id,
      cedentId: cedent.id,
      catastropheEventId: catEvent.id,
      dateOfLoss: new Date('2026-04-15'),
      status: 'RBNS',
      currency: 'USD',
      grossIncurred: 9_500_000,
      reserveAmount: 9_500_000,
      recoveryAmount: 4_500_000, // (retention 5M, limit 20M) -> recovery = min(9.5M,25M)-5M = 4.5M
      handlerId: users.CLAIMS.id,
      description: 'Typhoon Marigold - commercial property total loss, Manila warehouse complex',
    },
  });

  await prisma.claimMovement.create({ data: { claimId: claim1.id, type: 'RESERVE_SET', amount: 9_500_000, notes: 'Initial reserve per cedent bordereaux' } });

  // --- Investments ---
  await prisma.investment.createMany({
    data: [
      { assetName: 'US Treasury Bond 10Y', assetClass: 'BOND', identifier: 'US912828ZZ', currency: 'USD', quantity: 1000, costBasis: 980_000, marketValue: 1_010_000, acquisitionDate: new Date('2024-06-01'), maturityDate: new Date('2034-06-01'), yieldRate: 4.2, regulatoryLimitPct: 60, durationYears: 7.8 },
      { assetName: 'Global Equity Index Fund', assetClass: 'EQUITY', identifier: 'GLEQ-IDX', currency: 'USD', quantity: 5000, costBasis: 450_000, marketValue: 512_000, acquisitionDate: new Date('2023-03-15'), yieldRate: 1.8, regulatoryLimitPct: 25, durationYears: 0 },
      { assetName: 'Singapore Grade-A Office REIT', assetClass: 'REAL_ESTATE', currency: 'USD', quantity: 1, costBasis: 2_000_000, marketValue: 2_150_000, acquisitionDate: new Date('2022-01-10'), yieldRate: 5.1, regulatoryLimitPct: 15, durationYears: 12 },
    ],
  });

  // --- GL Accounts (minimal chart of accounts) ---
  await Promise.all([
    prisma.gLAccount.create({ data: { entityId: entity.id, code: '1000', name: 'Cash and Bank', type: 'ASSET' } }),
    prisma.gLAccount.create({ data: { entityId: entity.id, code: '4000', name: 'Premium Income', type: 'INCOME' } }),
    prisma.gLAccount.create({ data: { entityId: entity.id, code: '5000', name: 'Claims Expense', type: 'EXPENSE' } }),
    prisma.gLAccount.create({ data: { entityId: entity.id, code: '2000', name: 'Claims Reserves Payable', type: 'LIABILITY' } }),
  ]);

  return { alreadySeeded: false, demoAccounts };
}
