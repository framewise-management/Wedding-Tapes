import { Hono } from 'hono';
import type { AuthedVariables } from '../middleware/auth';
import { authMiddleware } from '../middleware/auth';
import { parseBody } from '../lib/validate';
import { connectAppleCalendarSchema, updateBusinessSchema } from '../schemas/business';
import { getBusiness, updateBusiness } from '../services/business';
import { connectGoogleCalendar } from '../services/google-calendar';
import { getOrCreateCalendarToken } from '../services/calendar';
import {
  connectAppleCalendar,
  disconnectAppleCalendar,
  resyncAppleCalendar,
} from '../services/apple-calendar';

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

businessRoutes.post('/google-calendar', async (c) => {
  const user = c.get('user');
  return c.json(await connectGoogleCalendar(user.businessId, user.email));
});

businessRoutes.post('/apple-calendar', async (c) => {
  const user = c.get('user');
  const input = await parseBody(c, connectAppleCalendarSchema);
  return c.json(await connectAppleCalendar(user.businessId, input));
});

businessRoutes.post('/apple-calendar/sync', async (c) => {
  const user = c.get('user');
  return c.json(await resyncAppleCalendar(user.businessId));
});

businessRoutes.delete('/apple-calendar', async (c) => {
  const user = c.get('user');
  return c.json(await disconnectAppleCalendar(user.businessId));
});

businessRoutes.put('/', async (c) => {
  const user = c.get('user');
  const input = await parseBody(c, updateBusinessSchema);
  return c.json(await updateBusiness(user.businessId, input));
});
