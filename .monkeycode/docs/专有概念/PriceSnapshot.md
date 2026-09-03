# Price snapshot

When a package or service is attached to a proposal, name, description, and unit price are copied onto `proposal_packages` / `proposal_items`. Later catalog edits must not change existing proposals (SRS §14, FR-007/008).

## 什么是 Price snapshot？

Implemented in `resolvePackageSnapshot` / `resolveItemSnapshot` inside `backend/src/services/proposals.ts`.

**关键特征**:
- Client-sent prices are ignored
- `priceType` on items is `per_day` or `flat`; if omitted, prefer per-day when the service has `perDayPrice`, else flat
- Package `price` is a single integer on the catalog package
- Frontend may show numbers for UX but must not submit a trusted `total`

## 代码位置

| 方面 | 位置 |
|------|------|
| 解析 | `services/proposals.ts` |
| 公式 | `pricing.ts` `calculatePricing` |
| 持久化 | `persistPricing()` |

## 不变量

1. Reading `packages.price` or `services.perDayPrice` at PDF/render time for money is a bug.
2. `createProposal` inserts parent + children in one `db.transaction`.
