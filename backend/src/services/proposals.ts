import { and, desc, eq, ilike, inArray, like, sql } from 'drizzle-orm';
import { db } from '../db/client';
import { customers, proposalItems, proposalPackages, proposals } from '../db/schema';
import type { ProposalStatus } from '../db/schema';
import { BadRequestError, ConflictError, NotFoundError } from '../lib/http-error';
import { calculatePricing } from '../pricing';
import { findOneCustomer } from './customers';
import { findOnePackage } from './packages';
import { findOneService } from './catalog-services';
import { getBusiness } from './business';
import { notifyDiscord } from '../lib/discord';
import { removeGoogleEvent, syncProposalToGoogle } from './google-calendar';
import type {
  CalculateProposalInput,
  CreateProposalInput,
  UpdateProposalInput,
} from '../schemas/proposals';

const RELATIONS = { customer: true, packages: true, items: true } as const;

export async function findAllProposals(
  businessId: string,
  query: { search?: string; status?: ProposalStatus } = {},
) {
  // The customer.name filter can't be expressed in a relational-query
  // `where`, so find matching ids via a join first, then re-fetch with
  // relations preserving the same order.
  const matches = await db
    .select({ id: proposals.id })
    .from(proposals)
    .leftJoin(customers, eq(proposals.customerId, customers.id))
    .where(
      and(
        eq(proposals.businessId, businessId),
        query.status ? eq(proposals.status, query.status) : undefined,
        query.search ? ilike(customers.name, `%${query.search}%`) : undefined,
      ),
    )
    .orderBy(desc(proposals.createdAt));

  if (matches.length === 0) return [];

  return db.query.proposals.findMany({
    where: inArray(
      proposals.id,
      matches.map((m) => m.id),
    ),
    with: RELATIONS,
    orderBy: desc(proposals.createdAt),
  });
}

export async function findOneProposal(businessId: string, id: string) {
  const proposal = await db.query.proposals.findFirst({
    where: and(eq(proposals.id, id), eq(proposals.businessId, businessId)),
    with: RELATIONS,
  });
  if (!proposal) throw new NotFoundError('Proposal not found');
  return proposal;
}

export async function findProposalById(id: string) {
  const proposal = await db.query.proposals.findFirst({
    where: eq(proposals.id, id),
    with: RELATIONS,
  });
  if (!proposal) throw new NotFoundError('Proposal not found');
  return proposal;
}

export async function incrementShareViewCount(id: string) {
  await db
    .update(proposals)
    .set({ shareViewCount: sql`${proposals.shareViewCount} + 1` })
    .where(eq(proposals.id, id));
}

export async function removeProposal(businessId: string, id: string) {
  const existing = await findOneProposal(businessId, id);
  await db.delete(proposals).where(and(eq(proposals.id, id), eq(proposals.businessId, businessId)));
  await removeGoogleEvent(businessId, existing.googleEventId);
}

