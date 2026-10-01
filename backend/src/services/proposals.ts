import { and, asc, desc, eq, ilike, inArray, sql } from 'drizzle-orm';
import type { Db } from '../db/client';
import {
  customers,
  proposalEvents,
  proposalItems,
  proposalPackages,
  proposals,
} from '../db/schema';
import type { ProposalStatus } from '../db/schema';
import { BadRequestError, ConflictError, NotFoundError } from '../lib/http-error';
import { calculatePricing } from '../pricing';
import { deriveEventFields } from '../event-dates';
import type { CustomerService } from './customers';
import type { ProposalSnapshotService } from './proposal-snapshots';
import { notifyDiscord } from '../lib/discord';
import type { CalendarSyncService } from './calendar-sync';
import type {
  CalculateProposalInput,
  CreateProposalInput,
  UpdateProposalInput,
} from '../schemas/proposals';

const RELATIONS = {
  customer: true,
  packages: true,
  items: true,
  events: { orderBy: [asc(proposalEvents.date), asc(proposalEvents.createdAt)] },
} satisfies NonNullable<Parameters<Db['query']['proposals']['findFirst']>[0]>['with'];

export class ProposalService {
  constructor(
    private readonly db: Db,
    private readonly customers: CustomerService,
    private readonly snapshots: ProposalSnapshotService,
    private readonly calendarSync: CalendarSyncService,
  ) {}

  async findAll(
    businessId: string,
    query: { search?: string; status?: ProposalStatus; customerId?: string; archived?: boolean } = {},
  ) {
    // The customer.name filter can't be expressed in a relational-query
    // `where`, so find matching ids via a join first, then re-fetch with
    // relations preserving the same order.
    const matches = await this.db
      .select({ id: proposals.id })
      .from(proposals)
      .leftJoin(customers, eq(proposals.customerId, customers.id))
      .where(
        and(
          eq(proposals.businessId, businessId),
          query.status ? eq(proposals.status, query.status) : undefined,
          query.customerId ? eq(proposals.customerId, query.customerId) : undefined,
          query.archived !== undefined ? eq(proposals.isArchived, query.archived) : undefined,
          query.search ? ilike(customers.name, `%${query.search}%`) : undefined,
        ),
      )
      .orderBy(desc(proposals.createdAt));

    if (matches.length === 0) return [];

    return this.db.query.proposals.findMany({
      where: inArray(
        proposals.id,
        matches.map((m) => m.id),
      ),
      with: RELATIONS,
      orderBy: desc(proposals.createdAt),
    });
  }

  async findOne(businessId: string, id: string) {
    const proposal = await this.db.query.proposals.findFirst({
      where: and(eq(proposals.id, id), eq(proposals.businessId, businessId)),
      with: RELATIONS,
    });
    if (!proposal) throw new NotFoundError('Proposal not found');
    return proposal;
  }

  async findById(id: string) {
    const proposal = await this.db.query.proposals.findFirst({
      where: eq(proposals.id, id),
      with: RELATIONS,
    });
    if (!proposal) throw new NotFoundError('Proposal not found');
    return proposal;
  }

  async incrementShareViewCount(id: string) {
    await this.db
      .update(proposals)
      .set({ shareViewCount: sql`${proposals.shareViewCount} + 1` })
      .where(eq(proposals.id, id));
  }

  async remove(businessId: string, id: string) {
    const existing = await this.findOne(businessId, id);
    await this.db.delete(proposals).where(and(eq(proposals.id, id), eq(proposals.businessId, businessId)));
    await this.calendarSync.removeProposal(existing);
  }

