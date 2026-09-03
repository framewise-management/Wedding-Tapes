# Developer guide

Wiki language: **English only**. Agent replies and new wiki pages must be English.

## Project purpose

Wedding Tapes is the wedding-photography proposal generator (MVP). Contributors implement remaining SRS FRs into `backend/` and `frontend/` without inventing payments, customer portals, WhatsApp, e-sign, CRM, or AI extraction.

**Core responsibilities**:
- Keep pricing server-authoritative and snapshot catalog data on proposals
- Scope every query by JWT `businessId`
- Thin routes, fat services, isolated `pricing.ts` / `pdf.ts`

**Related systems**:
- Supabase Auth — credentials and email confirmation
- Supabase Postgres — application tables
- Vercel — host both services

## Environment setup

### Prerequisites

- Node.js compatible with TypeScript 6 / Vite 8
- pnpm
- Supabase project (Postgres + Auth) and CA PEM for the pooler

### Install

```bash
pnpm install
cd backend && copy .env.example .env
cd ../frontend && copy .env.example .env
```

Fill `backend/.env` from `.env.example`. Never commit secrets.

### Environment variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `PORT` | no | local Hono listen | `3333` |
| `DATABASE_URL` | yes | pooler URL **without** `sslmode` | `postgresql://...@host:6543/postgres` |
| `DATABASE_CA_CERT` | yes | PEM of Supabase Root CA | `-----BEGIN CERTIFICATE-----...` |
| `JWT_SECRET` | yes | HS256 secret | placeholder |
| `JWT_EXPIRES_IN` | no | jwt expiry | `1d` |
| `SUPABASE_URL` | yes | Auth project URL | `https://<ref>.supabase.co` |
| `SUPABASE_ANON_KEY` | yes | anon key | placeholder |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | service role (signup/seed) | placeholder |
| `FRONTEND_URL` | no | used by auth emails if wired | `http://localhost:5173` |
| `SEED_ADMIN_EMAIL` | seed | | |
| `SEED_ADMIN_PASSWORD` | seed | | |
| `VITE_API_URL` | frontend | API origin in local dev | `http://localhost:3333` |

### Run

From repo root:

```bash
pnpm run dev
```

Per package:

```bash
# backend
pnpm --dir backend start:dev    # tsx watch, port 3333
pnpm --dir backend test         # vitest pricing
pnpm --dir backend db:generate
pnpm --dir backend db:migrate
pnpm --dir backend seed

# frontend
pnpm --dir frontend dev         # Vite 5173
pnpm --dir frontend build
```

Backend local must use `dev-server.ts` (`serve()`). Vercel must only load `index.ts` `export default app`.

## Development workflow

| Tool | Command | Purpose |
|------|---------|---------|
| tsc | `pnpm --dir backend build` | typecheck (`tsc --noEmit`) |
| oxlint | `pnpm --dir backend lint` | lint |
| prettier | `pnpm --dir backend format` | format |
| vitest | `pnpm --dir backend test` | pricing unit tests |

Branch: current git branch is `master`. No documented GitHub Actions in-repo at scan time.

## Common tasks

### Add a new API endpoint

1. `backend/src/schemas/<domain>.ts` — Zod, no `.strict()`, no coerce on ints
2. `backend/src/services/<domain>.ts` — filter by `businessId`
3. `backend/src/routes/<domain>.ts` — parse, call service, `c.json`
4. Mount in `index.ts` if new router
5. Frontend: `apiGet`/`apiPost` in a page; types in `frontend/src/types/`

### Add a database change

1. Edit `backend/src/db/schema.ts` (keep `.$onUpdate(() => sql\`now()\`)` on `updated_at`)
2. `pnpm --dir backend db:generate` then `db:migrate`
3. Do not run TypeORM files under `src/database/migrations/`

### Change the pricing formula

Only `backend/src/pricing.ts`. Re-run `pnpm --dir backend test`. All create/update/calculate paths must still go through `persistPricing()`.

### Change the PDF

Only `backend/src/pdf.ts`. Route stays 200 + `Uint8Array`.

## Coding conventions

- Routes thin; services own queries
- Cross-domain: import `findOneService` etc., not another domain's tables
- Typed HTTP errors from `lib/http-error.ts`
- Minimal comments; comment only non-obvious WHY
- Frontend: do not compute authoritative totals
- Surgical diffs; no speculative features listed in SRS out-of-scope
- Wiki and agent-facing docs: English only

### Naming

| Kind | Convention | Example |
|------|------------|---------|
| backend files | kebab-case | `catalog-services.ts` |
| React pages | PascalCase | `CreateProposal.tsx` |
| functions | camelCase | `findOneProposal` |
| DB columns | snake_case in PG, camelCase in Drizzle | `proposal_number` / `proposalNumber` |

## Safe starting points

Low-risk: copy, lint, frontend layout, docs. High-risk: `services/proposals.ts` snapshot/re-activate rules, auth supabase flags, SSL, pricing.