export async function createProposal(businessId: string, input: CreateProposalInput) {
  if (!input.packages?.length && !input.items?.length) {
    throw new BadRequestError('A proposal needs at least one package or service');
  }
  await findOneCustomer(businessId, input.customerId);

  const packageSnapshots = await Promise.all(
    (input.packages ?? []).map((p) => resolvePackageSnapshot(businessId, p, true)),
  );
  const itemSnapshots = await Promise.all(
    (input.items ?? []).map((i) => resolveItemSnapshot(businessId, i, true)),
  );
  const taxRate = input.taxRate ?? 0;
  const pricing = calculatePricing({
    packages: packageSnapshots,
    items: itemSnapshots,
    discountType: input.discount?.type ?? null,
    discountValue: input.discount?.value ?? null,
    taxRate,
  });

  const proposalNumber = await generateProposalNumber(businessId);
  const validUntil = await resolveValidUntilDate(businessId, input.validUntil);

  const newId = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(proposals)
      .values({
        businessId,
        customerId: input.customerId,
        proposalNumber,
        weddingDate: input.weddingDate,
        weddingLocation: input.weddingLocation,
        numberOfDays: input.numberOfDays ?? null,
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

  const created = await findOneProposal(businessId, newId);
  await notifyDiscord(
    `📄 New proposal **${created.proposalNumber}** for ${created.customer.name} — ₹${created.total.toLocaleString('en-IN')}`,
  );
  return created;
}

export async function updateProposal(businessId: string, id: string, input: UpdateProposalInput) {
  const existing = await findOneProposal(businessId, id);
  if (existing.status !== 'DRAFT') {
    throw new ConflictError('Only draft proposals can be edited');
  }
  if (input.customerId !== undefined) {
    await findOneCustomer(businessId, input.customerId);
  }

  const patch: Partial<typeof proposals.$inferInsert> = {};
  if (input.customerId !== undefined) patch.customerId = input.customerId;
  if (input.weddingDate !== undefined) patch.weddingDate = input.weddingDate;
  if (input.weddingLocation !== undefined) patch.weddingLocation = input.weddingLocation;
  if (input.numberOfDays !== undefined) patch.numberOfDays = input.numberOfDays;
  if (input.notes !== undefined) patch.notes = input.notes;
  if (input.validUntil !== undefined) patch.validUntil = input.validUntil;
  if (input.discount !== undefined) {
    patch.discountType = input.discount?.type ?? null;
    patch.discountValue = input.discount?.value ?? null;
  }
  if (input.taxRate !== undefined) patch.taxRate = input.taxRate;
  if (input.template !== undefined) patch.template = input.template;

  if (Object.keys(patch).length > 0) {
    await db
      .update(proposals)
      .set(patch)
      .where(and(eq(proposals.id, id), eq(proposals.businessId, businessId)));
  }

  if (input.packages !== undefined || input.items !== undefined) {
    if (input.packages !== undefined) {
      await db.delete(proposalPackages).where(eq(proposalPackages.proposalId, id));
    }
    if (input.items !== undefined) {
      await db.delete(proposalItems).where(eq(proposalItems.proposalId, id));
    }
    const existingPackageIds = new Set(existing.packages.map((p) => p.packageId));
    const existingServiceIds = new Set(existing.items.map((i) => i.serviceId));

    const newPackages = input.packages
      ? await Promise.all(
          input.packages.map((p) =>
            resolvePackageSnapshot(businessId, p, !existingPackageIds.has(p.packageId)),
          ),
        )
      : undefined;
    const newItems = input.items
      ? await Promise.all(
          input.items.map((i) =>
            resolveItemSnapshot(businessId, i, !existingServiceIds.has(i.serviceId)),
          ),
        )
      : undefined;

    if (newPackages?.length) {
      await db.insert(proposalPackages).values(newPackages.map((p) => ({ ...p, proposalId: id })));
    }
    if (newItems?.length) {
      await db.insert(proposalItems).values(newItems.map((i) => ({ ...i, proposalId: id })));
    }
  }

  const refreshed = await findOneProposal(businessId, id);
  await persistPricing(refreshed);
  return findOneProposal(businessId, id);
}

export async function calculateProposal(
  businessId: string,
  id: string,
  input: CalculateProposalInput,
) {
  const existing = await findOneProposal(businessId, id);
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
    await db
      .update(proposals)
      .set(patch)
      .where(and(eq(proposals.id, id), eq(proposals.businessId, businessId)));
  }

  const refreshed = await findOneProposal(businessId, id);
  await persistPricing(refreshed);
  await syncProposalToGoogle(id);
  return findOneProposal(businessId, id);
}

export async function updateProposalStatus(businessId: string, id: string, status: ProposalStatus) {
  await findOneProposal(businessId, id);
  await db
    .update(proposals)
    .set({ status })
    .where(and(eq(proposals.id, id), eq(proposals.businessId, businessId)));
  await syncProposalToGoogle(id);
  return findOneProposal(businessId, id);
}

export async function shareProposal(businessId: string, id: string) {
  const existing = await findOneProposal(businessId, id);
  if (existing.status === 'DRAFT') {
    await updateProposalStatus(businessId, id, 'SENT');
  }
  const proposal = await findOneProposal(businessId, id);
  const link = `${process.env.FRONTEND_URL}/p/${proposal.id}`;
  await notifyDiscord(
    `🔗 **Shareable link generated**\nProposal **${proposal.proposalNumber}** (${proposal.customer.name})\n<${link}>`,
  );
  return proposal;
}

async function persistPricing(proposal: Awaited<ReturnType<typeof findOneProposal>>) {
  const pricing = calculatePricing({
    packages: proposal.packages,
    items: proposal.items,
    discountType: proposal.discountType,
    discountValue: proposal.discountValue,
    taxRate: proposal.taxRate,
  });
  await db
    .update(proposals)
    .set({
      subtotal: pricing.subtotal,
      discountAmount: pricing.discountAmount,
      taxAmount: pricing.taxAmount,
      total: pricing.total,
    })
    .where(and(eq(proposals.id, proposal.id), eq(proposals.businessId, proposal.businessId)));
}

async function resolvePackageSnapshot(
  businessId: string,
  input: { packageId: string; quantity: number },
  requireActive: boolean,
) {
  const pkg = await findOnePackage(businessId, input.packageId);
  if (requireActive && !pkg.active) {
    throw new BadRequestError(`${pkg.name} is not active and cannot be added`);
  }
  const quantity = input.quantity ?? 1;
  return {
    packageId: pkg.id,
    packageName: pkg.name,
    packageDescription: pkg.description,
    quantity,
    unitPrice: pkg.price,
    total: pkg.price * quantity,
  };
}

async function resolveItemSnapshot(
  businessId: string,
  input: {
    serviceId: string;
    quantity: number;
    isOptional: boolean;
  },
  requireActive: boolean,
) {
  const service = await findOneService(businessId, input.serviceId);
  if (requireActive && !service.active) {
    throw new BadRequestError(`${service.name} is not active and cannot be added`);
  }
  const unitPrice = service.flatPrice;
  if (unitPrice == null) {
    throw new BadRequestError(`${service.name} has no price set`);
  }
  const quantity = input.quantity ?? 1;
  return {
    serviceId: service.id,
    serviceName: service.name,
    description: service.description,
    quantity,
    unitPrice,
    total: unitPrice * quantity,
    isOptional: input.isOptional ?? false,
  };
}

async function generateProposalNumber(businessId: string): Promise<string> {
  const year = new Date().getFullYear();
  // ponytail: count-based sequence, not concurrency-safe; add a DB sequence/advisory lock if concurrent proposal creation becomes real.
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(proposals)
    .where(and(eq(proposals.businessId, businessId), like(proposals.proposalNumber, `WP-${year}-%`)));
  const sequence = String(count + 1).padStart(4, '0');
  return `WP-${year}-${sequence}`;
}

async function resolveValidUntilDate(
  businessId: string,
  provided?: string,
): Promise<string | null> {
  if (provided) return provided;
  const business = await getBusiness(businessId);
  if (!business.defaultValidityDays) return null;
  const date = new Date();
  date.setDate(date.getDate() + business.defaultValidityDays);
  return date.toISOString().slice(0, 10);
}
