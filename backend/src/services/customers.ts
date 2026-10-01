import { and, asc, eq, ilike, or } from 'drizzle-orm';
import { db } from '../db/client';
import { customers } from '../db/schema';
import { isPgError } from '../db/pg-error';
import { ConflictError, NotFoundError } from '../lib/http-error';
import type { CreateCustomerInput, UpdateCustomerInput } from '../schemas/customers';

export class CustomerService {
  findAll(businessId: string, search?: string) {
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

  async findOne(businessId: string, id: string) {
    const customer = await db.query.customers.findFirst({
      where: and(eq(customers.id, id), eq(customers.businessId, businessId)),
    });
    if (!customer) throw new NotFoundError('Customer not found');
    return customer;
  }

  async create(businessId: string, input: CreateCustomerInput) {
    const [customer] = await db
      .insert(customers)
      .values({ ...input, businessId })
      .returning();
    return customer;
  }

  async update(businessId: string, id: string, input: UpdateCustomerInput) {
    await this.findOne(businessId, id);
    await db
      .update(customers)
      .set(input)
      .where(and(eq(customers.id, id), eq(customers.businessId, businessId)));
    return this.findOne(businessId, id);
  }

  async remove(businessId: string, id: string) {
    await this.findOne(businessId, id);
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
}

export const customerService = new CustomerService();
