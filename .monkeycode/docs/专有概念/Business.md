# Business and User

Multi-tenant root. All catalog, customer, and proposal rows belong to one `businesses` row.

## 什么是 Business？

Created at signup together with the first user, in one DB transaction. `users.id` is the Supabase Auth user UUID (no extra correlation column).

**关键特征**:
- Profile fields: name, logo, phone, email, address, website, `defaultValidityDays`, `defaultTerms`
- JWT `businessId` is the only tenant key
- Local `users.passwordHash` is nullable leftover; credentials are Supabase Auth
- Signup + seed create/link admin

## 代码位置

| 方面 | 位置 |
|------|------|
| 表 | `businesses`, `users` in `schema.ts` |
| Auth | `services/auth.ts`, `lib/supabase.ts`, `lib/jwt.ts` |
| Profile API | `services/business.ts`, `routes/business.ts` |
| Seed | `src/seed.ts` |
| UI | `Login.tsx`, `Signup.tsx`, `BusinessProfile.tsx` |

## 不变量

1. Never look up another tenant’s rows by client-supplied business id.
2. Keep supabase client browser flags off in Node.
3. Login: same error if email missing or password wrong (FR-001).
