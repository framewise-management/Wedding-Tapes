import { and, eq } from 'drizzle-orm';
import { db } from '../db/client';
import { services } from '../db/schema';
import { isPgError } from '../db/pg-error';
import { BadRequestError, ConflictError, NotFoundError } from '../lib/http-error';
import type { CreateServiceInput, UpdateServiceInput } from '../schemas/services';

export function findAllServices(businessId: string, active?: boolean) {
  return db.query.services.findMany({
    where: and(
      eq(services.businessId, businessId),
      active !== undefined ? eq(services.active, active) : undefined,
    ),
  });
}

export async function findOneService(businessId: string, id: string) {
  const service = await db.query.services.findFirst({
    where: and(eq(services.id, id), eq(services.businessId, businessId)),
  });
  if (!service) throw new NotFoundError('Service not found');
  return service;
}

export async function createService(businessId: string, input: CreateServiceInput) {
  if (input.perDayPrice === undefined && input.flatPrice === undefined) {
    throw new BadRequestError('Set a per-day price, a flat price, or both');
  }
  const [service] = await db
    .insert(services)
    .values({ ...input, businessId })
    .returning();
  return service;
}

export async function updateService(businessId: string, id: string, input: UpdateServiceInput) {
  await findOneService(businessId, id);
  await db
    .update(services)
    .set(input)
    .where(and(eq(services.id, id), eq(services.businessId, businessId)));
  return findOneService(businessId, id);
}

export async function removeService(businessId: string, id: string) {
  await findOneService(businessId, id);
  try {
    await db.delete(services).where(and(eq(services.id, id), eq(services.businessId, businessId)));
  } catch (err) {
    if (isPgError(err, '23503')) {
      throw new ConflictError('Cannot delete a service that is part of a package');
    }
    throw err;
  }
}