  async create(businessId: string, input: CreateProposalInput) {
    if (!input.packages?.length && !input.items?.length) {
      throw new BadRequestError('A proposal needs at least one package or service');
    }
    await this.customers.findOne(businessId, input.customerId);

    const eventSnapshots = input.events
      ? await Promise.all(input.events.map((e) => this.snapshots.event(businessId, e)))
      : undefined;

    const packageSnapshots = await Promise.all(
      (input.packages ?? []).map((p) =>
        this.snapshots.package(businessId, p, true, this.snapshots.eventIdAt(eventSnapshots, p.eventIndex)),
      ),
    );
    const itemSnapshots = await Promise.all(
      (input.items ?? []).map((i) =>
        this.snapshots.item(businessId, i, true, this.snapshots.eventIdAt(eventSnapshots, i.eventIndex)),
      ),
    );
    // The schema's refine guarantees a weddingDate whenever events are absent.
    const eventFields = eventSnapshots
      ? deriveEventFields(eventSnapshots)
      : {
          weddingDate: input.weddingDate!,
          weddingEndDate: null,
          numberOfDays: input.numberOfDays ?? null,
        };

    const taxRate = input.taxRate ?? 0;
    const pricing = calculatePricing({
      packages: packageSnapshots,
      items: itemSnapshots,
      discountType: input.discount?.type ?? null,
      discountValue: input.discount?.value ?? null,
      taxRate,
    });

    const proposalNumber = await this.snapshots.nextNumber(businessId);
    const validUntil = await this.snapshots.validUntil(businessId, input.validUntil);

    const newId = await this.db.transaction(async (tx) => {
      const [created] = await tx
        .insert(proposals)
        .values({
          businessId,
          customerId: input.customerId,
          proposalNumber,
          weddingDate: eventFields.weddingDate,
          weddingEndDate: eventFields.weddingEndDate,
          weddingLocation: input.weddingLocation,
          numberOfDays: eventFields.numberOfDays,
          notes: input.notes ?? null,
          validUntil,
          status: 'DRAFT',
          template: input.template ?? 'DARK_LUXE',
          discountType: input.discount?.type ?? null,
          discountValue: input.discount?.value ?? null,
          taxRate,
          subtotal: pricing.subtotal,
          discountAmount: pricing.discountAmount,
          taxAmount: pricing.taxAmount,
          total: pricing.total,
        })
        .returning();

      if (eventSnapshots?.length) {
        await tx
          .insert(proposalEvents)
          .values(eventSnapshots.map((e) => ({ ...e, proposalId: created.id })));
      }
      if (packageSnapshots.length) {
        await tx
          .insert(proposalPackages)
          .values(packageSnapshots.map((p) => ({ ...p, proposalId: created.id })));
      }
      if (itemSnapshots.length) {
        await tx.insert(proposalItems).values(itemSnapshots.map((i) => ({ ...i, proposalId: created.id })));
      }
      return created.id;
    });

    const created = await this.findOne(businessId, newId);
    await notifyDiscord(
      `📄 New proposal **${created.proposalNumber}** for ${created.customer.name} — ₹${created.total.toLocaleString('en-IN')}`,
    );
    return created;
  }

  async update(businessId: string, id: string, input: UpdateProposalInput) {
    const existing = await this.findOne(businessId, id);
    if (existing.status !== 'DRAFT') {
      throw new ConflictError('Only draft proposals can be edited');
    }
    if (input.customerId !== undefined) {
      await this.customers.findOne(businessId, input.customerId);
    }

    // Every lookup and validation runs before the first write, so a rejected
    // replacement can't leave the draft with its rows already deleted.
    const eventSnapshots = input.events
      ? await Promise.all(input.events.map((e) => this.snapshots.event(businessId, e)))
      : undefined;

    const eventRefs = eventSnapshots ?? existing.events;
    const existingPackageIds = new Set(existing.packages.map((p) => p.packageId));
    const existingServiceIds = new Set(existing.items.map((i) => i.serviceId));
    const newPackages = input.packages
      ? await Promise.all(
          input.packages.map((p) =>
            this.snapshots.package(
              businessId,
              p,
              !existingPackageIds.has(p.packageId),
              this.snapshots.eventIdAt(eventRefs, p.eventIndex),
            ),
          ),
        )
      : undefined;
    const newItems = input.items
      ? await Promise.all(
          input.items.map((i) =>
            this.snapshots.item(
              businessId,
              i,
              !existingServiceIds.has(i.serviceId),
              this.snapshots.eventIdAt(eventRefs, i.eventIndex),
            ),
          ),
        )
      : undefined;

    const patch: Partial<typeof proposals.$inferInsert> = {};
    if (input.customerId !== undefined) patch.customerId = input.customerId;
    if (input.weddingDate !== undefined) patch.weddingDate = input.weddingDate;
    if (input.weddingLocation !== undefined) patch.weddingLocation = input.weddingLocation;
    if (input.numberOfDays !== undefined) patch.numberOfDays = input.numberOfDays;
    // Events own the date columns, so they overwrite anything sent alongside them.
    if (eventSnapshots) Object.assign(patch, deriveEventFields(eventSnapshots));
    if (input.notes !== undefined) patch.notes = input.notes;
    if (input.validUntil !== undefined) patch.validUntil = input.validUntil;
    if (input.discount !== undefined) {
      patch.discountType = input.discount?.type ?? null;
      patch.discountValue = input.discount?.value ?? null;
    }
    if (input.taxRate !== undefined) patch.taxRate = input.taxRate;
    if (input.template !== undefined) patch.template = input.template;

    Object.assign(
      patch,
      calculatePricing({
        packages: newPackages ?? existing.packages,
        items: newItems ?? existing.items,
        discountType: patch.discountType !== undefined ? patch.discountType : existing.discountType,
        discountValue: patch.discountValue !== undefined ? patch.discountValue : existing.discountValue,
        taxRate: patch.taxRate ?? existing.taxRate,
      }),
    );

    await this.db.transaction(async (tx) => {
      await tx
        .update(proposals)
        .set(patch)
        .where(and(eq(proposals.id, id), eq(proposals.businessId, businessId)));

      if (eventSnapshots) {
        await tx.delete(proposalEvents).where(eq(proposalEvents.proposalId, id));
        if (eventSnapshots.length) {
          await tx.insert(proposalEvents).values(eventSnapshots.map((e) => ({ ...e, proposalId: id })));
        }
      }
      if (newPackages) {
        await tx.delete(proposalPackages).where(eq(proposalPackages.proposalId, id));
        if (newPackages.length) {
          await tx.insert(proposalPackages).values(newPackages.map((p) => ({ ...p, proposalId: id })));
        }
      }
      if (newItems) {
        await tx.delete(proposalItems).where(eq(proposalItems.proposalId, id));
        if (newItems.length) {
          await tx.insert(proposalItems).values(newItems.map((i) => ({ ...i, proposalId: id })));
        }
      }
    });

    return this.findOne(businessId, id);
  }

