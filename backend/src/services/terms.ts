import { and, asc, eq } from 'drizzle-orm';
import { db } from '../db/client';
import { terms } from '../db/schema';
import { NotFoundError } from '../lib/http-error';
import type { CreateTermInput, UpdateTermInput } from '../schemas/terms';

export class TermService {
  findAll(businessId: string, active?: boolean) {
    return db.query.terms.findMany({
      where: and(
        eq(terms.businessId, businessId),
        active !== undefined ? eq(terms.active, active) : undefined,
      ),
      orderBy: asc(terms.createdAt),
    });
  }

  async findOne(businessId: string, id: string) {
    const term = await db.query.terms.findFirst({
      where: and(eq(terms.id, id), eq(terms.businessId, businessId)),
    });
    if (!term) throw new NotFoundError('Term not found');
    return term;
  }

  async create(businessId: string, input: CreateTermInput) {
    const [term] = await db
      .insert(terms)
      .values({ ...input, businessId })
      .returning();
    return term;
  }

  async update(businessId: string, id: string, input: UpdateTermInput) {
    await this.findOne(businessId, id);
    await db
      .update(terms)
      .set(input)
      .where(and(eq(terms.id, id), eq(terms.businessId, businessId)));
    return this.findOne(businessId, id);
  }

  async remove(businessId: string, id: string) {
    await this.findOne(businessId, id);
    await db.delete(terms).where(and(eq(terms.id, id), eq(terms.businessId, businessId)));
  }
}

export const termService = new TermService();
