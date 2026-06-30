# ReNexis

A full reinsurance company management platform covering the 8 demo modules:

1. System Architecture & Security
2. Reinsurance (complete) — Treaty/Facultative, Underwriting, Claims, Retrocession
3. Technical / Business Accounting
4. Investment
5. General Accounting
6. Standard Regulatory Compliance
7. Complete Reporting
8. Product Lifecycle

## Structure

```
backend/    Node.js + Express + TypeScript + Prisma + PostgreSQL (Neon) API
frontend/   React Native (Expo) app — coming next
render.yaml Render deployment blueprint for the backend
```

## Status

- [x] Backend: full data model, auth/RBAC, audit trail, all 8 modules' APIs, seed data, verified locally against Postgres
- [ ] Frontend: React Native app (in progress)
- [ ] Deployment: Neon + Render + Vercel wiring

See `backend/README.md` for API details, local setup, and deployment steps.
