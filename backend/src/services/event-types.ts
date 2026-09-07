import { and, asc, eq } from 'drizzle-orm';
import { db } from '../db/client';
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

type Executor = Pick<typeof db, 'insert'>;

export function seedDefaultEventTypes(executor: Executor, businessId: string) {
  return executor
    .insert(eventTypes)
    .values(DEFAULT_EVENT_TYPES.map((name) => ({ businessId, name })));
}

export function findAllEventTypes(businessId: string, active?: boolean) {
  return db.query.eventTypes.findMany({
    where: and(
      eq(eventTypes.businessId, businessId),
      active !== undefined ? eq(eventTypes.active, active) : undefined,
    ),
    orderBy: asc(eventTypes.createdAt),
  });
}

export async function findOneEventType(businessId: string, id: string) {
  const eventType = await db.query.eventTypes.findFirst({
    where: and(eq(eventTypes.id, id), eq(eventTypes.businessId, businessId)),
  });
  if (!eventType) throw new NotFoundError('Event type not found');
  return eventType;
}

export async function createEventType(businessId: string, input: CreateEventTypeInput) {
  try {
    const [eventType] = await db
      .insert(eventTypes)
      .values({ ...input, businessId })
      .returning();
    return eventType;
  } catch (err) {
    throw asDuplicateNameError(err);
  }
}

export async function updateEventType(
  businessId: string,
  id: string,
  input: UpdateEventTypeInput,
) {
  await findOneEventType(businessId, id);
  try {
    await db
      .update(eventTypes)
      .set(input)
      .where(and(eq(eventTypes.id, id), eq(eventTypes.businessId, businessId)));
  } catch (err) {
    throw asDuplicateNameError(err);
  }
  return findOneEventType(businessId, id);
}

export async function removeEventType(businessId: string, id: string) {
  await findOneEventType(businessId, id);
  try {
    await db
      .delete(eventTypes)
      .where(and(eq(eventTypes.id, id), eq(eventTypes.businessId, businessId)));
  } catch (err) {
    if (isPgError(err, '23503')) {
      throw new ConflictError('Cannot delete an event type used by a proposal');
    }
    throw err;
  }
}

function asDuplicateNameError(err: unknown): unknown {
  return isPgError(err, '23505') ? new ConflictError('An event type with this name already exists') : err;
}
