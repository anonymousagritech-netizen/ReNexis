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

## Demo vs. production readiness

This is a fully functional demo/pilot system — every module's core workflow is real, tested against a live database, and not mocked. It is **not yet production-ready for handling real money or real regulatory filings** without the following hardening, in priority order:

1. **File storage** — documents currently save to local disk (`/uploads`). This works for local dev and demos but Render's filesystem is ephemeral and wipes on every redeploy. Swap `multer.diskStorage` in `document.routes.ts` for an S3 or Supabase Storage client before any real document needs to survive a deploy.
2. **MFA** — the `User` model has `mfaEnabled`/`mfaSecret` fields but no actual TOTP enrollment/verification flow is wired up. Login is currently password + JWT only.
3. **Actuarial calculations** — IBNR reserves are entered manually (no triangulation), and IFRS17 CSM / Solvency II figures are simplified data extracts, not certified actuarial output. Per the blueprint's own guidance, this is intentional — real CSM/IBNR math should come from an actuary or specialist service and land in these tables as the source of truth, not be computed by this app.
4. **Secrets & environment** — rotate `JWT_SECRET`/`REFRESH_TOKEN_SECRET` to long random values in production (the `.env.example` defaults are not safe to use as-is), and ensure `DATABASE_URL` uses Neon's pooled connection string with SSL.
5. **Email/SMS delivery** — notifications currently only live inside the app (bell icon). There's no email or SMS dispatch for renewal reminders or cash calls.
6. **Rate limiting & WAF** — basic rate limiting is in place (`express-rate-limit`), but a production deployment handling real counterparty data should sit behind a proper WAF/CDN (Cloudflare, etc.) and have stricter limits per endpoint.
7. **Backups & DR** — Neon handles point-in-time recovery, but no automated backup verification or disaster-recovery runbook exists yet.
8. **Compliance sign-off** — Schedule F and Solvency II exports are structurally correct data extracts but have not been reviewed by a compliance/actuarial professional against your specific jurisdiction's exact filing requirements.

None of these are large efforts individually, but they're the difference between "demo that proves the concept end-to-end" and "system you'd trust with a real cedent's claims data." Treat this as pilot/demo-ready now, production-ready after the above.
