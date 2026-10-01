import { and, desc, eq, ilike, or, type SQL } from 'drizzle-orm';
import { enquiries } from '../db/schema';
import { NotFoundError } from '../lib/http-error';
import { db } from '../db/client';
import type { EnquiryStatus } from '../schemas/enquiries';

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

export async function findOneEnquiry(businessId: string, id: string) {
  const [result] = await db
    .select()
    .from(enquiries)
    .where(and(eq(enquiries.id, id), eq(enquiries.businessId, businessId)));

  if (!result) throw new NotFoundError('Enquiry not found');
  return result;
}

export async function updateEnquiry(businessId: string, id: string, updates: { status?: EnquiryStatus }) {
  const [result] = await db
    .update(enquiries)
    .set(updates)
    .where(and(eq(enquiries.id, id), eq(enquiries.businessId, businessId)))
    .returning();

  if (!result) throw new NotFoundError('Enquiry not found');
  return result;
}

export async function deleteEnquiry(businessId: string, id: string) {
  const [result] = await db
    .delete(enquiries)
    .where(and(eq(enquiries.id, id), eq(enquiries.businessId, businessId)))
    .returning();

  if (!result) throw new NotFoundError('Enquiry not found');
  return result;
}
