# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository status

- `backend/` — NestJS + TypeScript (native ESM — `"type": "module"`, `nodenext` resolution, relative imports need `.js` extensions even in `.ts` files). Package manager **pnpm**. API routes are prefixed `/api` (`main.ts` `setGlobalPrefix`), except `/` and `/health` which stay unprefixed ops endpoints.
  - Phase 0: `@nestjs/config`, `@nestjs/typeorm` + TypeORM 1.x + `pg`, global `ValidationPipe`, a global `HttpExceptionFilter` shaping errors as `{ error: { code, message } }` (SRS §12), CORS. DB is **Neon Postgres** via a single `DATABASE_URL` env var (Neon's pooled connection string already carries `sslmode=require`; `pg` parses that itself — don't add `ssl: { rejectUnauthorized: false }`, that disables cert verification).
  - Phase 1: JWT auth (`@nestjs/jwt` + `@nestjs/passport` + `passport-jwt`, `bcryptjs` for hashing) and Business Profile CRUD. `AuthModule` registers `PassportModule.register({ defaultStrategy: 'jwt' })` explicitly and **exports that same instance** — a bare unconfigured `PassportModule` does not provide `AuthModuleOptions`, and relying on the guard's `@Optional()` injection to fall back silently does not work reliably in the installed `@nestjs/passport` version, so any new module using `JwtAuthGuard` must import `AuthModule` (not just slap `@UseGuards(JwtAuthGuard)` on it) or it'll throw `UnknownDependenciesException` at boot. `JwtPayload` (`sub`, `businessId`, `email`) is attached to `req.user` by `JwtStrategy`. There is no registration endpoint by design (SRS has no such API) — new users/businesses are created via `pnpm run seed` (`src/database/seed.ts`, reads `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD` from env). Login never reveals whether the email exists (FR-001) — same generic `UnauthorizedException` either way.
  - **TypeORM gotcha**: a `@Column()` typed as a TS union (e.g. `string | null`) reflects as `Object` and TypeORM can't infer the SQL type (`DataTypeNotSupportedError`) — always give nullable columns an explicit `type: 'varchar'`/`'text'`/etc.
  - **TypeORM gotcha**: don't trust `Repository.save()`'s return value or a subsequently-mutated entity reference for read-after-write responses in this version — it has been observed dropping unrelated columns from the returned/mutated object. Use `repository.update(id, dto)` followed by a fresh `findOne`/`findOneBy` re-fetch instead (see `BusinessService.update`).
  - The TypeORM CLI (`typeorm-ts-node-esm`, i.e. ts-node's ESM loader) is required for anything that loads decorated entities (migrations, `seed.ts`) — **`tsx`/esbuild cannot emit the decorator metadata TypeORM's reflection needs** and was removed after failing with `ColumnTypeUndefinedError`. Don't reintroduce it for TypeORM scripts.
  - Phase 2: Services (`src/services/`) and Packages (`src/packages/`) catalog modules, both business-scoped (every query filters by `businessId` from the JWT — never trust a client-supplied business id). `Package` and `PackageService` (the package↔service join, with `quantity`) live in **one file**, `packages/entities/package.entity.ts` — splitting them into separate files reintroduces a circular ESM import (`Package` needs `PackageService` for its `items` relation, `PackageService` needs `Package` for its `@ManyToOne`), and TypeORM's `emitDecoratorMetadata` evaluates the class reference eagerly (not lazily, despite the `() => Package` thunk syntax), causing a real `ReferenceError: Cannot access 'Package' before initialization` at runtime. Keep any future tightly-coupled parent/child entity pair in one file rather than reintroducing this. `PackagesService` depends on `ServicesService` (imports `ServicesModule`) to validate a `serviceId` belongs to the business before attaching it — the correct way to reuse another module's logic (never reach into another module's repository/entities directly). Services/packages use **deactivate, not delete** — there is deliberately no `DELETE /api/services/:id` — FR-005/006 only ever describe activate/deactivate, and hard-deleting would conflict with `PackageService`/(future) `ProposalItem` foreign keys; package↔service composition itself uses `POST/DELETE /api/packages/:id/services(/:serviceId)`, matching SRS §8.4, rather than replacing the whole services array on every `PUT`.
  - Phase 3: Customers (`src/customers/`), business-scoped like every other entity. Unlike Services/Packages, `DELETE /api/customers/:id` is a **real hard delete** — SRS §8.2 specs it literally. Now that Phase 4 added `Proposal.customer_id` as a real FK (default `NO ACTION`, i.e. `RESTRICT`), `CustomersService.remove` catches the resulting Postgres FK-violation (`QueryFailedError` with `driverError.code === '23503'`) and rethrows as a `ConflictException` — deleting a customer with existing proposals now fails with a clean 409, not a raw DB error. `findAll` supports a `?search=` query param matching name OR phone via case-insensitive partial match (`ILike`), per FR-003's search requirement — no dedicated search endpoint, just a query param on the list route.
  - Phase 4: Proposals (`src/proposals/`) — `Proposal`, `ProposalPackage`, `ProposalItem` live in **one file** (`proposals/entities/proposal.entity.ts`), same circular-ESM-import reasoning as Package/PackageService (§Phase 2 above). `PackagesService`/`BusinessService` needed new `exports: [...]` entries in their modules so `ProposalsModule` can inject them (`ServicesService`/`CustomersService` already exported these). Price snapshotting (SRS §14) happens in `ProposalsService.resolvePackageSnapshot`/`resolveItemSnapshot`, which look up the *current* catalog row and copy name/description/price onto the `ProposalPackage`/`ProposalItem` row — proposal totals never re-read `package.price`/`service.price` live. Beyond SRS §6 (which predates the Phase 2 per-day/flat dual pricing decision), `ProposalItem` also snapshots `priceType: 'per_day' | 'flat'` — the frontend/DTO may specify which rate to use per line item, or omit it and let `ProposalsService.resolveItemSnapshot` infer it (prefers `per_day` if the service has one, else `flat`). Proposal numbers (`WP-{year}-{4-digit sequence}`) are generated by counting existing proposals for that business+year (`ProposalsService.generateProposalNumber`) — **not concurrency-safe**, fine for the MVP's single-user-per-business usage but would need a DB sequence/advisory lock under real concurrent writes. `PUT /api/proposals/:id` only succeeds while `status === DRAFT` (`ConflictException` otherwise) — packages/items are only replaced when the request actually includes a `packages`/`items` array (omit either to leave that side untouched while editing other fields).
  - Phase 5: Pricing engine (`src/pricing/`) — `PricingService` is a deliberately isolated, dependency-free, pure-function service (no repository/module injections, unit-tested in `pricing.service.spec.ts` with no NestJS `TestingModule` needed) implementing SRS §17's formula exactly: `subtotal = packageTotal + serviceTotal(excluding optional)` → `discountAmount` (FIXED or PERCENTAGE, clamped to `[0, subtotal]` so total can never go negative, per FR-012) → `taxableAmount = subtotal - discountAmount` → `taxAmount = taxableAmount * taxRate / 100` (tax applies to the **post-discount** amount, not raw subtotal — confirmed against both the §17 pseudocode and the FR-013 worked example) → `total = taxableAmount + taxAmount`. `taxRate` lives on **`Proposal`** (not `Business`) per SRS §6.1 — there is deliberately no business-level tax default. `ProposalsService.create`/`update`/`calculate` all funnel through a shared `persistPricing()` helper so subtotal/discount/tax/total are always recomputed and persisted together, never drifting independently. `POST /api/proposals/:id/calculate` (new in Phase 5, DRAFT-only like `PUT`) exists specifically so the frontend can adjust discount/tax on an already-saved draft without resending the full packages/items array — `discount: null` in either `calculate` or `PUT` explicitly clears an existing discount (vs. omitting the field entirely, which leaves it untouched); `CreateProposalDto`'s `discount`/`taxRate` are still both optional since a proposal with neither is valid (0% tax, no discount).
  - `CurrentUser()` (`src/auth/current-user.decorator.ts`) extracts the `JwtPayload` from `req.user` — use this in any new guarded controller instead of re-deriving it via `@Req()`.
- `frontend/` — React + TypeScript via Vite. Package manager **pnpm**. `src/pages/` holds one component per screen; `src/auth/` holds `auth.ts` (localStorage token helpers) and `ProtectedRoute.tsx` (redirects to `/` when unauthenticated); `src/api/client.ts` exports `apiGet`/`apiPost`/`apiPut`/`apiDelete`, all auto-attaching the bearer token and unwrapping the backend's `{ error: { message } }` shape into a thrown `Error`. `src/types/catalog.ts` holds the shared `Service`/`Package`/`PackageItem` interfaces used by the Services/Packages/PackageDetail pages; `src/types/customer.ts` holds `Customer`; `src/types/proposal.ts` holds `Proposal`/`ProposalPackage`/`ProposalItem`. `CreateProposal.tsx` implements SRS §10.2's sections 1–4/6/7 in one screen but **merges §10.2's sections 4 ("Individual services") and 5 ("Optional services") into a single Services section** with an inline `isOptional` checkbox per line — functionally equivalent (still produces `ProposalItem.isOptional`, still visually splits into "Included"/"Optional" groups) but avoids a duplicate add-service flow. Its Pricing section's discount-type/value and tax-rate inputs are pre-save only (submitted with the initial `POST /api/proposals`) — there's no post-save "adjust and recalculate" UI wired to `POST /api/proposals/:id/calculate` yet even though the backend supports it; that's a natural fit for Phase 6's editing screen rather than Phase 5. `PackageServiceSelection.tsx` (a Phase-0-scaffolded route, `/proposals/new/packages`) is unused dead code from before this design was settled — nothing links to it, left alone per the surgical-changes rule. `ProposalPreview.tsx`/`ProposalHistory.tsx` remain stubs; SRS §10.2's dedicated Preview screen is explicitly Phase 6 (FR-014/015), not Phase 4/5.

Beyond Phases 0–5, no further domain feature code exists yet — implement remaining FRs from the SRS into these two projects rather than restructuring them. The phase-by-phase build order lives in the active plan file (ask if you need it re-surfaced).

## Commands

Run from the repo root:

```
pnpm run dev             # start backend (watch) + frontend dev server together, via concurrently
```

All other commands run from inside `backend/` or `frontend/` respectively.

```
pnpm install            # install deps
pnpm run start          # backend: start Nest app (localhost:3333)
pnpm run start:dev      # backend: watch mode
pnpm run build          # both: production build
pnpm run test           # backend: unit tests (vitest)
pnpm run migration:run  # backend: apply pending TypeORM migrations (Neon)
pnpm run migration:generate  # backend: diff entities vs DB into a new migration
pnpm run seed           # backend: create the dev business + admin user (SEED_ADMIN_EMAIL/PASSWORD from .env)
pnpm dev                # frontend: Vite dev server (localhost:5173, or next free port)
```

Both `backend/.env` and `frontend/.env` hold real local config (`DATABASE_URL` for Neon, `JWT_SECRET`, `SEED_ADMIN_EMAIL`/`PASSWORD`, `VITE_API_URL`) — copy from the corresponding `.env.example` when setting up a new machine; both are gitignored. Backend runs on **port 3333**, not 3000 — an unrelated, unidentified long-running process occupies 3000 on this dev machine (unkillable without elevated privileges); investigate that separately if you need port 3000 back.

## Source of truth

- `wedding_photography_proposal_generator_small_scope_MVP.md` — short-form MVP scope (screens, workflow, business rules, out-of-scope list).
- `wedding_photography_proposal_generator_detailed_SRS.md` — full SRS: functional requirements (FR-001…FR-019), data model, API spec, validation/security/error-handling rules, pricing engine pseudocode, PDF layout, and delivery plan.

The SRS is the authoritative, detailed version; the MVP doc is a lighter summary. When they overlap, follow the SRS. When implementing any feature, check both docs for the relevant FR/section before writing code.

## Product shape (for orientation)

**Domain:** internal sales tool for a wedding photography business to build customer proposals/quotations and export them as PDF.

**Core entity graph:**
```
Business → Users, Customers, Services, Packages
Customer → Proposals
Proposal → ProposalPackages, ProposalItems
Package ↔ Service (many-to-many via PackageService)
```

**Non-negotiable business rules baked into the data model (SRS §14, FR-007/008):**
- A proposal can hold *multiple* packages plus individual services plus optional add-ons simultaneously — this drives the schema (`ProposalPackage` and `ProposalItem` as separate child tables, not a single line-items table).
- **Price snapshotting**: when a package/service is added to a proposal, its name/description/price must be copied onto the `ProposalPackage`/`ProposalItem` row. Later catalog price changes must never alter existing proposals. Any pricing code that reads `package.price`/`service.price` live at proposal-render time instead of the stored snapshot is a bug.
- **Backend is the pricing authority** (FR-011, §13 Security): the frontend must never be trusted to compute or submit a final total. Reject/ignore any client-supplied total; recompute server-side from package/service IDs and quantities.
- Optional services (`is_optional`) are excluded from the totals by default and only added in when explicitly included.
- Multi-tenancy: all data is scoped by `business_id`; one business must never see another's data (§13 Authorization).

**Stack (decided):** NestJS + TypeScript backend, React (not Next.js) + TypeScript frontend, PostgreSQL, server-side PDF generation. This overrides the SRS §16 suggestion of Next.js/Express — use React/NestJS specifically.

**Code comments:** keep minimal. Do not write comments unless the WHY is non-obvious (a hidden constraint, workaround, or non-obvious invariant) — never comment on WHAT the code does.

**Design principles:** apply SOLID, and favor high cohesion / low coupling, in both backend and frontend code.
- Single Responsibility: keep controllers thin (HTTP concerns only), services own business logic, repositories/entities own persistence — don't let a NestJS controller or a React component grow multiple reasons to change.
- Open/Closed & Liskov: prefer extending via new classes/strategies (e.g. new discount types, new PDF templates) over branching on type flags inside existing logic.
- Interface Segregation & Dependency Inversion: NestJS services should depend on injectable interfaces/tokens (e.g. a `PdfGenerator` interface) rather than concrete implementations, so the pricing engine, PDF service, etc. stay swappable and testable in isolation.
- Cohesion/coupling in practice: each NestJS module (Customers, Services, Packages, Proposals, Pricing, Pdf) should own its own concern and expose a narrow public API; cross-module reach-ins (e.g. Proposals importing Packages' internals instead of its service) are a smell. On the frontend, keep components/hooks focused on one concern (data-fetching vs. presentation vs. form state) rather than monolithic page components.

**Architecture guidance from the spec** (SRS §15 Maintainability): keep the pricing engine as an isolated, unit-tested module separate from route/controller code (pseudocode in SRS §17), and keep PDF generation decoupled from proposal calculation.

## Explicitly out of scope for the MVP

Do not add unless asked: online payments, customer login/portal, WhatsApp/email automation, e-signatures, booking/contract management, full CRM, AI chatbot, analytics, multi-language/multi-currency, complex tax/discount rules. AI-based requirement extraction is a documented future phase (SRS §24) — not part of the MVP build.
