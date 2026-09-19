import { and, asc, eq } from 'drizzle-orm';
import { db } from '../db/client';
import { terms } from '../db/schema';
import { NotFoundError } from '../lib/http-error';
import type { CreateTermInput, UpdateTermInput } from '../schemas/terms';

export function findAllTerms(businessId: string, active?: boolean) {
  return db.query.terms.findMany({
    where: and(
      eq(terms.businessId, businessId),
      active !== undefined ? eq(terms.active, active) : undefined,
    ),
    orderBy: asc(terms.createdAt),
  });
}

export async function findOneTerm(businessId: string, id: string) {
  const term = await db.query.terms.findFirst({
    where: and(eq(terms.id, id), eq(terms.businessId, businessId)),
  });
  if (!term) throw new NotFoundError('Term not found');
  return term;
}

export async function createTerm(businessId: string, input: CreateTermInput) {
  const [term] = await db
    .insert(terms)
    .values({ ...input, businessId })
    .returning();
  return term;
}

export async function updateTerm(businessId: string, id: string, input: UpdateTermInput) {
  await findOneTerm(businessId, id);
  await db
    .update(terms)
    .set(input)
    .where(and(eq(terms.id, id), eq(terms.businessId, businessId)));
  return findOneTerm(businessId, id);
}

export async function removeTerm(businessId: string, id: string) {
  await findOneTerm(businessId, id);
  await db.delete(terms).where(and(eq(terms.id, id), eq(terms.businessId, businessId)));
}
