# Catalog (Service and Package)

Sellable photography offerings. Services have dual pricing; packages have a set price and a many-to-many of services with quantity.

## 什么是 Catalog？

Business-scoped. Deactivate rather than hard-delete so FKs from `package_services` and proposal children remain valid.

**关键特征**:
- Service: `perDayPrice`, `flatPrice`, `active`, optional `category`
- Package: `price`, `active`, `package_services (packageId, serviceId)` unique
- Attach service: `findOnePackage` **and** `findOneService` same `businessId` then `onConflictDoUpdate`
- List filters `?active=`

## 代码位置

| 方面 | 位置 |
|------|------|
| 服务逻辑 | `services/catalog-services.ts`, `services/packages.ts` |
| UI | `Services.tsx`, `Packages.tsx`, `PackageDetail.tsx` |
| 类型 | `frontend/src/types/catalog.ts` |

## 不变量

1. Do not attach another tenant’s service to a package.
2. Inactive catalog items must not be **newly** added to proposals (existing draft lines may stay).
