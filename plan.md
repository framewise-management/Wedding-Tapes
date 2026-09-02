Context                                                                                                                                                              │
│                                                                                                                                                                      │
│ backend/ (NestJS) and frontend/ (React/Vite) are freshly scaffolded with only default starter files — no domain code exists yet. The full requirements live in wedding_photography_proposal_generator_detailed_SRS.md (authoritative) and the shorter ..._MVP.md. The user wants the MVP built in small, sequential phases rather than one large implementation pass, so each phase should be independently buildable, runnable, and verifiable before moving to the next.                             │
│                                                                                                                                                                      │
│ Stack decisions locked in CLAUDE.md: NestJS + TypeScript backend, React (Vite, not Next.js) + TypeScript frontend, PostgreSQL, pnpm. ORM: TypeORM (user-confirmed — official @nestjs/typeorm integration, decorator entities, migration CLI).                                                                                            │
│                                                                                                                                                                      │
│ Per SRS §3.2, the MVP may use a single authenticated user role (no separate Owner/Sales permission split) to reduce complexity — every table still carries business_id for future multi-tenancy, but auth itself stays simple (one login, one business context per account).                                                    │
│                                                                                                                                                                      │
│ Design principles to apply throughout (already in CLAUDE.md): SOLID, high cohesion/low coupling — thin Nest controllers, logic in services, one Nest module per bounded concern (Customers, Services, Packages, Proposals, Pricing, Pdf), minimal comments.                                                                          │
│                                                                                                                                                                      │
│ ---                                                                                                                                                                  │
│                                                                                                                                                                      │
│ Phase 0 — Infrastructure Foundation                                                                                                                                  │
│                                                                                                                                                                      │
│ Goal: empty-but-wired full stack: DB connects, config loads, app boots end-to-end.                                                                                   │
│                                                                                                                                                                      │
│ Backend:                                                                                                                                                             │
│ - Add @nestjs/config for env vars (.env, .env.example).                                                                                                              │
│ - Add @nestjs/typeorm + typeorm + pg; configure DataSource (migrations enabled, synchronize: false).                                                                 │
│ - Add global ValidationPipe (whitelist + transform) and a global exception filter that shapes errors as { error: { code, message } } per SRS §12.                    │
│ - Add class-validator/class-transformer (needed for DTOs everywhere after).                                                                                          │
│ - Enable CORS for the frontend origin.                                                                                                                               │
│ - Empty Business entity + first migration, to prove the DB round-trip.                                                                                               │
│                                                                                                                                                                      │
│ Frontend:                                                                                                                                                            │
│ - Add a minimal API client (fetch-based or axios) with a base URL from .env (VITE_API_URL).                                                                          │
│ - Add React Router (react-router-dom) with placeholder routes for the 6 MVP screens (Login, Dashboard, Create Proposal, Package/Service Selection, Proposal Preview, Proposal History).                                                                                                                                                 │
│ - Strip Vite's default counter demo content.                                                                                                                         │
│                                                                                                                                                                      │
│ Verify: pnpm run start:dev (backend) connects to Postgres and runs a migration; pnpm dev (frontend) renders the router shell; a placeholder GET /health (or root) returns 200 from the frontend via the API client.                                                                                                                    │
│                                                                                                                                                                      │
│ ---                                                                                                                                                                  │
│                                                                                                                                                                      │
│ Phase 1 — Auth + Business Profile (FR-001, FR-002)                                                                                                                   │
│                                                                                                                                                                      │
│ Backend: AuthModule (JWT via @nestjs/passport + passport-jwt, bcrypt password hashing), BusinessModule (CRUD on the one business profile: name, logo, phone, email, address, website, default validity, default terms). POST /api/auth/login, POST /api/auth/logout (client-side token discard is enough for MVP), GET/PUT /api/business.                                                                                                                                                       │
│                                                                                                                                                                      │
│ Frontend: Login screen wired to /api/auth/login, token stored (memory/localStorage), an auth guard on protected routes, a simple Business Profile settings screen.   │
│                                                                                                                                                                      │
│ Verify: log in with a seeded user, get redirected to Dashboard shell; edit business profile and reload to confirm persistence.                                       │
│                                                                                                                                                                      │
│ ---                                                                                                                                                                  │
│                                                                                                                                                                      │
│ Phase 2 — Catalog: Services & Packages (FR-005, FR-006)                                                                                                              │
│                                                                                                                                                                      │
│ Backend: ServicesModule (CRUD, active/inactive toggle) and PackagesModule (CRUD, active/inactive, PackageService join entity with quantity-per-service). Enforce: inactive items can't be newly selected elsewhere later (rule enforced when Proposals consume this in Phase 4).                                                       │
│                                                                                                                                                                      │
│ Frontend: Service Manager screen (list/create/edit/deactivate) and Package Manager screen (create/edit package, attach services with quantity, set package price, activate/deactivate).                                                                                                                                                │
│                                                                                                                                                                      │
│ Verify: create the example catalog from the spec (Candid Photography, Drone, etc.) and a Gold/Silver/Platinum package referencing them; deactivate one and confirm it disappears from "available" lists but the package config is unaffected.                                                                                           │
│                                                                                                                                                                      │
│ ---                                                                                                                                                                  │
│                                                                                                                                                                      │
│ Phase 3 — Customers (FR-003)                                                                                                                                         │
│                                                                                                                                                                      │
│ Backend: CustomersModule — CRUD + search by name/phone. Validation: name & phone required, email optional-but-validated.                                             │
│                                                                                                                                                                      │
│ Frontend: Customer list/search + create/edit form, reusable from the proposal-creation flow later.                                                                   │
│                                                                                                                                                                      │
│ Verify: create a customer, search for them by partial name/phone.                                                                                                    │
│                                                                                                                                                                      │
│ ---                                                                                                                                                                  │
│                                                                                                                                                                      │
│ Phase 4 — Proposal Core: Data Model & Creation (FR-004, FR-007, FR-008, FR-009, FR-010)                                                                              │
│                                                                                                                                                                      │
│ This is the structural heart of the MVP — get the schema right before building pricing/PDF on top of it.                                                             │
│                                                                                                                                                                      │
│ Backend: ProposalsModule with entities Proposal, ProposalPackage, ProposalItem (SRS §6). POST /api/proposals accepts customer, wedding date/location, an array of {package_id, quantity} and {service_id, quantity, is_optional}. On creation:                                                                                         │
│ - Look up current package/service name+price server-side (never trust client-sent prices).                                                                           │
│ - Snapshot name/description/price onto ProposalPackage/ProposalItem rows (SRS §14 — non-negotiable).                                                                 │
│ - Generate a unique proposal number (WP-YYYY-NNNN).                                                                                                                  │
│ - Status defaults to DRAFT.                                                                                                                                          │
│ - GET/PUT /api/proposals/:id for editing while in DRAFT (FR-014).                                                                                                    │
│                                                                                                                                                                      │
│ Frontend: multi-section Create Proposal screen — Customer select/create, Wedding details, Package selection (multi-add), Individual services, Optional services toggle — matching SRS §10.2 layout. No pricing math on the frontend yet (stub subtotal display, real numbers arrive in Phase 5).                                     │
│                                                                                                                                                                      │
│ Verify: run the SRS §20 acceptance scenario up through "adds optional service" — create a proposal with 2 packages + 1 service + 1 optional service, reload it, confirm snapshotted values don't change if you later edit the source package's price.                                                                                │
│                                                                                                                                                                      │
│ ---                                                                                                                                                                  │
│                                                                                                                                                                      │
│ Phase 5 — Pricing Engine (FR-011, FR-012, FR-013)                                                                                                                    │
│                                                                                                                                                                      │
│ Backend: isolated PricingModule/PricingService (no controller dependency — pure calculation, unit-testable), implementing the SRS §17 pseudocode:                    │
│ packageTotal → serviceTotal (excluding optional) → subtotal                                                                                                          │
│ → discount (fixed | percentage, clamped so total never goes negative)                                                                                                │
│ → tax (business-configured rate, default 0%)                                                                                                                         │
│ → final total                                                                                                                                                        │
│ Wire it into POST /api/proposals/:id/calculate and into proposal create/update so subtotal, discount_amount, tax_amount, total are always persisted server-side.     │
│                                                                                                                                                                      │
│ Frontend: pricing summary panel (subtotal/discount/tax/total) fed by the backend response — add discount type/value input and tax display.                           │
│                                                                                                                                                                      │
│ Verify: unit tests for the pricing service covering: multiple packages, mixed optional/included items, percentage vs fixed discount, discount that would otherwise exceed subtotal (clamped at 0), 0% tax default. Manually confirm the SRS §11 discount example (₹1,20,000 − 10% → ₹1,08,000).                                         │
│                                                                                                                                                                      │
│ ---                                                                                                                                                                  │
│                                                                                                                                                                      │
│ Phase 6 — Proposal Preview & Editing Polish (FR-014, FR-015)                                                                                                         │
│                                                                                                                                                                      │
│ Backend: ensure PUT /api/proposals/:id re-runs pricing and rejects edits when status isn't DRAFT (or documents the MVP's simpler rule if not enforced yet).          │
│                                                                                                                                                                      │
│ Frontend: dedicated Proposal Preview screen assembling business info + customer + wedding details + packages + services + optional services + pricing breakdown + terms, matching what the PDF will render (Phase 7) so preview and PDF never diverge. "Save Draft" and "Preview" actions per SRS §10.2 Section 7.                     │
│                                                                                                                                                                      │
│ Verify: edit a draft (add/remove a service, change discount), confirm totals recalculate; confirm preview layout matches SRS §15 field list.                         │
│                                                                                                                                                                      │
│ ---                                                                                                                                                                  │
│                                                                                                                                                                      │
│ Phase 7 — PDF Generation (FR-016)                                                                                                                                    │
│                                                                                                                                                                      │
│ Backend: separate PdfModule/PdfService (decoupled from ProposalsService per SRS §15 Maintainability) rendering one template (business logo/header, customer, wedding details, packages, services, optional services, pricing, terms — SRS §18 page structure). POST /api/proposals/:id/generate-pdf returns a downloadable file.          │
│                                                                                                                                                                      │
│ Frontend: "Generate PDF" / "Download PDF" action on the Preview screen.                                                                                              │
│                                                                                                                                                                      │
│ Verify: generate a PDF for the acceptance-scenario proposal, confirm all required fields render and long descriptions don't break layout.                            │
│                                                                                                                                                                      │
│ ---                                                                                                                                                                  │
│                                                                                                                                                                      │
│ Phase 8 — Proposal History, Status, Dashboard (FR-017, FR-018, FR-019)                                                                                               │
│                                                                                                                                                                      │
│ Backend: GET /api/proposals with customer-name/status filters; PATCH /api/proposals/:id/status (DRAFT → SENT → ACCEPTED/REJECTED, manual transitions per SRS §18).   │
│                                                                                                                                                                      │
│ Frontend: Proposal History screen (list, search, status filter, open-to-edit for drafts) and Dashboard screen (counts by status + recent proposals + "New Proposal" primary action, per SRS §10.1).                                                                                                                                      │
│                                                                                                                                                                      │
│ Verify: run the full SRS §20 acceptance scenario end-to-end: create → price → preview → PDF → mark SENT → find it in history.                                        │
│                                                                                                                                                                      │
│ ---                                                                                                                                                                  │
│                                                                                                                                                                      │
│ Phase 9 — Hardening Pass                                                                                                                                             │
│                                                                                                                                                                      │
│ Backend: fill in remaining validation gaps (SRS §11), confirm business_id scoping is applied consistently across every query (SRS §13 Authorization — no cross-business leakage even though MVP has one business per account), consistent error codes, basic rate/auth guards on all routes.                                  │
│                                                                                                                                                                      │
│ Frontend: replace raw error responses with the user-friendly messages SRS §12 requires; loading/empty states on each list screen.                                    │
│                                                                                                                                                                      │
│ Verify: re-run the full acceptance scenario; confirm the MVP Definition of Done checklist (SRS §21) is satisfied.                                                    │
│                                                                                                                                                                      │
│ ---                                                                                                                                                                  │
│                                                                                                                                                                      │
│ Notes for execution                                                                                                                                                  │
│                                                                                                                                                                      │
│ - Each phase should land as its own reviewable chunk of work — don't jump ahead to PDF/pricing details while still in Phase 0-3 scaffolding.                         │
│ - Phase 4 (data model) is the riskiest to get wrong later — the plan front-loads it before pricing/PDF so both can build on a correct snapshot-based schema.         │
│ - No AI requirement-extraction, payments, CRM, or multi-language work belongs in any of these phases (out of scope per CLAUDE.md).