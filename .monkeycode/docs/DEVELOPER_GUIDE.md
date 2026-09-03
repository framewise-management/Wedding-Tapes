# Developer guide

## 项目目的

Wedding Tapes is the wedding-photography proposal generator (MVP). Contributors implement remaining SRS FRs into `backend/` and `frontend/` without inventing payments, customer portals, WhatsApp, e-sign, CRM, or AI extraction.

**核心职责**:
- Keep pricing server-authoritative and snapshot catalog data on proposals
- Scope every query by JWT `businessId`
- Thin routes, fat services, isolated `pricing.ts` / `pdf.ts`

**相关系统**:
- Supabase Auth — credentials and email confirmation
- Supabase Postgres — application tables
- Vercel — host both services

## 环境搭建

### 前置条件

- Node.js compatible with TypeScript 6 / Vite 8
- pnpm
- Supabase project (Postgres + Auth) and CA PEM for the pooler

### 安装

```bash
pnpm install
cd backend && copy .env.example .env
cd ../frontend && copy .env.example .env
```

Fill `backend/.env` from `.env.example`. Never commit secrets.

### 环境变量

| 变量 | 必需 | 描述 | 示例 |
|------|------|------|------|
| `PORT` | 否 | local Hono listen | `3333` |
| `DATABASE_URL` | 是 | pooler URL **without** `sslmode` | `postgresql://...@host:6543/postgres` |
| `DATABASE_CA_CERT` | 是 | PEM of Supabase Root CA | `-----BEGIN CERTIFICATE-----...` |
| `JWT_SECRET` | 是 | HS256 secret | placeholder |
| `JWT_EXPIRES_IN` | 否 | jwt expiry | `1d` |
| `SUPABASE_URL` | 是 | Auth project URL | `https://<ref>.supabase.co` |
| `SUPABASE_ANON_KEY` | 是 | anon key | placeholder |
| `SUPABASE_SERVICE_ROLE_KEY` | 是 | service role (signup/seed) | placeholder |
| `FRONTEND_URL` | 否 | used by auth emails if wired | `http://localhost:5173` |
| `SEED_ADMIN_EMAIL` | seed | | |
| `SEED_ADMIN_PASSWORD` | seed | | |
| `VITE_API_URL` | frontend | API origin in local dev | `http://localhost:3333` |

### 运行

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

## 开发工作流

| 工具 | 命令 | 目的 |
|------|------|------|
| tsc | `pnpm --dir backend build` | typecheck (`tsc --noEmit`) |
| oxlint | `pnpm --dir backend lint` | lint |
| prettier | `pnpm --dir backend format` | format |
| vitest | `pnpm --dir backend test` | pricing unit tests |

Branch: current git branch is `master`. No documented GitHub Actions in-repo at scan time.

## 常见任务

### 添加新 API 端点

1. `backend/src/schemas/<domain>.ts` — Zod, no `.strict()`, no coerce on ints
2. `backend/src/services/<domain>.ts` — filter by `businessId`
3. `backend/src/routes/<domain>.ts` — parse, call service, `c.json`
4. Mount in `index.ts` if new router
5. Frontend: `apiGet`/`apiPost` in a page; types in `frontend/src/types/`

### 添加数据库变更

1. Edit `backend/src/db/schema.ts` (keep `.$onUpdate(() => sql\`now()\`)` on `updated_at`)
2. `pnpm --dir backend db:generate` then `db:migrate`
3. Do not run TypeORM files under `src/database/migrations/`

### 改定价公式

Only `backend/src/pricing.ts`. Re-run `pnpm --dir backend test`. All create/update/calculate paths must still go through `persistPricing()`.

### 改 PDF

Only `backend/src/pdf.ts`. Route stays 200 + `Uint8Array`.

## 编码规范

- Routes thin; services own queries
- Cross-domain: import `findOneService` etc., not another domain’s tables
- Typed HTTP errors from `lib/http-error.ts`
- Minimal comments; comment only non-obvious WHY
- Frontend: do not compute authoritative totals
- Surgical diffs; no speculative features listed in SRS out-of-scope

### 命名

| 类型 | 约定 | 示例 |
|------|------|------|
| backend files | kebab-case | `catalog-services.ts` |
| React pages | PascalCase | `CreateProposal.tsx` |
| functions | camelCase | `findOneProposal` |
| DB columns | snake_case in PG, camelCase in Drizzle | `proposal_number` / `proposalNumber` |

## 安全起步

Low-risk: copy, lint, frontend layout, docs. High-risk: `services/proposals.ts` snapshot/re-activate rules, auth supabase flags, SSL, pricing.
