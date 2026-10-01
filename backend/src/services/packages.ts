import { and, eq } from 'drizzle-orm';
import { db } from '../db/client';
import { packages, packageServices } from '../db/schema';
import { isPgError } from '../db/pg-error';
import { ConflictError, NotFoundError } from '../lib/http-error';
import { catalogServiceService } from './catalog-services';
import type { AddPackageServiceInput, CreatePackageInput, UpdatePackageInput } from '../schemas/packages';

export class PackageService {
  findAll(businessId: string, active?: boolean) {
    return db.query.packages.findMany({
      where: and(
        eq(packages.businessId, businessId),
        active !== undefined ? eq(packages.active, active) : undefined,
      ),
      with: { items: { with: { service: true } } },
    });
  }

  async findOne(businessId: string, id: string) {
    const pkg = await db.query.packages.findFirst({
      where: and(eq(packages.id, id), eq(packages.businessId, businessId)),
      with: { items: { with: { service: true } } },
    });
    if (!pkg) throw new NotFoundError('Package not found');
    return pkg;
  }

  async create(businessId: string, input: CreatePackageInput) {
    const serviceInputs = input.services ?? [];
    await Promise.all(serviceInputs.map((s) => catalogServiceService.findOne(businessId, s.serviceId)));

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

    return this.findOne(businessId, newId);
  }

  async update(businessId: string, id: string, input: UpdatePackageInput) {
    await this.findOne(businessId, id);
    await db
      .update(packages)
      .set(input)
      .where(and(eq(packages.id, id), eq(packages.businessId, businessId)));
    return this.findOne(businessId, id);
  }

  async remove(businessId: string, id: string) {
    await this.findOne(businessId, id);
    try {
      await db.delete(packages).where(and(eq(packages.id, id), eq(packages.businessId, businessId)));
    } catch (err) {
      if (isPgError(err, '23503')) {
        throw new ConflictError('Cannot delete a package that is used in a proposal');
      }
      throw err;
    }
  }

  async addService(businessId: string, packageId: string, input: AddPackageServiceInput) {
    await this.findOne(businessId, packageId);
    await catalogServiceService.findOne(businessId, input.serviceId); // tenant ownership check

    await db
      .insert(packageServices)
      .values({ packageId, serviceId: input.serviceId, quantity: input.quantity })
      .onConflictDoUpdate({
        target: [packageServices.packageId, packageServices.serviceId],
        set: { quantity: input.quantity },
      });

    return this.findOne(businessId, packageId);
  }

  async removeService(businessId: string, packageId: string, serviceId: string) {
    await this.findOne(businessId, packageId);
    const existing = await db.query.packageServices.findFirst({
      where: and(eq(packageServices.packageId, packageId), eq(packageServices.serviceId, serviceId)),
    });
    if (!existing) {
      throw new NotFoundError('Service is not part of this package');
    }
    await db.delete(packageServices).where(eq(packageServices.id, existing.id));
    return this.findOne(businessId, packageId);
  }
}

export const packageService = new PackageService();
