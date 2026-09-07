# Plan — Multi-event (multi-day) proposals

## What we're building

A business sets up its own list of event names (Haldi, Mehndi, Sangeet, Wedding, Engagement,
Birthday, Anniversary, …). When creating a proposal the salesperson picks one or more of those
events, gives each a date and location, and attaches packages/services to a specific event.
Everything — screen, PDF, share sheet — renders the events **ordered by date**.

Non-goal: per-day price multiplication. Services are attached per event explicitly, so a
2-day shoot is two line rows, not `price × days`. The pricing engine (`src/pricing.ts`) is
**not touched** — `pnpm run test` passing unchanged is the proof.

---

## Design decisions (and why)

**1. Event names are a catalog table, not free text.**
`event_types` mirrors `services` exactly (business-scoped, `active` flag, no delete when
referenced). Same file shape: `db/schema.ts` + `services/event-types.ts` +
`routes/event-types.ts` + `schemas/event-types.ts`.
*Skipped:* free-text field with a `datalist` of previously-used names — zero tables, zero
CRUD screen. Rejected only because "user can set up event names" was an explicit ask.

**2. The event name is snapshotted onto the proposal.**
`proposal_events.name` is copied at write time, same discipline as price snapshotting
(SRS §14). Renaming "Haldi" in the catalog must never rewrite an old proposal.
Consequence: `event_type_id` can be nullable — a deactivated/deleted type doesn't break history.

**3. `proposals.weddingDate` / `weddingLocation` survive, as derived fields.**
`weddingDate` = earliest event date, `weddingLocation` = that event's location, plus a new
nullable `wedding_end_date` = latest event date. `numberOfDays` = count of distinct event dates.
This is the single biggest laziness win in the plan: `Calendar.tsx`, `ProposalHistory.tsx`,
`ProposalSheet.tsx`, `pdf.ts`, the ICS feed, Google sync and Apple sync all keep working
with **zero** changes, and no backfill is needed for the ~existing proposals (they simply have
no `proposal_events` rows). Events are additive and optional throughout.

**4. Line items get a *nullable* `proposal_event_id`.**
`NULL` = "applies to the whole proposal" (covers "add services to all events" as one row);
a set value = "this event only". One nullable column covers both readings and leaves every
existing row valid. `ON DELETE SET NULL` from `proposal_events` — **changed from CASCADE
during Phase 3**: every save replaces the whole event set, so cascading would delete each
line item attached to an event on every edit. SET NULL means the worst case is a line falling
back to "all events" instead of vanishing, and the form resends assignments anyway.

**5. Calendar stays one event per proposal, spanning min→max date.**
`DTSTART = earliest`, `DTEND = latest + 1`. Three small edits instead of a per-event sync.
*Ceiling:* different venues on different days show as one block. Upgrade path if that matters:
one VEVENT per `proposal_event`, which needs `google_event_id` to move off `proposals` onto
`proposal_events`.

---

## Schema

```
event_types
  id            uuid pk
  business_id   uuid fk -> businesses (cascade)
  name          varchar not null
  active        boolean default true not null
  created_at / updated_at   (updated_at needs .$onUpdate(() => sql`now()`))

proposal_events
  id             uuid pk
  proposal_id    uuid fk -> proposals (cascade) not null
  event_type_id  uuid fk -> event_types (no action) nullable
  name           varchar not null        -- snapshot
  date           date not null
  location       varchar nullable        -- falls back to proposals.weddingLocation
  created_at

proposals
  + wedding_end_date  date nullable      -- derived: latest event date

proposal_packages
  + proposal_event_id uuid fk -> proposal_events (cascade) nullable

proposal_items
  + proposal_event_id uuid fk -> proposal_events (cascade) nullable
```

No `sort_order` column — ordering is `ORDER BY date, created_at`, per the requirement.

---

## Phase 1 — Event types catalog

**Backend** (all four files copy the `services` shape verbatim):
- `db/schema.ts`: `eventTypes` table + relations (`businesses.eventTypes`, `eventTypes.business`).
- `schemas/event-types.ts`: `createEventTypeSchema` (`name` required), `updateEventTypeSchema`,
  `listEventTypesQuerySchema` (reuse `booleanQueryParam` from `schemas/common.ts` for `?active`).
