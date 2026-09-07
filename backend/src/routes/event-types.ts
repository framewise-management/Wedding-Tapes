import { Hono } from 'hono';
import type { AuthedVariables } from '../middleware/auth';
import { authMiddleware } from '../middleware/auth';
import { parseBody, parseQuery, parseUuidParam } from '../lib/validate';
import {
  createEventTypeSchema,
  listEventTypesQuerySchema,
  updateEventTypeSchema,
} from '../schemas/event-types';
import {
  createEventType,
  findAllEventTypes,
  findOneEventType,
  removeEventType,
  updateEventType,
} from '../services/event-types';

export const eventTypesRoutes = new Hono<{ Variables: AuthedVariables }>();

eventTypesRoutes.use('*', authMiddleware);

eventTypesRoutes.get('/', async (c) => {
  const user = c.get('user');
  const query = parseQuery(c, listEventTypesQuerySchema);
  return c.json(await findAllEventTypes(user.businessId, query.active));
});

eventTypesRoutes.post('/', async (c) => {
  const user = c.get('user');
  const input = await parseBody(c, createEventTypeSchema);
  return c.json(await createEventType(user.businessId, input), 201);
});

eventTypesRoutes.get('/:id', async (c) => {
  const user = c.get('user');
  const id = parseUuidParam(c, 'id');
  return c.json(await findOneEventType(user.businessId, id));
});

eventTypesRoutes.put('/:id', async (c) => {
  const user = c.get('user');
  const id = parseUuidParam(c, 'id');
  const input = await parseBody(c, updateEventTypeSchema);
  return c.json(await updateEventType(user.businessId, id, input));
});

eventTypesRoutes.delete('/:id', async (c) => {
  const user = c.get('user');
  const id = parseUuidParam(c, 'id');
  await removeEventType(user.businessId, id);
  return c.json({ success: true });
});
