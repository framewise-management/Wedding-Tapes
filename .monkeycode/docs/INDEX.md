# Wedding Tapes — agent wiki

Second-brain for AI agents and humans. Grounded in the repo as of this generation: Hono + Drizzle backend, React/Vite frontend, Supabase Auth + Postgres, Vercel.

Authoritative product specs remain at repo root (`wedding_photography_proposal_generator_detailed_SRS.md`). This wiki describes **what the code does now**, including port quirks in `CLAUDE.md`.

**快速链接**: [架构](./ARCHITECTURE.md) | [接口](./INTERFACES.md) | [开发者指南](./DEVELOPER_GUIDE.md)

---

## 核心文档

### [架构](./ARCHITECTURE.md)
Monorepo layout, stack, subsystems, mermaid flows, hard-won deploy/DB constraints.

### [接口](./INTERFACES.md)
HTTP routes, error envelope, JWT, frontend routes.

### [开发者指南](./DEVELOPER_GUIDE.md)
Env, commands, how to add endpoints/migrations, coding rules.

---

## 模块

| 模块 | 描述 | README |
|------|------|--------|
| `backend/src/services/` | Domain logic | [README](./模块/backend-services.md) |
| `backend/src/routes/` | Hono routers | [README](./模块/backend-routes.md) |
| `backend/src/db/` | Drizzle + postgres-js | [README](./模块/backend-db.md) |
| `frontend/src/` | SPA | [README](./模块/frontend.md) |

Also ingest: `backend/src/pricing.ts`, `backend/src/pdf.ts`, `backend/src/lib/*`, `backend/src/middleware/*`, `backend/src/schemas/*`.

---

## 核心概念

| 概念 | 描述 |
|------|------|
| [Proposal](./专有概念/Proposal.md) | Quotation, snapshot children, DRAFT edits, PDF |
| [Price snapshot](./专有概念/PriceSnapshot.md) | Catalog copy-on-attach; server totals |
| [Business](./专有概念/Business.md) | Tenant + Supabase-linked user |
| [Catalog](./专有概念/Catalog.md) | Services, packages, deactivate-not-delete |

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

## 入门指南

1. [架构](./ARCHITECTURE.md)
2. [核心概念](#核心概念)
3. [开发者指南](./DEVELOPER_GUIDE.md)
4. [接口](./INTERFACES.md)

### 命令

```bash
pnpm run dev
pnpm --dir backend test
pnpm --dir backend db:migrate
pnpm --dir backend seed
```

### 重要文件

| 文件 | 目的 |
|------|------|
| `backend/src/index.ts` | API entry |
| `backend/src/services/proposals.ts` | hardest domain |
| `backend/src/pricing.ts` | money formula |
| `frontend/src/App.tsx` | routes |
| `frontend/src/pages/CreateProposal.tsx` | main sales UI |
