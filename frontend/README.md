# ReNexis Frontend

Expo (React Native + Web) application covering all 8 demo modules with full CRUD, built web-first for deployment on Vercel.

## Stack

Expo SDK 56, React Native Web, TypeScript, axios, a lightweight custom in-app navigation (sidebar + content router — avoids React Navigation's web/reanimated fragility while staying fully native-compatible).

## Local setup

```bash
cd frontend
cp .env.example .env   # set EXPO_PUBLIC_API_URL to your backend (default: http://localhost:4000/api)
npm install
npm run web              # opens at http://localhost:8081 (or similar)
```

Log in with any seeded demo account (password `Demo@12345`) — the login screen has quick-fill chips for every role.

## Architecture

- `src/api/` — typed API client (axios with auto token-refresh on 401) plus one file per backend module
- `src/auth/` — auth context, session persistence (AsyncStorage on native, localStorage on web)
- `src/navigation/` — role-aware sidebar + simple route switcher (`NavigationContext` + `AppShell`)
- `src/screens/` — one folder per module (contracts, parties, risks, claims, premiums, accounting, investments, gl, compliance, reporting, lifecycle, audit), each with list + create + detail/workflow UI
- `src/components/` — shared UI kit: DataTable, Modal, Card, Button, FormField, Badge, StatCard
- `src/theme/` — design tokens (colors, spacing, typography, status color mapping)

## Building for production

```bash
npx expo export -p web
```

Outputs a static SPA to `dist/`. Verified locally: 845 modules bundle cleanly and the output serves correctly.

## Deploying to Vercel

This repo includes `vercel.json` in `frontend/` configured to run `npx expo export -p web` and serve `dist/` with SPA rewrites. In Vercel:

1. Import this repo, set the project root to `frontend/`.
2. Set the `EXPO_PUBLIC_API_URL` environment variable to your deployed Render backend's `/api` URL.
3. Deploy — Vercel will run the build command from `vercel.json` automatically.

## Demo login

Password for every account: `Demo@12345`

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
