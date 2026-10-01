import { and, desc, eq, ilike, or, type SQL } from 'drizzle-orm';
import { businesses, enquiries } from '../db/schema';
import { isPgError } from '../db/pg-error';
import { BadRequestError, ConflictError } from '../lib/http-error';
import { db } from '../db/client';

interface CreateEnquiryInput {
  clientName: string;
  brideName?: string;
  groomName?: string;
  phone?: string;
  email?: string;
  eventDate?: string;
  eventType?: string;
  eventDuration?: number;
  location?: string;
  services?: string[];
  budget?: string;
  message?: string;
  source?: string;
  businessId: string;
}

export async function createEnquiry(input: CreateEnquiryInput) {
  const business = await db.select().from(businesses).where(eq(businesses.id, input.businessId)).limit(1);
  if (business.length === 0) {
    throw new BadRequestError('Business not found');
  }

  const [result] = await db
    .insert(enquiries)
    .values({
      businessId: input.businessId,
      clientName: input.clientName,
      brideName: input.brideName || null,
      groomName: input.groomName || null,
      phone: input.phone || null,
      email: input.email || null,
      eventDate: input.eventDate || null,
      eventType: input.eventType || null,
      eventDuration: input.eventDuration || null,
      location: input.location || null,
      services: input.services || [],
      budget: input.budget || null,
      message: input.message || null,
      source: input.source || null,
    })
    .returning();

  return result;
}

export async function findAllEnquiries(businessId: string, filters?: { search?: string; status?: string }) {
  const whereClauses: (SQL | undefined)[] = [eq(enquiries.businessId, businessId)];

  if (filters?.search) {
    whereClauses.push(
      or(
        ilike(enquiries.clientName, `%${filters.search}%`),
        ilike(enquiries.location, `%${filters.search}%`),
        ilike(enquiries.email, `%${filters.search}%`)
      )
    );
  }

  if (filters?.status) {
    whereClauses.push(eq(enquiries.status, filters.status));
  }

  return await db.select().from(enquiries).where(and(...whereClauses)).orderBy(desc(enquiries.createdAt));
}

export async function findOneEnquiry(id: string, businessId: string) {
  const [result] = await db
    .select()
    .from(enquiries)
    .where(and(eq(enquiries.id, id), eq(enquiries.businessId, businessId)));

  return result || null;
}

export async function updateEnquiry(id: string, businessId: string, updates: Partial<CreateEnquiryInput> & { status?: string }) {
  const [result] = await db
    .update(enquiries)
    .set({ ...updates, updatedAt: new Date().toISOString() })
    .where(and(eq(enquiries.id, id), eq(enquiries.businessId, businessId)))
    .returning();

  return result || null;
}

export async function deleteEnquiry(id: string, businessId: string) {
  try {
    const [result] = await db
      .delete(enquiries)
      .where(and(eq(enquiries.id, id), eq(enquiries.businessId, businessId)))
      .returning();

    return result || null;
  } catch (err) {
    if (isPgError(err, '23503')) {
      throw new ConflictError('Enquiry is referenced by other records and cannot be deleted');
    }
    throw err;
  }
}
