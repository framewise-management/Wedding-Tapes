import { Hono } from 'hono';
import type { AuthedVariables } from '../middleware/auth';
import { authMiddleware } from '../middleware/auth';
import { parseBody } from '../lib/validate';
import { updateBusinessSchema } from '../schemas/business';
import { businessService } from '../services';

export const businessRoutes = new Hono<{ Variables: AuthedVariables }>();

businessRoutes.use('*', authMiddleware);

businessRoutes.get('/', async (c) => {
  const user = c.get('user');
  return c.json(await businessService.get(user.businessId));
});

businessRoutes.put('/', async (c) => {
  const user = c.get('user');
  const input = await parseBody(c, updateBusinessSchema);
  return c.json(await businessService.update(user.businessId, input));
});
