# Price snapshot

When a package or service is attached to a proposal, name, description, and unit price are copied onto `proposal_packages` / `proposal_items`. Later catalog edits must not change existing proposals (SRS §14, FR-007/008).

## What is a price snapshot?

Implemented in `resolvePackageSnapshot` / `resolveItemSnapshot` inside `backend/src/services/proposals.ts`.

**Key traits**:
- Client-sent prices are ignored
- `priceType` on items is `per_day` or `flat`; if omitted, prefer per-day when the service has `perDayPrice`, else flat
- Package `price` is a single integer on the catalog package
- Frontend may show numbers for UX but must not submit a trusted `total`

## Code locations

| Aspect | Location |
|--------|----------|
| Resolve | `services/proposals.ts` |
| Formula | `pricing.ts` `calculatePricing` |
| Persist | `persistPricing()` |

## Invariants

1. Reading `packages.price` or `services.perDayPrice` at PDF/render time for money is a bug.
2. `createProposal` inserts parent + children in one `db.transaction`.