  async calculate(
    businessId: string,
    id: string,
    input: CalculateProposalInput,
  ) {
    const existing = await this.findOne(businessId, id);
    if (existing.status !== 'DRAFT') {
      throw new ConflictError('Only draft proposals can be edited');
    }

    const patch: Partial<typeof proposals.$inferInsert> = {};
    if (input.discount !== undefined) {
      patch.discountType = input.discount?.type ?? null;
      patch.discountValue = input.discount?.value ?? null;
    }
    if (input.taxRate !== undefined) patch.taxRate = input.taxRate;

    if (Object.keys(patch).length > 0) {
      await this.db
        .update(proposals)
        .set(patch)
        .where(and(eq(proposals.id, id), eq(proposals.businessId, businessId)));
    }

    const refreshed = await this.findOne(businessId, id);
    await this.persistPricing(refreshed);
    await this.calendarSync.syncProposal(id);
    return this.findOne(businessId, id);
  }

  async updateStatus(businessId: string, id: string, status: ProposalStatus) {
    await this.findOne(businessId, id);
    await this.db
      .update(proposals)
      .set({ status })
      .where(and(eq(proposals.id, id), eq(proposals.businessId, businessId)));
    await this.calendarSync.syncProposal(id);
    return this.findOne(businessId, id);
  }

  async setArchived(businessId: string, id: string, archived: boolean) {
    await this.findOne(businessId, id);
    await this.db
      .update(proposals)
      .set({ isArchived: archived })
      .where(and(eq(proposals.id, id), eq(proposals.businessId, businessId)));
    return this.findOne(businessId, id);
  }

  async share(businessId: string, id: string) {
    const existing = await this.findOne(businessId, id);
    if (existing.status === 'DRAFT') {
      await this.updateStatus(businessId, id, 'SENT');
    }
    const proposal = await this.findOne(businessId, id);
    const link = `${process.env.FRONTEND_URL}/p/${proposal.id}`;
    await notifyDiscord(
      `🔗 **Shareable link generated**\nProposal **${proposal.proposalNumber}** (${proposal.customer.name})\n<${link}>`,
    );
    return proposal;
  }

  private async persistPricing(proposal: Awaited<ReturnType<ProposalService['findOne']>>) {
    const pricing = calculatePricing({
      packages: proposal.packages,
      items: proposal.items,
      discountType: proposal.discountType,
      discountValue: proposal.discountValue,
      taxRate: proposal.taxRate,
    });
    await this.db
      .update(proposals)
      .set({
        subtotal: pricing.subtotal,
        discountAmount: pricing.discountAmount,
        taxAmount: pricing.taxAmount,
        total: pricing.total,
      })
      .where(and(eq(proposals.id, proposal.id), eq(proposals.businessId, proposal.businessId)));
  }
}

