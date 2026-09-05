import { Hono } from 'hono';
import type { AuthedVariables } from '../middleware/auth';
import { authMiddleware } from '../middleware/auth';
import { parseBody } from '../lib/validate';
import { updateBusinessSchema } from '../schemas/business';
import { getBusiness, updateBusiness } from '../services/business';
import { connectGoogleCalendar } from '../services/google-calendar';

export const businessRoutes = new Hono<{ Variables: AuthedVariables }>();

businessRoutes.use('*', authMiddleware);

businessRoutes.get('/', async (c) => {
  const user = c.get('user');
  return c.json(await getBusiness(user.businessId));
});

businessRoutes.post('/google-calendar', async (c) => {
  const user = c.get('user');
  return c.json(await connectGoogleCalendar(user.businessId, user.email));
});

businessRoutes.put('/', async (c) => {
  const user = c.get('user');
  const input = await parseBody(c, updateBusinessSchema);
  return c.json(await updateBusiness(user.businessId, input));
});
