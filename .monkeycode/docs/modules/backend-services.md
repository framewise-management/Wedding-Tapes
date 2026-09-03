# backend/src/services

Business logic. Talks to Drizzle `db` and other domains via exported functions.

## Structure

```
services/
├── auth.ts
├── business.ts
├── catalog-services.ts
├── packages.ts
├── customers.ts
└── proposals.ts
```

## Key files

| File | Purpose |
|------|---------|
| `auth.ts` | Supabase sign-in/up/resend; local users+businesses; app JWT |
| `proposals.ts` | snapshot, numbering, persistPricing, DRAFT guards, list search via join-then-refetch |
| `packages.ts` | composition + tenant checks |
| `customers.ts` | search; hard delete; map 23503 → ConflictError |
| `catalog-services.ts` | activate/deactivate style remove |

## Dependencies

**This module depends on**: `db/schema`, `lib/http-error`, `pricing.ts`, `lib/supabase`, `lib/jwt`

**Depended on by**: `routes/*`

## Conventions

Keep handlers out of this folder. Do not import another domain's table for convenience.
