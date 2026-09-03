# Interfaces

Public HTTP API implemented by `backend/src/index.ts` and `backend/src/routes/`. Frontend talks through `frontend/src/api/client.ts` (`apiGet` / `apiPost` / `apiPut` / `apiPatch` / `apiDelete` / `apiPostFile`).

## Auth

- Protected routes: `Authorization: Bearer <jwt>`
- JWT payload used by API: `{ sub, businessId, email }` (`middleware/auth.ts`)
- Errors: `{ error: { code, message } }`
  - 400 `VALIDATION_ERROR`
  - 401 `UNAUTHORIZED`
  - 403 `FORBIDDEN`
  - 404 `NOT_FOUND`
  - 409 `CONFLICT`
  - else `INTERNAL_ERROR`

CORS (current code): allow request origin only if it matches `^http://localhost:\d+$`.

## Ops (unprefixed)

| Method | Path | Auth | Notes |
|--------|------|------|--------|
| GET | `/` | no | `Hello World!` text |
| GET | `/health` | no | `{ status: 'ok', businessCount }` — counts `businesses` rows |

## Auth API (`/api/auth`)

| Method | Path | Auth | Body | Success |
|--------|------|------|------|---------|
| POST | `/api/auth/login` | no | `{ email, password }` | token + user context from `login()` |
| POST | `/api/auth/signup` | no | `{ businessName, firstName, lastName, email, password }` | 201; password min 8 |
| POST | `/api/auth/resend` | no | `{ email }` | resend verification |
| POST | `/api/auth/logout` | no | — | `{ success: true }` (client discards token) |

Login must not reveal whether the email exists (generic unauthorized).

## Business (`/api/business`) — JWT

| Method | Path | Notes |
|--------|------|--------|
| GET | `/api/business` | profile for JWT `businessId` |
| PUT | `/api/business` | partial update via `updateBusinessSchema` |

## Services catalog (`/api/services`) — JWT

| Method | Path | Notes |
|--------|------|--------|
| GET | `/api/services` | query `active` via `booleanQueryParam` |
| POST | `/api/services` | 201 |
| GET | `/api/services/:id` | UUID |
| PUT | `/api/services/:id` | |
| DELETE | `/api/services/:id` | implemented as deactivate in `removeService` (see catalog module) |

Dual prices: `perDayPrice`, `flatPrice`. `active` boolean.

## Packages (`/api/packages`) — JWT

| Method | Path | Notes |
|--------|------|--------|
| GET | `/api/packages` | `?active=` |
| POST | `/api/packages` | 201; response **without** `items` |
| GET | `/api/packages/:id` | includes composition |
| PUT | `/api/packages/:id` | |
| DELETE | `/api/packages/:id` | deactivate, not hard delete |
| POST | `/api/packages/:id/services` | 201; `{ serviceId, quantity? }`; tenant-safe attach |
| DELETE | `/api/packages/:id/services/:serviceId` | |

## Customers (`/api/customers`) — JWT

| Method | Path | Notes |
|--------|------|--------|
| GET | `/api/customers` | `?search=` name OR phone `ilike` |
| POST | `/api/customers` | 201; name + phone required |
| GET | `/api/customers/:id` | |
| PUT | `/api/customers/:id` | |
| DELETE | `/api/customers/:id` | **hard delete**; 409 if proposals reference customer (FK 23503) |

## Proposals (`/api/proposals`) — JWT

| Method | Path | Notes |
|--------|------|--------|
| GET | `/api/proposals` | list; `search` matches customer name |
| POST | `/api/proposals` | 201; server snapshots prices; number `WP-{year}-{4-digit}` |
| GET | `/api/proposals/:id` | with packages, items, customer |
| PUT | `/api/proposals/:id` | DRAFT only; omit `packages`/`items` to leave that side; `discount: null` clears discount |
| DELETE | `/api/proposals/:id` | |
| POST | `/api/proposals/:id/calculate` | 201; DRAFT; adjust discount/tax without full line rewrite |
| PATCH | `/api/proposals/:id/status` | `{ status }` |
| POST | `/api/proposals/:id/generate-pdf` | **200** PDF body; filename `proposalNumber.pdf` |

Proposal statuses in schema: `DRAFT` \| `SENT` \| `ACCEPTED` \| `REJECTED`.

Discount types: `FIXED` \| `PERCENTAGE`.

Item `priceType`: `per_day` \| `flat`.

Totals: never accept client `total`; `persistPricing()` recomputes via `calculatePricing`.

## Frontend routes (`App.tsx`)

| Path | Page | Guard |
|------|------|--------|
| `/` | Login | public |
| `/signup` | Signup | public |
| `/dashboard` | Dashboard | protected |
| `/business` | BusinessProfile | protected |
| `/customers` | Customers | protected |
| `/services` | Services | protected |
| `/packages` | Packages | protected |
| `/packages/:id` | PackageDetail | protected |
| `/proposals` | ProposalHistory | protected |
| `/proposals/new` | CreateProposal | protected |
| `/proposals/:id/edit` | CreateProposal | protected |
| `/proposals/new/packages` | PackageServiceSelection | **dead** unused flow |
| `/proposals/:id/preview` | ProposalPreview | protected |

Token: `frontend/src/auth/auth.ts` localStorage. `ProtectedRoute` redirects to `/` if missing.

`VITE_API_URL` defaults in dev to `http://localhost:3333`; empty string in production (same-origin via Vercel rewrites).

## Validation rules (shared)

- `parseBody` / `parseQuery` / `parseUuidParam` — first Zod issue only
- No `.strict()` on request objects
- Body ints: `z.number().int()` **no** `z.coerce`
- Boolean query: absent → undefined; `"true"` → true; anything else → false
