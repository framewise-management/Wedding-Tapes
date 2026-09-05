import { Hono } from 'hono';
import type { AuthedVariables } from '../middleware/auth';
import { authMiddleware } from '../middleware/auth';
import { parseBody } from '../lib/validate';
import { updateBusinessSchema } from '../schemas/business';
import { getBusiness, updateBusiness } from '../services/business';
import { getOrCreateCalendarToken } from '../services/calendar';

export const businessRoutes = new Hono<{ Variables: AuthedVariables }>();

businessRoutes.use('*', authMiddleware);

businessRoutes.get('/', async (c) => {
  const user = c.get('user');
  return c.json(await getBusiness(user.businessId));
});

businessRoutes.get('/calendar-url', async (c) => {
  const user = c.get('user');
  const token = await getOrCreateCalendarToken(user.businessId);
  return c.json({ url: `${new URL(c.req.url).origin}/api/public/calendar/${token}.ics` });
});

businessRoutes.put('/', async (c) => {
  const user = c.get('user');
  const input = await parseBody(c, updateBusinessSchema);
  return c.json(await updateBusiness(user.businessId, input));
});
