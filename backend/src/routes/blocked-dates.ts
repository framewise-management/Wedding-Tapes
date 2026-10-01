import { Hono } from 'hono';
import type { AuthedVariables } from '../middleware/auth';
import { authMiddleware } from '../middleware/auth';
import { parseBody, parseUuidParam } from '../lib/validate';
import { createBlockedDateSchema } from '../schemas/blocked-dates';
import { blockedDateService } from '../services/blocked-dates';

export const blockedDatesRoutes = new Hono<{ Variables: AuthedVariables }>();

blockedDatesRoutes.use('*', authMiddleware);

blockedDatesRoutes.get('/', async (c) => {
  const user = c.get('user');
  return c.json(await blockedDateService.findAll(user.businessId));
});

blockedDatesRoutes.post('/', async (c) => {
  const user = c.get('user');
  const input = await parseBody(c, createBlockedDateSchema);
  return c.json(await blockedDateService.create(user.businessId, input), 201);
});

blockedDatesRoutes.delete('/:id', async (c) => {
  const user = c.get('user');
  const id = parseUuidParam(c, 'id');
  await blockedDateService.remove(user.businessId, id);
  return c.json({ success: true });
});
