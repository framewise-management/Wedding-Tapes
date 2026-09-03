# backend/src/services

Business logic. Talks to Drizzle `db` and other domains via exported functions.

## 结构

```
services/
├── auth.ts
├── business.ts
├── catalog-services.ts
├── packages.ts
├── customers.ts
└── proposals.ts
```

## 关键文件

| 文件 | 目的 |
|------|------|
| `auth.ts` | Supabase sign-in/up/resend; local users+businesses; app JWT |
| `proposals.ts` | snapshot, numbering, persistPricing, DRAFT guards, list search via join-then-refetch |
| `packages.ts` | composition + tenant checks |
| `customers.ts` | search; hard delete; map 23503 → ConflictError |
| `catalog-services.ts` | activate/deactivate style remove |

## 依赖

**本模块依赖**: `db/schema`, `lib/http-error`, `pricing.ts`, `lib/supabase`, `lib/jwt`

**依赖本模块的**: `routes/*`

## 规范

Keep handlers out of this folder. Do not import another domain’s table for convenience.
