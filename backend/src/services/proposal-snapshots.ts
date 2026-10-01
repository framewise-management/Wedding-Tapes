import { randomUUID } from 'crypto';
import { and, eq, like, sql } from 'drizzle-orm';
import type { Db } from '../db/client';
import { proposals } from '../db/schema';
import { BadRequestError } from '../lib/http-error';
import type { ProposalEventInput } from '../schemas/proposals';
import type { BusinessService } from './business';
import type { CatalogServiceService } from './catalog-services';
import type { EventTypeService } from './event-types';
import type { PackageService } from './packages';

export class ProposalSnapshotService {
  constructor(
    private readonly db: Db,
    private readonly business: BusinessService,
    private readonly catalog: CatalogServiceService,
    private readonly eventTypes: EventTypeService,
    private readonly packages: PackageService,
  ) {}

  eventIdAt(events: { id: string }[] | undefined, index: number | undefined): string | null {
    if (index === undefined) return null;
    const event = events?.[index];
    if (!event) {
      throw new BadRequestError(`eventIndex ${index} does not match any event on this proposal`);
    }
    return event.id;
  }

  async event(businessId: string, input: ProposalEventInput) {
    // The catalog name wins over whatever the client sent, and is then snapshotted
    // so a later rename or delete of the event type can't rewrite this proposal.
    const eventType = input.eventTypeId
      ? await this.eventTypes.findOne(businessId, input.eventTypeId)
      : null;
    return {
      // Assigned here rather than by the DB default so line items can reference
      // an event before the insert happens.
      id: randomUUID(),
      eventTypeId: eventType?.id ?? null,
      name: eventType?.name ?? input.name,
      date: input.date,
      location: input.location ?? null,
    };
  }

  async package(
    businessId: string,
    input: { packageId: string; quantity: number },
    requireActive: boolean,
    proposalEventId: string | null,
  ) {
    const pkg = await this.packages.findOne(businessId, input.packageId);
    if (requireActive && !pkg.active) {
      throw new BadRequestError(`${pkg.name} is not active and cannot be added`);
    }
    const quantity = input.quantity ?? 1;
    return {
      proposalEventId,
      packageId: pkg.id,
      packageName: pkg.name,
      packageDescription: pkg.description,
      quantity,
      unitPrice: pkg.price,
      total: pkg.price * quantity,
    };
  }

  async item(
    businessId: string,
    input: {
      serviceId: string;
      quantity: number;
      isOptional: boolean;
    },
    requireActive: boolean,
    proposalEventId: string | null,
  ) {
    const service = await this.catalog.findOne(businessId, input.serviceId);
    if (requireActive && !service.active) {
      throw new BadRequestError(`${service.name} is not active and cannot be added`);
    }
    const unitPrice = service.flatPrice;
    if (unitPrice == null) {
      throw new BadRequestError(`${service.name} has no price set`);
    }
    const quantity = input.quantity ?? 1;
    return {
      proposalEventId,
      serviceId: service.id,
      serviceName: service.name,
      description: service.description,
      quantity,
      unitPrice,
      total: unitPrice * quantity,
      isOptional: input.isOptional ?? false,
    };
  }

  async nextNumber(businessId: string): Promise<string> {
    const year = new Date().getFullYear();
    // ponytail: count-based sequence, not concurrency-safe; add a DB sequence/advisory lock if concurrent proposal creation becomes real.
    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(proposals)
      .where(and(eq(proposals.businessId, businessId), like(proposals.proposalNumber, `WP-${year}-%`)));
    const sequence = String(count + 1).padStart(4, '0');
    return `WP-${year}-${sequence}`;
  }

  async validUntil(
    businessId: string,
    provided?: string,
  ): Promise<string | null> {
    if (provided) return provided;
    const business = await this.business.get(businessId);
    if (!business.defaultValidityDays) return null;
    const date = new Date();
    date.setDate(date.getDate() + business.defaultValidityDays);
    return date.toISOString().slice(0, 10);
  }
}

