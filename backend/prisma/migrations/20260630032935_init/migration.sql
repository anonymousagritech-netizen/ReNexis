-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'UNDERWRITER', 'CLAIMS', 'ACCOUNTS', 'ACTUARY', 'AUDITOR', 'COMPLIANCE', 'INVESTMENT_MANAGER', 'VIEWER');

-- CreateEnum
CREATE TYPE "PartyType" AS ENUM ('CEDENT', 'BROKER', 'REINSURER', 'RETROCESSIONAIRE');

-- CreateEnum
CREATE TYPE "ContractDirection" AS ENUM ('INWARD', 'OUTWARD');

-- CreateEnum
CREATE TYPE "ContractKind" AS ENUM ('TREATY', 'FACULTATIVE');

-- CreateEnum
CREATE TYPE "TreatyType" AS ENUM ('QUOTA_SHARE', 'SURPLUS_SHARE', 'EXCESS_OF_LOSS', 'CATASTROPHE_XL', 'STOP_LOSS', 'FACULTATIVE_PROPORTIONAL', 'FACULTATIVE_NON_PROPORTIONAL');

-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('DESIGN', 'QUOTED', 'BOUND', 'IN_FORCE', 'RENEWAL_DUE', 'ENDORSED', 'RUN_OFF', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PremiumStatus" AS ENUM ('WRITTEN', 'EARNED', 'UNEARNED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ClaimStatus" AS ENUM ('NOTIFIED', 'RBNS', 'IBNR', 'RESERVED', 'PARTIALLY_PAID', 'SETTLED', 'CLOSED', 'REOPENED', 'REJECTED');

-- CreateEnum
CREATE TYPE "AssetClass" AS ENUM ('BOND', 'EQUITY', 'REAL_ESTATE', 'CASH_EQUIVALENT', 'ALTERNATIVE', 'LOAN');

-- CreateEnum
CREATE TYPE "GLAccountType" AS ENUM ('ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'VIEWER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "mfaSecret" TEXT,
    "delegationLimit" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "entityId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastLoginAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entities" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "baseCurrency" TEXT NOT NULL DEFAULT 'USD',
    "gaapStandard" TEXT NOT NULL DEFAULT 'IFRS17',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "entities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entityName" TEXT NOT NULL,
    "recordId" TEXT,
    "beforeData" JSONB,
    "afterData" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "contractId" TEXT,
    "claimId" TEXT,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approvals" (
    "id" TEXT NOT NULL,
    "subjectType" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "requestedAmount" DECIMAL(18,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "approverId" TEXT,
    "comments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),

    CONSTRAINT "approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "link" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parties" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "PartyType" NOT NULL,
    "country" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "kycStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "amlRiskRating" TEXT NOT NULL DEFAULT 'LOW',
    "ratingAgency" TEXT,
    "creditRating" TEXT,
    "registrationNo" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "address" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "parties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contracts" (
    "id" TEXT NOT NULL,
    "contractNumber" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "direction" "ContractDirection" NOT NULL,
    "kind" "ContractKind" NOT NULL,
    "treatyType" "TreatyType" NOT NULL,
    "isRetrocession" BOOLEAN NOT NULL DEFAULT false,
    "entityId" TEXT NOT NULL,
    "inceptionDate" TIMESTAMP(3) NOT NULL,
    "expiryDate" TIMESTAMP(3) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "retention" DECIMAL(18,2),
    "limit" DECIMAL(18,2),
    "reinstatements" INTEGER NOT NULL DEFAULT 0,
    "reinstatementPremiumPct" DECIMAL(7,4),
    "brokeragePct" DECIMAL(7,4),
    "commissionType" TEXT,
    "commissionFlatPct" DECIMAL(7,4),
    "commissionScale" JSONB,
    "profitCommissionPct" DECIMAL(7,4),
    "totalCapacity" DECIMAL(18,2),
    "capacityUsed" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "status" "ContractStatus" NOT NULL DEFAULT 'DESIGN',
    "parentContractId" TEXT,
    "underwriterId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_parties" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "partyId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "sharePct" DECIMAL(7,4),

    CONSTRAINT "contract_parties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "endorsements" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "endorsementNo" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "changes" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "endorsements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lifecycle_events" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "stage" "ContractStatus" NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lifecycle_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "risks" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "riskRef" TEXT NOT NULL,
    "description" TEXT,
    "sumInsured" DECIMAL(18,2) NOT NULL,
    "premiumAmount" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "catZone" TEXT,
    "peril" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "allocatedAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "exceedsAutoCapacity" BOOLEAN NOT NULL DEFAULT false,
    "specialAcceptanceStatus" TEXT,
    "inceptionDate" TIMESTAMP(3) NOT NULL,
    "expiryDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "risks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catastrophe_events" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "peril" TEXT NOT NULL,
    "eventDate" TIMESTAMP(3) NOT NULL,
    "zone" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "catastrophe_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "premium_transactions" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "riskId" TEXT,
    "transactionDate" TIMESTAMP(3) NOT NULL,
    "grossPremium" DECIMAL(18,2) NOT NULL,
    "brokerage" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "commission" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "netPremium" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" "PremiumStatus" NOT NULL DEFAULT 'WRITTEN',
    "earnedToDate" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "bordereauxBatchId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "premium_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "claims" (
    "id" TEXT NOT NULL,
    "claimNumber" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "riskId" TEXT,
    "cedentId" TEXT,
    "catastropheEventId" TEXT,
    "dateOfLoss" TIMESTAMP(3) NOT NULL,
    "dateNotified" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "ClaimStatus" NOT NULL DEFAULT 'NOTIFIED',
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "grossIncurred" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "reserveAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "paidAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "recoveryAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "cashCallAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "cashCallStatus" TEXT,
    "description" TEXT,
    "handlerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "claims_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "claim_movements" (
    "id" TEXT NOT NULL,
    "claimId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "claim_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bordereaux_batches" (
    "id" TEXT NOT NULL,
    "contractId" TEXT,
    "type" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PROCESSING',
    "totalRecords" INTEGER NOT NULL DEFAULT 0,
    "errorLog" JSONB,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bordereaux_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "statements_of_account" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "premiumIn" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "premiumOut" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "claimsIn" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "claimsOut" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "commission" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "brokerage" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "profitCommission" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "balance" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "issuedAt" TIMESTAMP(3),
    "pdfStorageKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "statements_of_account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "current_account_entries" (
    "id" TEXT NOT NULL,
    "partyId" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "description" TEXT NOT NULL,
    "debit" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "credit" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "transactionDate" TIMESTAMP(3) NOT NULL,
    "reference" TEXT,
    "reconciled" BOOLEAN NOT NULL DEFAULT false,
    "bankStatementRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "current_account_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fx_rates" (
    "id" TEXT NOT NULL,
    "baseCurrency" TEXT NOT NULL,
    "quoteCurrency" TEXT NOT NULL,
    "rate" DECIMAL(18,8) NOT NULL,
    "rateDate" TIMESTAMP(3) NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'MANUAL',

    CONSTRAINT "fx_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "investments" (
    "id" TEXT NOT NULL,
    "assetName" TEXT NOT NULL,
    "assetClass" "AssetClass" NOT NULL,
    "identifier" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "quantity" DECIMAL(18,4) NOT NULL,
    "costBasis" DECIMAL(18,2) NOT NULL,
    "marketValue" DECIMAL(18,2) NOT NULL,
    "maturityDate" TIMESTAMP(3),
    "acquisitionDate" TIMESTAMP(3) NOT NULL,
    "yieldRate" DECIMAL(7,4),
    "regulatoryLimitPct" DECIMAL(7,4),
    "durationYears" DECIMAL(7,2),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "investments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "investment_income" (
    "id" TEXT NOT NULL,
    "investmentId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "recognizedDate" TIMESTAMP(3) NOT NULL,
    "postedToGL" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "investment_income_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "investment_valuations" (
    "id" TEXT NOT NULL,
    "investmentId" TEXT NOT NULL,
    "valuationDate" TIMESTAMP(3) NOT NULL,
    "marketValue" DECIMAL(18,2) NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "investment_valuations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gl_accounts" (
    "id" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "GLAccountType" NOT NULL,
    "parentId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "gl_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ledger_entries" (
    "id" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "glAccountId" TEXT NOT NULL,
    "journalRef" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "debit" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "credit" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "postingDate" TIMESTAMP(3) NOT NULL,
    "source" TEXT NOT NULL,
    "contractId" TEXT,
    "claimId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fixed_assets" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "acquisitionDate" TIMESTAMP(3) NOT NULL,
    "cost" DECIMAL(18,2) NOT NULL,
    "usefulLifeYears" INTEGER NOT NULL,
    "depreciationMethod" TEXT NOT NULL DEFAULT 'STRAIGHT_LINE',
    "accumulatedDepreciation" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "currentValue" DECIMAL(18,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fixed_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compliance_checks" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "subjectType" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "details" JSONB,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checkedById" TEXT,

    CONSTRAINT "compliance_checks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "regulatory_reports" (
    "id" TEXT NOT NULL,
    "reportType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "storageKey" TEXT,
    "generatedAt" TIMESTAMP(3),
    "filedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "regulatory_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "csm_records" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "openingCSM" DECIMAL(18,2) NOT NULL,
    "newBusinessCSM" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "interestAccretion" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "changesInEstimate" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "csmRelease" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "closingCSM" DECIMAL(18,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "csm_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE UNIQUE INDEX "entities_code_key" ON "entities"("code");

-- CreateIndex
CREATE INDEX "audit_logs_entityName_recordId_idx" ON "audit_logs"("entityName", "recordId");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "parties_type_idx" ON "parties"("type");

-- CreateIndex
CREATE UNIQUE INDEX "contracts_contractNumber_key" ON "contracts"("contractNumber");

-- CreateIndex
CREATE INDEX "contracts_status_idx" ON "contracts"("status");

-- CreateIndex
CREATE INDEX "contracts_direction_idx" ON "contracts"("direction");

-- CreateIndex
CREATE INDEX "contracts_expiryDate_idx" ON "contracts"("expiryDate");

-- CreateIndex
CREATE UNIQUE INDEX "contract_parties_contractId_partyId_role_key" ON "contract_parties"("contractId", "partyId", "role");

-- CreateIndex
CREATE INDEX "risks_contractId_idx" ON "risks"("contractId");

-- CreateIndex
CREATE INDEX "risks_catZone_idx" ON "risks"("catZone");

-- CreateIndex
CREATE INDEX "premium_transactions_contractId_idx" ON "premium_transactions"("contractId");

-- CreateIndex
CREATE UNIQUE INDEX "claims_claimNumber_key" ON "claims"("claimNumber");

-- CreateIndex
CREATE INDEX "claims_status_idx" ON "claims"("status");

-- CreateIndex
CREATE INDEX "claims_contractId_idx" ON "claims"("contractId");

-- CreateIndex
CREATE INDEX "current_account_entries_partyId_idx" ON "current_account_entries"("partyId");

-- CreateIndex
CREATE UNIQUE INDEX "fx_rates_baseCurrency_quoteCurrency_rateDate_key" ON "fx_rates"("baseCurrency", "quoteCurrency", "rateDate");

-- CreateIndex
CREATE INDEX "investments_assetClass_idx" ON "investments"("assetClass");

-- CreateIndex
CREATE UNIQUE INDEX "gl_accounts_entityId_code_key" ON "gl_accounts"("entityId", "code");

-- CreateIndex
CREATE INDEX "ledger_entries_journalRef_idx" ON "ledger_entries"("journalRef");

-- CreateIndex
CREATE INDEX "ledger_entries_glAccountId_idx" ON "ledger_entries"("glAccountId");

-- CreateIndex
CREATE INDEX "ledger_entries_postingDate_idx" ON "ledger_entries"("postingDate");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "entities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "claims"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "entities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_parentContractId_fkey" FOREIGN KEY ("parentContractId") REFERENCES "contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_underwriterId_fkey" FOREIGN KEY ("underwriterId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_parties" ADD CONSTRAINT "contract_parties_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_parties" ADD CONSTRAINT "contract_parties_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "parties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "endorsements" ADD CONSTRAINT "endorsements_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lifecycle_events" ADD CONSTRAINT "lifecycle_events_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risks" ADD CONSTRAINT "risks_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "premium_transactions" ADD CONSTRAINT "premium_transactions_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "premium_transactions" ADD CONSTRAINT "premium_transactions_bordereauxBatchId_fkey" FOREIGN KEY ("bordereauxBatchId") REFERENCES "bordereaux_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claims" ADD CONSTRAINT "claims_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claims" ADD CONSTRAINT "claims_riskId_fkey" FOREIGN KEY ("riskId") REFERENCES "risks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claims" ADD CONSTRAINT "claims_cedentId_fkey" FOREIGN KEY ("cedentId") REFERENCES "parties"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claims" ADD CONSTRAINT "claims_catastropheEventId_fkey" FOREIGN KEY ("catastropheEventId") REFERENCES "catastrophe_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claims" ADD CONSTRAINT "claims_handlerId_fkey" FOREIGN KEY ("handlerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claim_movements" ADD CONSTRAINT "claim_movements_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "claims"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "statements_of_account" ADD CONSTRAINT "statements_of_account_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "current_account_entries" ADD CONSTRAINT "current_account_entries_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "parties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investment_income" ADD CONSTRAINT "investment_income_investmentId_fkey" FOREIGN KEY ("investmentId") REFERENCES "investments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investment_valuations" ADD CONSTRAINT "investment_valuations_investmentId_fkey" FOREIGN KEY ("investmentId") REFERENCES "investments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gl_accounts" ADD CONSTRAINT "gl_accounts_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "entities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gl_accounts" ADD CONSTRAINT "gl_accounts_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "gl_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "entities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_glAccountId_fkey" FOREIGN KEY ("glAccountId") REFERENCES "gl_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "claims"("id") ON DELETE SET NULL ON UPDATE CASCADE;
