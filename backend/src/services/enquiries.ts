import { and, desc, eq, ilike, ne, or, type SQL } from 'drizzle-orm';
import { enquiries } from '../db/schema';
import { BadRequestError, ConflictError, NotFoundError } from '../lib/http-error';
import type { Db } from '../db/client';
import type { EnquiryStatus } from '../schemas/enquiries';
import type { CustomerService } from './customers';
import type { ProposalService } from './proposals';

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

export class EnquiryService {
  constructor(
    private readonly db: Db,
    private readonly customers: CustomerService,
    private readonly proposals: ProposalService,
  ) {}

  async create(input: CreateEnquiryInput) {
    const [result] = await this.db
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

  async findAll(businessId: string, filters?: { search?: string; status?: string }) {
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

    return await this.db.select().from(enquiries).where(and(...whereClauses)).orderBy(desc(enquiries.createdAt));
  }

  async findOne(businessId: string, id: string) {
    const [result] = await this.db
      .select()
      .from(enquiries)
      .where(and(eq(enquiries.id, id), eq(enquiries.businessId, businessId)));

    if (!result) throw new NotFoundError('Enquiry not found');
    return result;
  }

  async update(businessId: string, id: string, updates: { status?: EnquiryStatus }) {
    const [result] = await this.db
      .update(enquiries)
      .set(updates)
      .where(and(eq(enquiries.id, id), eq(enquiries.businessId, businessId)))
      .returning();

    if (!result) throw new NotFoundError('Enquiry not found');
    return result;
  }

  async remove(businessId: string, id: string) {
    const [result] = await this.db
      .delete(enquiries)
      .where(and(eq(enquiries.id, id), eq(enquiries.businessId, businessId)))
      .returning();

    if (!result) throw new NotFoundError('Enquiry not found');
    return result;
  }

  async convertToProposal(businessId: string, id: string) {
    const enquiry = await this.findOne(businessId, id);
    const serviceIds = Array.isArray(enquiry.services) ? (enquiry.services as string[]) : [];
    const missing = [
      !enquiry.phone && 'phone',
      !enquiry.eventDate && 'event date',
      !enquiry.location && 'location',
      !serviceIds.length && 'at least one service',
    ].filter(Boolean);
    if (missing.length) {
      throw new BadRequestError(`Can't convert yet: this enquiry is missing ${missing.join(', ')}`);
    }

    // Claiming the status first makes a double click or retry fail instead of duplicating.
    const [claimed] = await this.db
      .update(enquiries)
      .set({ status: 'CONVERTED' })
      .where(and(eq(enquiries.id, id), eq(enquiries.businessId, businessId), ne(enquiries.status, 'CONVERTED')))
      .returning();
    if (!claimed) throw new ConflictError('Enquiry has already been converted');

    let customerId: string | undefined;
    try {
      const customer = await this.customers.create(businessId, {
        name: enquiry.clientName,
        phone: enquiry.phone!,
        email: enquiry.email ?? undefined,
      });
      customerId = customer.id;

      const notes = [
        'Converted from enquiry',
        enquiry.source && `Source: ${enquiry.source}`,
        enquiry.budget && `Budget: ${enquiry.budget}`,
        enquiry.message,
      ]
        .filter(Boolean)
        .join('\n');

      return await this.proposals.create(businessId, {
        customerId,
        weddingDate: enquiry.eventDate!,
        weddingLocation: enquiry.location!,
        numberOfDays: enquiry.eventDuration ?? undefined,
        items: serviceIds.map((serviceId) => ({ serviceId, quantity: 1, isOptional: false })),
        notes,
      });
    } catch (err) {
      if (customerId) await this.customers.remove(businessId, customerId).catch(() => {});
      await this.db
        .update(enquiries)
        .set({ status: enquiry.status })
        .where(and(eq(enquiries.id, id), eq(enquiries.businessId, businessId)));
      throw err;
    }
  }
}

