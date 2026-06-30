# ReNexis Backend

Full reinsurance platform API covering all 8 demo modules:

1. System Architecture & Security — auth, RBAC, audit log, multi-entity
2. Reinsurance (complete) — treaty/fac contracts, underwriting/risk, claims, retrocession
3. Technical/Business Accounting — Statement of Account, current account, FX
4. Investment — portfolio, income, valuations, asset-liability matching
5. General Accounting — chart of accounts, double-entry ledger, fixed assets
6. Standard Regulatory Compliance — KYC/AML, Schedule F, IFRS17 CSM tracking
7. Complete Reporting — treaty performance, combined ratio, exposure heatmaps
8. Product Lifecycle — kanban-style contract stage workflow, renewal radar

## Stack

Node.js + Express + TypeScript, Prisma ORM, PostgreSQL (Neon), JWT auth.

## Local setup

```bash
cd backend
cp .env.example .env   # fill in DATABASE_URL from your Neon project
npm install
npm run prisma:migrate:dev
npm run seed            # loads demo data + one user per role
npm run dev              # starts on http://localhost:4000
```

Demo login (after seeding), password `Demo@12345` for all:

| Role | Email |
|---|---|
| ADMIN | admin@renexis.demo |
| UNDERWRITER | underwriter@renexis.demo |
| CLAIMS | claims@renexis.demo |
| ACCOUNTS | accounts@renexis.demo |
| ACTUARY | actuary@renexis.demo |
| AUDITOR | auditor@renexis.demo |
| COMPLIANCE | compliance@renexis.demo |
| INVESTMENT_MANAGER | investments@renexis.demo |

## Deploying

**Neon (database):** create a Postgres project, copy the pooled connection string into `DATABASE_URL`.

**Render (API):** this repo includes `render.yaml` at the root — create a new Blueprint deploy in Render pointing at this repo; it will build `backend/`, run migrations, and start the server. Set `DATABASE_URL` and `CORS_ORIGINS` (your Vercel frontend URL) in the Render dashboard env vars.

## API surface

All routes are mounted under `/api`. Auth: `Bearer <accessToken>` header, obtained from `POST /api/auth/login`.

- `/api/auth` — register, login, refresh, me
- `/api/entities`, `/api/parties` — multi-entity & counterparty management
- `/api/contracts` — treaty/fac CRUD, status transitions, endorsements, renewals
- `/api/risks` — underwriting capture, capacity allocation, cat accumulation, special acceptance
- `/api/claims` — RBNS/IBNR reserves, payments, recoveries, cash calls, cat exposure
- `/api/premiums` — premium bookings + bordereaux Excel/CSV ingestion
- `/api/accounting` — SOA generation, current account, reconciliation, FX rates
- `/api/investments` — portfolio, income, valuation, ALM duration gap
- `/api/gl` — chart of accounts, journal postings, trial balance, financial statements, fixed assets
- `/api/compliance` — KYC/AML checks, regulatory reports, Schedule F export, IFRS17 CSM
- `/api/reporting` — treaty performance, claims aging, combined ratio, top counterparties
- `/api/lifecycle` — kanban board, renewals due, run-off watch
- `/api/audit` — immutable audit trail viewer (Auditor/Compliance/Admin only)
- `/api/dashboard/overview` — single aggregated home-screen summary

Every mutating endpoint writes to `audit_logs` with actor, IP, and before/after state.
