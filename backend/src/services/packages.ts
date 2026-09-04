import { and, eq } from 'drizzle-orm';
import { db } from '../db/client';
import { packages, packageServices } from '../db/schema';
import { isPgError } from '../db/pg-error';
import { ConflictError, NotFoundError } from '../lib/http-error';
import { findOneService } from './catalog-services';
import type { AddPackageServiceInput, CreatePackageInput, UpdatePackageInput } from '../schemas/packages';

export function findAllPackages(businessId: string, active?: boolean) {
  return db.query.packages.findMany({
    where: and(
      eq(packages.businessId, businessId),
      active !== undefined ? eq(packages.active, active) : undefined,
    ),
    with: { items: { with: { service: true } } },
  });
}

export async function findOnePackage(businessId: string, id: string) {
  const pkg = await db.query.packages.findFirst({
    where: and(eq(packages.id, id), eq(packages.businessId, businessId)),
    with: { items: { with: { service: true } } },
  });
  if (!pkg) throw new NotFoundError('Package not found');
  return pkg;
}

export async function createPackage(businessId: string, input: CreatePackageInput) {
  const serviceInputs = input.services ?? [];
  await Promise.all(serviceInputs.map((s) => findOneService(businessId, s.serviceId)));

  const newId = await db.transaction(async (tx) => {
    const [pkg] = await tx
      .insert(packages)
      .values({ name: input.name, description: input.description, price: input.price, businessId })
      .returning();
    if (serviceInputs.length) {
      await tx
        .insert(packageServices)
        .values(serviceInputs.map((s) => ({ packageId: pkg.id, serviceId: s.serviceId, quantity: s.quantity })));
    }
    return pkg.id;
  });

  return findOnePackage(businessId, newId);
}

export async function updatePackage(businessId: string, id: string, input: UpdatePackageInput) {
  await findOnePackage(businessId, id);
  await db
    .update(packages)
    .set(input)
    .where(and(eq(packages.id, id), eq(packages.businessId, businessId)));
  return findOnePackage(businessId, id);
}

export async function removePackage(businessId: string, id: string) {
  await findOnePackage(businessId, id);
  try {
    await db.delete(packages).where(and(eq(packages.id, id), eq(packages.businessId, businessId)));
  } catch (err) {
    if (isPgError(err, '23503')) {
      throw new ConflictError('Cannot delete a package that is used in a proposal');
    }
    throw err;
  }
}

export async function addPackageService(
  businessId: string,
  packageId: string,
  input: AddPackageServiceInput,
) {
  await findOnePackage(businessId, packageId);
  await findOneService(businessId, input.serviceId); // tenant ownership check

  await db
    .insert(packageServices)
    .values({ packageId, serviceId: input.serviceId, quantity: input.quantity })
    .onConflictDoUpdate({
      target: [packageServices.packageId, packageServices.serviceId],
      set: { quantity: input.quantity },
    });

  return findOnePackage(businessId, packageId);
}

export async function removePackageService(
  businessId: string,
  packageId: string,
  serviceId: string,
) {
  await findOnePackage(businessId, packageId);
  const existing = await db.query.packageServices.findFirst({
    where: and(eq(packageServices.packageId, packageId), eq(packageServices.serviceId, serviceId)),
  });
  if (!existing) {
    throw new NotFoundError('Service is not part of this package');
  }
  await db.delete(packageServices).where(eq(packageServices.id, existing.id));
  return findOnePackage(businessId, packageId);
}
