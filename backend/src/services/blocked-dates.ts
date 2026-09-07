import { and, asc, eq } from 'drizzle-orm';
import { db } from '../db/client';
import { blockedDates } from '../db/schema';
import { isPgError } from '../db/pg-error';
import { ConflictError, NotFoundError } from '../lib/http-error';
import type { CreateBlockedDateInput } from '../schemas/blocked-dates';

export function findAllBlockedDates(businessId: string) {
  return db.query.blockedDates.findMany({
    where: eq(blockedDates.businessId, businessId),
    orderBy: asc(blockedDates.date),
  });
}

export async function createBlockedDate(businessId: string, input: CreateBlockedDateInput) {
  try {
    const [row] = await db
      .insert(blockedDates)
      .values({ businessId, date: input.date, reason: input.reason ?? null })
      .returning();
    return row;
  } catch (err) {
    if (isPgError(err, '23505')) {
      throw new ConflictError('This date is already blocked');
    }
    throw err;
  }
}

export async function removeBlockedDate(businessId: string, id: string) {
  const existing = await db.query.blockedDates.findFirst({
    where: and(eq(blockedDates.id, id), eq(blockedDates.businessId, businessId)),
  });
  if (!existing) throw new NotFoundError('Blocked date not found');
  await db
    .delete(blockedDates)
    .where(and(eq(blockedDates.id, id), eq(blockedDates.businessId, businessId)));
}