- `services/event-types.ts`: `findAllEventTypes` / `findOneEventType` / `create` / `update` /
  `removeEventType` — the delete catches `isPgError(err, '23503')` → `ConflictError`
  ("Cannot delete an event type used by a proposal").
- `routes/event-types.ts` + `app.route('/api/event-types', eventTypesRoutes)` in `index.ts`.
- `services/auth.ts` `signup()`: inside the existing `db.transaction`, insert the default names
  (Haldi, Mehndi, Sangeet, Engagement, Wedding, Reception, Anniversary, Birthday) for the new
  business. Add the same to `src/seed.ts`.
- `pnpm run db:generate` → `db:migrate`.

**Frontend:** a section on the existing `pages/BusinessProfile.tsx` — add/rename/deactivate
in a simple list. *Skipped:* a dedicated route + nav entry; add one if the list grows past a
handful of names.

**Verify:** `POST /api/event-types` then `GET /api/event-types?active=true`; a fresh `signup`
returns the 8 seeded defaults; deactivating one hides it from the create-proposal picker later.

---

## Phase 2 — Events on a proposal

**Backend:**
- `db/schema.ts`: `proposalEvents` table, `proposals.weddingEndDate`, relations
  (`proposals.events` many, `proposalEvents.proposal` one).
- `schemas/proposals.ts`: `proposalEventInputSchema = { eventTypeId: uuid().optional(),
  name: string().min(1), date: iso.date(), location: string().optional() }`;
  add `events: z.array(...).optional()` to create + update. `weddingDate` / `weddingLocation`
  become **optional** on create, with a `.refine()` requiring either `events` (non-empty) or both
  legacy fields — so old clients and the share/public route keep working.
- `services/proposals.ts`:
  - New exported pure helper, no DB:
    ```ts
    export function deriveEventFields(events: { date: string; location?: string | null }[]) {
      // sorted by date; returns { weddingDate, weddingEndDate, weddingLocation, numberOfDays }
    }
    ```
  - `createProposal`: resolve each event (validate `eventTypeId` belongs to the business via
    `findOneEventType` — same cross-tenant guard as `findOneService`; snapshot `name`), insert
    the `proposal_events` rows **inside the existing `db.transaction`**, and set the derived
    `weddingDate`/`weddingEndDate`/`weddingLocation`/`numberOfDays` from `deriveEventFields`.
  - `updateProposal`: `events` replaced only when the key is present, same
    include-to-replace rule as `packages`/`items`; re-derive after. Still DRAFT-only.
  - `RELATIONS` gains `events: true`, ordered by date — the relational query supports
    `with: { events: { orderBy: ... } }`, no join workaround needed here.
- `routes/proposals.ts`: unchanged (schemas carry the new field).

**Test:** `src/services/proposals.spec.ts` — 3 asserts on `deriveEventFields`: single event,
three out-of-order events (earliest wins, latest is the end, count = 3), duplicate dates
(`numberOfDays` counts distinct dates). Plain vitest, no DB, matching `pricing.spec.ts`.

**Frontend:**
- `types/proposal.ts`: `ProposalEvent` interface + `events: ProposalEvent[]` and
  `weddingEndDate: string | null` on `Proposal`.
- `pages/CreateProposal.tsx`: replace section 2's three inputs with an **Events** repeater —
  pick a name from the `event-types` dropdown (or type a custom one), `<input type="date">`,
  optional location; add/remove rows. Sort by date for display. `numberOfDays` input is deleted
  (now derived).

**Verify:** create a proposal with Haldi 12 Feb / Wedding 13 Feb / Reception 14 Feb entered
out of order; `GET` returns them date-ordered and `weddingDate=2026-02-12`,
`weddingEndDate=2026-02-14`, `numberOfDays=3`. An old single-date proposal still loads and edits.

---

## Phase 3 — Services & packages per event

**Backend:**
- `db/schema.ts`: `proposalEventId` on `proposalPackages` + `proposalItems` (ON DELETE SET NULL).
- `schemas/proposals.ts`: `eventIndex: z.number().int().min(0).optional()` on
  `proposalPackageInputSchema` / `proposalItemInputSchema` — an **index into the request's
  `events` array**, not a UUID, because on create the event rows don't exist yet. Omitted =
  applies to the whole proposal.
