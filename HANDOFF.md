# ReNexis — Project Handoff / Continuation Guide

Read this first if you're picking this project up in a new Claude conversation (e.g. after a usage limit reset, on a different account, or handing off to someone else). It tells Claude (or a human) everything needed to keep working on this without re-discovering the architecture from scratch.

## What this project is

ReNexis is a full reinsurance company operations platform covering 8 modules: System Architecture & Security, Reinsurance (treaty/facultative/claims/retrocession), Technical Accounting, Investment, General Accounting, Regulatory Compliance, Reporting, and Product Lifecycle. Built for a client product walkthrough/demo, with a clear path to production hardening documented in `backend/README.md`.

## Repo structure

```
backend/    Node.js + Express + TypeScript + Prisma + PostgreSQL API
frontend/   Expo (React Native + Web) app, deployed as a static SPA
render.yaml Render deployment blueprint for the backend
```

## Live deployment (as of this handoff)

- **Backend API**: `https://renexis.onrender.com/api` — deployed on Render (free tier), connected to a Neon Postgres database in `ap-southeast-1` (Singapore).
- **Frontend**: deployed on Vercel, project name `re-nexis`, root directory set to `frontend/`.
- **Database**: Neon Postgres. Connection string lives in Render's environment variables (`DATABASE_URL`) — not committed anywhere in this repo. If you need it, check the Render dashboard's Environment tab, or Neon's dashboard directly.

**To find current credentials**: log into Render (render.com) and Vercel (vercel.com) dashboards under whichever account owns this project, and check each service's Environment Variables tab. Do not expect secrets to be sitting in chat history or files — they should only live in the hosting platforms' env var stores.

## How to continue work in a new session

1. **Clone the repo**: `git clone https://github.com/anonymousagritech-netizen/ReNexis.git` — you'll need a GitHub Personal Access Token with `repo` (or "Contents: read and write" for fine-grained tokens) scope to push. Generate one fresh at GitHub → Settings → Developer settings → Personal access tokens. **Never reuse a token that has appeared in a previous chat conversation** — treat any token typed into a chat as compromised and rotate it immediately, whether or not this is the reason you're rotating it now.
2. **Backend local dev**: see `backend/README.md` for setup (copy `.env.example`, `npm install`, `npm run prisma:migrate:dev`, `npm run seed`, `npm run dev`).
3. **Frontend local dev**: see `frontend/README.md` for setup (copy `.env.example`, `npm install`, `npm run web`).
4. **Pushing changes**: standard git flow. The user in this project has wanted pushes after every meaningful change rather than batching — ask if that preference still holds, or confirm a new cadence.
5. **Redeploying**: both Render and Vercel auto-deploy on push to `main` (this was configured manually through each platform's dashboard, not via `render.yaml` Blueprint sync — so changes to `render.yaml` itself won't auto-apply; the Render service's Build/Start Command fields would need manual updates in its Settings tab if those ever need to change again).

## Demo credentials

Password for all seeded demo accounts: `Demo@12345`

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

If the database ever needs re-seeding and Render's free tier shell still isn't available, there's an HTTPS-triggerable seed endpoint: `POST /api/admin/seed` with header `x-seed-secret: <SEED_SECRET value from Render env vars>`. It's idempotent, safe to call more than once.

## Design/UX conventions established so far

These came from direct user feedback across the build — keep them consistent in any new work:

- **Light theme**, not dark. Base palette and module accent colors live in `frontend/src/theme/theme.ts` (`colors` and `moduleColors`).
- **No em dashes** anywhere in UI copy or chat responses to this user. Use commas, colons, periods, or parentheses instead.
- **Cards must span the full available page width** — no dead space on the right. `Card` component has explicit `width: '100%'`.
- **Grouped/multi-item data displays as separate bordered Card components**, not tiles crammed inside one shared card (see Asset Allocation, Catastrophe Accumulation, Catastrophe Exposure for the pattern).
- **Stat-style cards center their content** (icon, label, value, subtext all horizontally centered).
- **Tables**: `DataTable` component uses flex-based columns (no horizontal ScrollView — that was a bug source, see git history) so they always fill their container; content is center-aligned both directions; full grid borders matching the surrounding Card's border style.
- **Sidebar**: collapsible module groups rendered as rounded pill buttons with a colored dot, label, and chevron; whichever group contains the active screen auto-expands; single-item groups (Dashboard) render as a direct nav pill rather than an expandable group.
- **Screen subtitles** should not repeat "Module N ·" since the sidebar already conveys which module you're in.
- **Logo**: `frontend/assets/logo-icon.png` (sidebar) and `frontend/assets/logo-wordmark.png` (login screen) were cropped from a client-provided composite graphic — these are the real brand assets, don't revert to placeholder lettermarks.

## Known gaps / honest status

See the "Demo vs. production readiness" section in `backend/README.md` for the full list. Short version: file storage is local disk (not durable on Render's ephemeral filesystem — needs S3/Supabase Storage before going live), no MFA enforcement despite the schema field existing, IBNR/CSM/Solvency II figures are simplified data extracts rather than certified actuarial output (intentionally, per the original blueprint's own guidance), and a few other hardening items are listed there.

## A note on working style for whoever (whatever) picks this up

This project was built interactively, with the user sharing screenshots of the live deployed app and reporting specific visual/UX issues (card widths, table alignment, sidebar structure, etc.) rather than writing tickets. Expect that pattern to continue. The fastest path to a correct fix has consistently been: reproduce the actual root cause locally (don't guess), fix it, verify with `tsc --noEmit` and a full production build before pushing, then push immediately. The user wants direct action, not lengthy explanations before changes are made.
