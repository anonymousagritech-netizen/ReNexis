export type UserRole =
  | 'ADMIN'
  | 'UNDERWRITER'
  | 'CLAIMS'
  | 'ACCOUNTS'
  | 'ACTUARY'
  | 'AUDITOR'
  | 'COMPLIANCE'
  | 'INVESTMENT_MANAGER'
  | 'VIEWER';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  entityId: string | null;
  delegationLimit: string;
}

export interface Entity {
  id: string;
  name: string;
  code: string;
  country: string;
  baseCurrency: string;
  gaapStandard: string;
}

export type PartyType = 'CEDENT' | 'BROKER' | 'REINSURER' | 'RETROCESSIONAIRE';

export interface Party {
  id: string;
  name: string;
  type: PartyType;
  country: string;
  currency: string;
  kycStatus: string;
  amlRiskRating: string;
  creditRating?: string | null;
  ratingAgency?: string | null;
  registrationNo?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  address?: string | null;
  isActive: boolean;
  createdAt: string;
}

export type ContractDirection = 'INWARD' | 'OUTWARD';
export type ContractKind = 'TREATY' | 'FACULTATIVE';
export type TreatyType =
  | 'QUOTA_SHARE'
  | 'SURPLUS_SHARE'
  | 'EXCESS_OF_LOSS'
  | 'CATASTROPHE_XL'
  | 'STOP_LOSS'
  | 'FACULTATIVE_PROPORTIONAL'
  | 'FACULTATIVE_NON_PROPORTIONAL';
export type ContractStatus =
  | 'DESIGN'
  | 'QUOTED'
  | 'BOUND'
  | 'IN_FORCE'
  | 'RENEWAL_DUE'
  | 'ENDORSED'
  | 'RUN_OFF'
  | 'CLOSED'
  | 'CANCELLED';

export interface ContractParty {
  id: string;
  partyId: string;
  role: PartyType;
  sharePct?: string | null;
  party: Party;
}

export interface Contract {
  id: string;
  contractNumber: string;
  name: string;
  direction: ContractDirection;
  kind: ContractKind;
  treatyType: TreatyType;
  isRetrocession: boolean;
  entityId: string;
  inceptionDate: string;
  expiryDate: string;
  currency: string;
  retention?: string | null;
  limit?: string | null;
  reinstatements: number;
  brokeragePct?: string | null;
  commissionType?: string | null;
  commissionFlatPct?: string | null;
  profitCommissionPct?: string | null;
  totalCapacity?: string | null;
  capacityUsed: string;
  status: ContractStatus;
  underwriterId?: string | null;
  underwriter?: { firstName: string; lastName: string } | null;
  parties: ContractParty[];
  createdAt: string;
}

export type RiskAcceptanceStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | null;

export interface Risk {
  id: string;
  contractId: string;
  riskRef: string;
  description?: string | null;
  sumInsured: string;
  premiumAmount: string;
  currency: string;
  catZone?: string | null;
  peril?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  allocatedAmount: string;
  exceedsAutoCapacity: boolean;
  specialAcceptanceStatus: RiskAcceptanceStatus;
  inceptionDate: string;
  expiryDate: string;
}

export type ClaimStatus =
  | 'NOTIFIED'
  | 'RBNS'
  | 'IBNR'
  | 'RESERVED'
  | 'PARTIALLY_PAID'
  | 'SETTLED'
  | 'CLOSED'
  | 'REOPENED'
  | 'REJECTED';

export interface Claim {
  id: string;
  claimNumber: string;
  contractId: string;
  contract?: Contract;
  riskId?: string | null;
  cedentId?: string | null;
  cedent?: Party | null;
  dateOfLoss: string;
  dateNotified: string;
  status: ClaimStatus;
  currency: string;
  grossIncurred: string;
  reserveAmount: string;
  paidAmount: string;
  recoveryAmount: string;
  cashCallAmount: string;
  cashCallStatus?: string | null;
  description?: string | null;
  handler?: { firstName: string; lastName: string } | null;
}

export interface PremiumTransaction {
  id: string;
  contractId: string;
  contract?: Contract;
  transactionDate: string;
  grossPremium: string;
  brokerage: string;
  commission: string;
  netPremium: string;
  currency: string;
  status: string;
}

export interface StatementOfAccount {
  id: string;
  contractId: string;
  contract?: Contract;
  periodStart: string;
  periodEnd: string;
  currency: string;
  premiumIn: string;
  premiumOut: string;
  claimsIn: string;
  claimsOut: string;
  commission: string;
  brokerage: string;
  profitCommission: string;
  balance: string;
  status: string;
}

export interface CurrentAccountEntry {
  id: string;
  partyId: string;
  party?: Party;
  currency: string;
  description: string;
  debit: string;
  credit: string;
  transactionDate: string;
  reference?: string | null;
  reconciled: boolean;
}

export type AssetClass = 'BOND' | 'EQUITY' | 'REAL_ESTATE' | 'CASH_EQUIVALENT' | 'ALTERNATIVE' | 'LOAN';

export interface Investment {
  id: string;
  assetName: string;
  assetClass: AssetClass;
  identifier?: string | null;
  currency: string;
  quantity: string;
  costBasis: string;
  marketValue: string;
  maturityDate?: string | null;
  acquisitionDate: string;
  yieldRate?: string | null;
  regulatoryLimitPct?: string | null;
  durationYears?: string | null;
}

export interface GLAccount {
  id: string;
  entityId: string;
  code: string;
  name: string;
  type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE';
}

export interface ComplianceCheck {
  id: string;
  type: string;
  subjectType: string;
  subjectId: string;
  status: string;
  details?: Record<string, any> | null;
  checkedAt: string;
}

export interface AuditLog {
  id: string;
  action: string;
  entityName: string;
  recordId?: string | null;
  ipAddress?: string | null;
  createdAt: string;
  user?: { firstName: string; lastName: string; email: string; role: string } | null;
}

export interface DashboardOverview {
  totalContracts: number;
  inForceContracts: number;
  renewalsDueSoon: number;
  openClaims: number;
  totalReserves: string;
  pendingApprovals: number;
  totalInvestmentValue: string;
  pendingKyc: number;
}

export interface PaginatedResponse<T> {
  total: number;
  page: number;
  pageSize: number;
  [key: string]: any;
}
