import { and, eq } from 'drizzle-orm';
import type { Db } from '../db/client';
import { services } from '../db/schema';
import { isPgError } from '../db/pg-error';
import { ConflictError, NotFoundError } from '../lib/http-error';
import type { CreateServiceInput, UpdateServiceInput } from '../schemas/services';

export class CatalogServiceService {
  constructor(
    private readonly db: Db,
  ) {}

  findAll(businessId: string, active?: boolean) {
    return this.db.query.services.findMany({
      where: and(
        eq(services.businessId, businessId),
        active !== undefined ? eq(services.active, active) : undefined,
      ),
    });
  }

  async findOne(businessId: string, id: string) {
    const service = await this.db.query.services.findFirst({
      where: and(eq(services.id, id), eq(services.businessId, businessId)),
    });
    if (!service) throw new NotFoundError('Service not found');
    return service;
  }

  async create(businessId: string, input: CreateServiceInput) {
    const [service] = await this.db
      .insert(services)
      .values({ ...input, businessId })
      .returning();
    return service;
  }

  async update(businessId: string, id: string, input: UpdateServiceInput) {
    await this.findOne(businessId, id);
    await this.db
      .update(services)
      .set(input)
      .where(and(eq(services.id, id), eq(services.businessId, businessId)));
    return this.findOne(businessId, id);
  }

  async remove(businessId: string, id: string) {
    await this.findOne(businessId, id);
    try {
      await this.db.delete(services).where(and(eq(services.id, id), eq(services.businessId, businessId)));
    } catch (err) {
      if (isPgError(err, '23503')) {
        throw new ConflictError('Cannot delete a service that is part of a package');
      }
      throw err;
    }
  }
}

