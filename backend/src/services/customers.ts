import { and, asc, eq, ilike, or } from 'drizzle-orm';
import { db } from '../db/client';
import { customers } from '../db/schema';
import { isPgError } from '../db/pg-error';
import { ConflictError, NotFoundError } from '../lib/http-error';
import type { CreateCustomerInput, UpdateCustomerInput } from '../schemas/customers';

export function findAllCustomers(businessId: string, search?: string) {
  return db.query.customers.findMany({
    where: search
      ? and(
          eq(customers.businessId, businessId),
          or(ilike(customers.name, `%${search}%`), ilike(customers.phone, `%${search}%`)),
        )
      : eq(customers.businessId, businessId),
    orderBy: asc(customers.name),
  });
}

export async function findOneCustomer(businessId: string, id: string) {
  const customer = await db.query.customers.findFirst({
    where: and(eq(customers.id, id), eq(customers.businessId, businessId)),
  });
  if (!customer) throw new NotFoundError('Customer not found');
  return customer;
}

export async function createCustomer(businessId: string, input: CreateCustomerInput) {
  const [customer] = await db
    .insert(customers)
    .values({ ...input, businessId })
    .returning();
  return customer;
}

export async function updateCustomer(
  businessId: string,
  id: string,
  input: UpdateCustomerInput,
) {
  await findOneCustomer(businessId, id);
  await db
    .update(customers)
    .set(input)
    .where(and(eq(customers.id, id), eq(customers.businessId, businessId)));
  return findOneCustomer(businessId, id);
}

export async function removeCustomer(businessId: string, id: string) {
  await findOneCustomer(businessId, id);
  try {
    await db
      .delete(customers)
      .where(and(eq(customers.id, id), eq(customers.businessId, businessId)));
  } catch (err) {
    if (isPgError(err, '23503')) {
      throw new ConflictError('Cannot delete a customer with existing proposals');
    }
    throw err;
  }
}
