import { eq } from 'drizzle-orm';
import { db } from '../db/client';
import { businesses } from '../db/schema';
import { NotFoundError } from '../lib/http-error';
import type { UpdateBusinessInput } from '../schemas/business';

export async function getBusiness(businessId: string) {
  const business = await db.query.businesses.findFirst({
    where: eq(businesses.id, businessId),
  });
  if (!business) throw new NotFoundError('Business not found');
  // The stored iCloud app-specific password never leaves the server, not even
  // encrypted — the client only needs to know whether a connection exists.
  const { applePasswordEnc, calendarToken: _calendarToken, ...safe } = business;
  return {
    ...safe,
    appleConnected: Boolean(safe.appleCalendarUrl),
    appleCredentialSaved: Boolean(applePasswordEnc),
  };
}

export async function updateBusiness(businessId: string, input: UpdateBusinessInput) {
  await getBusiness(businessId);
  await db.update(businesses).set(input).where(eq(businesses.id, businessId));
  return getBusiness(businessId);
}