- `services/proposals.ts`: `resolvePackageSnapshot` / `resolveItemSnapshot` gain the resolved
  `proposalEventId`; validate the index is in range (`BadRequestError` otherwise). On create,
  insert events first inside the transaction so their ids are available for the child rows.
- Pricing: untouched. Optional-service exclusion and the per-item snapshot rules are unchanged.

**Frontend:** each selected package/service row gets a small event dropdown ("All events" +
the events currently on the form). Selected lines are keyed by a client-side row key rather
than by `serviceId`/`packageId` — without that the same service cannot sit on two events,
and the catalog "Add" button no longer hides an already-added entry. Grouping lines under
event headings is left to Phase 4's rendering work; the per-row dropdown already shows the
assignment.

**Verify:** attach Candid Photography to Haldi and to Wedding (two rows), Drone to Wedding only;
subtotal = sum of all three; re-open the draft and the assignments round-trip. Deleting the
Haldi event drops its line and the total falls accordingly.

---

## Phase 4 — Rendering

- `pdf.ts`: `PdfProposal` gains `events`, `weddingEndDate` and `proposalEventId` on the line
  arrays. `renderWedding` prints the date-ordered event list (`Haldi — 18 March 2026` / venue)
  under an "Event Schedule" heading; `renderLineItems` takes a `group` per line and emits a
  sub-heading (`HALDI · 18 MAR`) whenever it changes, with unassigned lines under "All events"
  last. Section structure (Selected Packages / Services / Optional Services) is unchanged —
  grouping happens *inside* each section. A proposal with no event assignments renders exactly
  as before, guarded by `showGroups`. Both templates share the code path, so this is one edit.
- `components/ProposalSheet.tsx`: same treatment — event list + grouped line items. This is the
  share/preview view, so it must match the PDF.
- `services/calendar.ts`: `CalendarEvent` gains `weddingEndDate`; `eventLines` uses
  `DTEND = nextDay(weddingEndDate ?? weddingDate)`. `calendar.spec.ts` gets one case for a
  3-day span.
- `services/google-calendar.ts` `pushEvent`: same one-line change to `end.date`.
- `services/apple-calendar.ts`: no change (it renders through `renderEventDocument`).
- `pages/Calendar.tsx`: currently keys the month grid off `weddingDate` only. Change the mapping
  to fill every date in `weddingDate..weddingEndDate` so a 3-day wedding blocks 3 cells.
- `pages/ProposalHistory.tsx`: show `12–14 Feb` when there's an end date, else the single date.

**Verify:** generate a PDF for the 3-event proposal — events in date order, services grouped
under their event, totals identical to the on-screen figures. The ICS feed and Google event both
span 12→14 Feb. The Calendar page shades all three days.

---

## Blast radius

New: 4 backend files, 1 spec, 2 migrations.
Edited: `db/schema.ts`, `schemas/proposals.ts`, `services/proposals.ts`, `services/auth.ts`,
`seed.ts`, `index.ts`, `pdf.ts`, `services/calendar.ts`, `services/google-calendar.ts`,
`calendar.spec.ts` · frontend `types/proposal.ts`, `pages/CreateProposal.tsx`,
`pages/BusinessProfile.tsx`, `pages/Calendar.tsx`, `pages/ProposalHistory.tsx`,
`components/ProposalSheet.tsx`.
Untouched on purpose: `pricing.ts`, `packages.ts`, `customers.ts`, `catalog-services.ts`,
`apple-calendar.ts`, auth/JWT.

## Open calls — say the word and the plan changes

1. **Per-day pricing** (`services.perDayPrice` + `priceType: per_day|flat` came out of the schema
   at some point; the docs still mention it). Not in this plan — say so if a service should
   multiply by the number of days instead of being added per event.
2. **One calendar entry per event** rather than one span per proposal — needed only if different
   venues on different days must appear separately. Costs moving `google_event_id` to
   `proposal_events`.
3. **Event times** (Haldi 10am, Reception 7pm). Currently date-only, matching the existing
   all-day calendar model. Adding times turns every all-day VEVENT into a timed one.
