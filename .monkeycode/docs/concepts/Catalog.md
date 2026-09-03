# Catalog (Service and Package)

Sellable photography offerings. Services have dual pricing; packages have a set price and a many-to-many of services with quantity.

## What is the catalog?

Business-scoped. Deactivate rather than hard-delete so FKs from `package_services` and proposal children remain valid.

**Key traits**:
- Service: `perDayPrice`, `flatPrice`, `active`, optional `category`
- Package: `price`, `active`, `package_services (packageId, serviceId)` unique
- Attach service: `findOnePackage` **and** `findOneService` same `businessId` then `onConflictDoUpdate`
- List filters `?active=`

## Code locations

| Aspect | Location |
|--------|----------|
| Service logic | `services/catalog-services.ts`, `services/packages.ts` |
| UI | `Services.tsx`, `Packages.tsx`, `PackageDetail.tsx` |
| Types | `frontend/src/types/catalog.ts` |

## Invariants

1. Do not attach another tenant's service to a package.
2. Inactive catalog items must not be **newly** added to proposals (existing draft lines may stay).
