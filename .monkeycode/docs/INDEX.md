# Wedding Tapes — agent wiki

Language: **English only** for this wiki and for agent communication about it.

Second-brain for AI agents and humans. Grounded in the repo as of this generation: Hono + Drizzle backend, React/Vite frontend, Supabase Auth + Postgres, Vercel.

Authoritative product specs remain at repo root (`wedding_photography_proposal_generator_detailed_SRS.md`). This wiki describes **what the code does now**, including port quirks in `CLAUDE.md`.

**Quick links**: [Architecture](./ARCHITECTURE.md) | [Interfaces](./INTERFACES.md) | [Developer guide](./DEVELOPER_GUIDE.md)

---

## Core docs

### [Architecture](./ARCHITECTURE.md)
Monorepo layout, stack, subsystems, mermaid flows, hard-won deploy/DB constraints.

### [Interfaces](./INTERFACES.md)
HTTP routes, error envelope, JWT, frontend routes.

### [Developer guide](./DEVELOPER_GUIDE.md)
Env, commands, how to add endpoints/migrations, coding rules.

---

## Modules

| Module | Description | README |
|--------|-------------|--------|
| `backend/src/services/` | Domain logic | [README](./modules/backend-services.md) |
| `backend/src/routes/` | Hono routers | [README](./modules/backend-routes.md) |
| `backend/src/db/` | Drizzle + postgres-js | [README](./modules/backend-db.md) |
| `frontend/src/` | SPA | [README](./modules/frontend.md) |

Also ingest: `backend/src/pricing.ts`, `backend/src/pdf.ts`, `backend/src/lib/*`, `backend/src/middleware/*`, `backend/src/schemas/*`.

---

## Core concepts

| Concept | Description |
|---------|-------------|
| [Proposal](./concepts/Proposal.md) | Quotation, snapshot children, DRAFT edits, PDF |
| [Price snapshot](./concepts/PriceSnapshot.md) | Catalog copy-on-attach; server totals |
| [Business](./concepts/Business.md) | Tenant + Supabase-linked user |
| [Catalog](./concepts/Catalog.md) | Services, packages, deactivate-not-delete |

---

## Knowledge base map (ingested)

| Source | Role |
|--------|------|
| `CLAUDE.md` | Stack port notes, invariants, commands |
| `wedding_photography_proposal_generator_detailed_SRS.md` | FR-001…, data model, §17 pricing, PDF, security |
| `wedding_photography_proposal_generator_small_scope_MVP.md` | Short scope / out-of-scope |
| `plan.md` | Phased build (Nest/TypeORM names are historical) |
| `backend/README.md`, `frontend/README.md` | Package READMEs |
| `vercel.json` | Multi-service + rewrites |

---

## Getting started

1. [Architecture](./ARCHITECTURE.md)
2. [Core concepts](#core-concepts)
3. [Developer guide](./DEVELOPER_GUIDE.md)
4. [Interfaces](./INTERFACES.md)

### Commands

```bash
pnpm run dev
pnpm --dir backend test
pnpm --dir backend db:migrate
pnpm --dir backend seed
```

### Important files

| File | Purpose |
|------|---------|
| `backend/src/index.ts` | API entry |
| `backend/src/services/proposals.ts` | hardest domain |
| `backend/src/pricing.ts` | money formula |
| `frontend/src/App.tsx` | routes |
| `frontend/src/pages/CreateProposal.tsx` | main sales UI |
