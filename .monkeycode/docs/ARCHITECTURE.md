# Architecture

## Overview

Wedding Tapes is an internal sales tool for a wedding photography business. Staff log in, maintain a catalog of services and packages, keep customer records, assemble quotations (proposals), and export PDFs.

The product is a two-service monorepo: a Hono + TypeScript API on Vercel Functions and a React + Vite SPA. Data lives in Supabase Postgres via Drizzle ORM. Passwords live in Supabase Auth; this app stores a profile row (`users`) keyed to the same UUID and issues its own HS256 JWT for API authorization.

Every domain row is scoped by `business_id`. The API never trusts a client-supplied business id or a client-supplied total. Catalog prices are snapshotted onto proposal child rows so later catalog edits cannot rewrite history.

Source of truth for product rules: `wedding_photography_proposal_generator_detailed_SRS.md` (authoritative) and `wedding_photography_proposal_generator_small_scope_MVP.md`. Stack notes and port history: `CLAUDE.md`. Phase plan (partially historical — backend is no longer NestJS): `plan.md`.

## Tech stack

**Languages and runtime**
- TypeScript (backend `typescript` ^6, frontend ~6)
- Node.js (Vercel Functions / local `@hono/node-server`)

**Frameworks**
- Hono 4 (API)
- React 19 + Vite 8 + react-router-dom 7
- Vitest (backend unit tests: `src/pricing.spec.ts`)
- oxlint, prettier

**Data stores**
- Supabase Postgres via `drizzle-orm/postgres-js`
- Transaction pooler port 6543, `prepare: false`
- SSL CA via `DATABASE_CA_CERT` (do not put `sslmode` in `DATABASE_URL`)

**Infrastructure**
- Vercel multi-service (`vercel.json`): `frontend` (Vite) + `backend` (`entrypoint: src/index.ts`)
- Rewrites: `/api`, `/health` → backend; everything else → frontend
- Package manager: pnpm

**External services**
- Supabase Auth (`signInWithPassword`, `signUp`, resend verification)
- pdfkit for server-side PDF

## Project structure

```
Wedding Tapes/
├── backend/
│   ├── src/
│   │   ├── index.ts              # Vercel export default app
│   │   ├── dev-server.ts         # local serve() wrapper — never used on Vercel
│   │   ├── db/                   # postgres-js client + Drizzle schema
│   │   ├── routes/               # thin Hono routers
│   │   ├── services/             # business logic
│   │   ├── schemas/              # Zod request schemas
│   │   ├── middleware/           # JWT auth, error envelope
│   │   ├── lib/                  # jwt, supabase, validate, http-error
│   │   ├── pricing.ts            # pure pricing engine
│   │   ├── pdf.ts                # pdfkit generator
│   │   ├── seed.ts
│   │   └── database/migrations/  # historical TypeORM migrations (not run)
│   ├── drizzle.config.ts
│   └── vercel entry via src/index.ts
├── frontend/
│   └── src/
│       ├── main.tsx, App.tsx
│       ├── api/client.ts
│       ├── auth/
│       ├── pages/
│       ├── components/
│       └── types/
├── vercel.json
├── CLAUDE.md
└── wedding_photography_proposal_generator_*.md
```

**Entry points**
- `backend/src/index.ts` — `export default app` (Vercel)
- `backend/src/dev-server.ts` — local port 3333
- `frontend/src/main.tsx` — SPA
- Root `pnpm run dev` — concurrently backend watch + Vite

## Subsystems

### HTTP / Hono app
**Purpose**: CORS, error envelope, mount domain routers under `/api`.
**Location**: `backend/src/index.ts`, `backend/src/routes/`
**Key files**: `middleware/error.ts`, `middleware/auth.ts`
**Depends on**: services, db
**Used by**: Vercel / `@hono/node-server`

### Domain services
**Purpose**: Auth, business profile, catalog, customers, proposals (snapshot + persist pricing).
**Location**: `backend/src/services/`
**Key files**: `proposals.ts`, `auth.ts`, `packages.ts`, `catalog-services.ts`
**Depends on**: `db`, other domain *service functions* (not raw tables of another domain)
**Used by**: routes

### Persistence
**Purpose**: Drizzle tables + relations; one module-scope postgres client.
**Location**: `backend/src/db/`
**Key files**: `schema.ts`, `client.ts`, `pg-error.ts`
**Depends on**: `DATABASE_URL`, `DATABASE_CA_CERT`
**Used by**: services, `/health`

### Pricing engine
**Purpose**: Isolated `calculatePricing` (SRS §17).
**Location**: `backend/src/pricing.ts`
**Used by**: `services/proposals.ts` via `persistPricing()`
**Tests**: `backend/src/pricing.spec.ts`

### PDF
**Purpose**: `(proposal, business) => Promise<Buffer>` — no DB.
**Location**: `backend/src/pdf.ts`
**Used by**: `routes/proposals.ts` `POST /:id/generate-pdf` (HTTP 200)

### Frontend SPA
**Purpose**: Authenticated internal UI.
**Location**: `frontend/src/`
**Key files**: `api/client.ts`, `pages/CreateProposal.tsx`, `auth/ProtectedRoute.tsx`

## Diagrams

```mermaid
flowchart LR
    subgraph Client
        SPA[React Vite SPA]
    end
    subgraph Vercel
        FE[frontend service]
        BE[backend Hono]
    end
    subgraph AuthN
        SA[Supabase Auth]
    end
    subgraph Data
        PG[(Supabase Postgres)]
    end
    SPA --> FE
    SPA -->|/api /health| BE
    BE --> SA
    BE --> PG
```

```mermaid
sequenceDiagram
    participant SPA
    participant AuthR as routes/auth
    participant AuthS as services/auth
    participant SA as Supabase Auth
    participant DB as Postgres
    SPA->>AuthR: POST /api/auth/login
    AuthR->>AuthS: login(email, password)
    AuthS->>SA: signInWithPassword
    SA-->>AuthS: user id or fail
    AuthS->>DB: users row for businessId
    AuthS-->>AuthR: app JWT
    AuthR-->>SPA: 200 + token
```

```mermaid
flowchart TB
    Routes[routes/*.ts]
    Validate[lib/validate Zod]
    Svc[services/*.ts]
    Price[pricing.calculatePricing]
    Schema[db/schema.ts]
    Routes --> Validate
    Routes --> Svc
    Svc --> Schema
    Svc --> Price
```

## Design decisions (as implemented)

- No Nest DI: plain modules and function exports.
- JWT: HS256, `sub` / `businessId` / `email`, no per-request user DB lookup.
- Supabase JS client: `persistSession: false`, `autoRefreshToken: false`, `detectSessionInUrl: false`.
- Money fields are integers (minor units / whole currency as stored — no decimal type in schema).
- `proposal_packages` / `proposal_items` hold snapshotted name, description, unit price.
- Optional line items (`is_optional`) are excluded from subtotal.
- `POST /api/packages` response does not include `items` (historical contract).
- CORS origin: `http://localhost:<port>` only in code (`LOCALHOST_ORIGIN`).
- Historical TypeORM migrations under `backend/src/database/migrations/` are not executed.
