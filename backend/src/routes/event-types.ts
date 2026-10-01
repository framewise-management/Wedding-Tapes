import { Hono } from 'hono';
import type { AuthedVariables } from '../middleware/auth';
import { authMiddleware } from '../middleware/auth';
import { parseBody, parseQuery, parseUuidParam } from '../lib/validate';
import {
  createEventTypeSchema,
  listEventTypesQuerySchema,
  updateEventTypeSchema,
} from '../schemas/event-types';
import { eventTypeService } from '../services';

export const eventTypesRoutes = new Hono<{ Variables: AuthedVariables }>();

eventTypesRoutes.use('*', authMiddleware);

eventTypesRoutes.get('/', async (c) => {
  const user = c.get('user');
  const query = parseQuery(c, listEventTypesQuerySchema);
  return c.json(await eventTypeService.findAll(user.businessId, query.active));
});

eventTypesRoutes.post('/', async (c) => {
  const user = c.get('user');
  const input = await parseBody(c, createEventTypeSchema);
  return c.json(await eventTypeService.create(user.businessId, input), 201);
});

eventTypesRoutes.get('/:id', async (c) => {
  const user = c.get('user');
  const id = parseUuidParam(c, 'id');
  return c.json(await eventTypeService.findOne(user.businessId, id));
});

eventTypesRoutes.put('/:id', async (c) => {
  const user = c.get('user');
  const id = parseUuidParam(c, 'id');
  const input = await parseBody(c, updateEventTypeSchema);
  return c.json(await eventTypeService.update(user.businessId, id, input));
});

eventTypesRoutes.delete('/:id', async (c) => {
  const user = c.get('user');
  const id = parseUuidParam(c, 'id');
  await eventTypeService.remove(user.businessId, id);
  return c.json({ success: true });
});
