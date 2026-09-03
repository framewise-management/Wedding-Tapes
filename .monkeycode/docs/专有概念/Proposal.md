# Proposal

A quotation for one customer’s wedding, with snapshotted packages and services, server-computed totals, and optional PDF export.

## 什么是 Proposal？

Owned by a `business`, points at a `customer`. Holds wedding metadata, discount/tax, and two child collections: `proposal_packages` and `proposal_items`.

**关键特征**:
- Number format `WP-{year}-{4-digit}` unique per business (count-based; not concurrency-safe)
- Status starts `DRAFT`
- PUT and calculate only while `DRAFT` (Conflict otherwise)
- Optional items excluded from subtotal
- Tax on **post-discount** amount (SRS §17)

## 代码位置

| 方面 | 位置 |
|------|------|
| 模型 | `backend/src/db/schema.ts` (`proposals`, `proposalPackages`, `proposalItems`) |
| 服务 | `backend/src/services/proposals.ts` |
| 路由 | `backend/src/routes/proposals.ts` |
| Zod | `backend/src/schemas/proposals.ts` |
| 定价 | `backend/src/pricing.ts` |
| PDF | `backend/src/pdf.ts` |
| UI | `CreateProposal.tsx`, `ProposalPreview.tsx`, `ProposalHistory.tsx` |
| 类型 | `frontend/src/types/proposal.ts` |

## 关键字段

| 字段 | 描述 |
|------|------|
| `proposalNumber` | human id |
| `weddingDate` / `weddingLocation` / `numberOfDays` | event |
| `status` | DRAFT, SENT, ACCEPTED, REJECTED |
| `subtotal`, `discountType`, `discountValue`, `discountAmount`, `taxRate`, `taxAmount`, `total` | persisted pricing |
| snapshot cols on children | `packageName`, `unitPrice`, `serviceName`, `priceType`, `isOptional` |

## 不变量

1. **Snapshot**: totals use child `unitPrice`, never live catalog prices.
2. **Tenant**: all finds filter `businessId`.
3. **Optional**: `isOptional` lines omitted from `calculatePricing` service total.
4. **Discount clamp**: `[0, subtotal]`.
5. **Re-activation**: when replacing lines on a draft, existing attached inactive catalog rows may remain; **new** adds must be active.

## 生命周期

```mermaid
stateDiagram-v2
    [*] --> DRAFT: createProposal
    DRAFT --> SENT: PATCH status
    DRAFT --> DRAFT: PUT / calculate
    SENT --> ACCEPTED: PATCH status
    SENT --> REJECTED: PATCH status
    ACCEPTED --> [*]
    REJECTED --> [*]
```

Exact allowed transitions are whatever `updateProposalStatus` currently permits — read that function before documenting extra edges.

## 关系

```mermaid
erDiagram
    businesses ||--o{ proposals : owns
    customers ||--o{ proposals : receives
    proposals ||--o{ proposal_packages : snapshots
    proposals ||--o{ proposal_items : snapshots
    packages ||--o{ proposal_packages : source
    services ||--o{ proposal_items : source
```
