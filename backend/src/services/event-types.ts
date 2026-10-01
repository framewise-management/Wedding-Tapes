import { and, asc, eq } from 'drizzle-orm';
import type { Db } from '../db/client';
import { eventTypes } from '../db/schema';
import { isPgError } from '../db/pg-error';
import { ConflictError, NotFoundError } from '../lib/http-error';
import type { CreateEventTypeInput, UpdateEventTypeInput } from '../schemas/event-types';

// Seeded in wedding-day order, and listed by creation order below, so the
// picker reads chronologically rather than alphabetically.
const DEFAULT_EVENT_TYPES = [
  'Engagement',
  'Haldi',
  'Mehndi',
  'Sangeet',
  'Wedding',
  'Reception',
  'Anniversary',
  'Birthday',
];

type Executor = Pick<Db, 'insert'>;

function asDuplicateNameError(err: unknown): unknown {
  return isPgError(err, '23505') ? new ConflictError('An event type with this name already exists') : err;
}

export class EventTypeService {
  constructor(
    private readonly db: Db,
  ) {}

  seedDefaults(executor: Executor, businessId: string) {
    return executor
      .insert(eventTypes)
      .values(DEFAULT_EVENT_TYPES.map((name) => ({ businessId, name })));
  }

  findAll(businessId: string, active?: boolean) {
    return this.db.query.eventTypes.findMany({
      where: and(
        eq(eventTypes.businessId, businessId),
        active !== undefined ? eq(eventTypes.active, active) : undefined,
      ),
      orderBy: asc(eventTypes.createdAt),
    });
  }

  async findOne(businessId: string, id: string) {
    const eventType = await this.db.query.eventTypes.findFirst({
      where: and(eq(eventTypes.id, id), eq(eventTypes.businessId, businessId)),
    });
    if (!eventType) throw new NotFoundError('Event type not found');
    return eventType;
  }

  async create(businessId: string, input: CreateEventTypeInput) {
    try {
      const [eventType] = await this.db
        .insert(eventTypes)
        .values({ ...input, businessId })
        .returning();
      return eventType;
    } catch (err) {
      throw asDuplicateNameError(err);
    }
  }

  async update(businessId: string, id: string, input: UpdateEventTypeInput) {
    await this.findOne(businessId, id);
    try {
      await this.db
        .update(eventTypes)
        .set(input)
        .where(and(eq(eventTypes.id, id), eq(eventTypes.businessId, businessId)));
    } catch (err) {
      throw asDuplicateNameError(err);
    }
    return this.findOne(businessId, id);
  }

  async remove(businessId: string, id: string) {
    await this.findOne(businessId, id);
    try {
      await this.db
        .delete(eventTypes)
        .where(and(eq(eventTypes.id, id), eq(eventTypes.businessId, businessId)));
    } catch (err) {
      if (isPgError(err, '23503')) {
        throw new ConflictError('Cannot delete an event type used by a proposal');
      }
      throw err;
    }
  }
}

