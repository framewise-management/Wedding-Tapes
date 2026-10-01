import { Hono } from 'hono';
import type { AuthedVariables } from '../middleware/auth';
import { authMiddleware } from '../middleware/auth';
import { parseBody } from '../lib/validate';
import { connectAppleCalendarSchema } from '../schemas/business';
import { connectGoogleCalendar } from '../services/google-calendar';
import { getOrCreateCalendarToken } from '../services/calendar';
import {
  connectAppleCalendar,
  disconnectAppleCalendar,
  resyncAppleCalendar,
} from '../services/apple-calendar';

// Mounted under /api/business so the URLs the frontend already calls don't change.
export const calendarIntegrationRoutes = new Hono<{ Variables: AuthedVariables }>();

calendarIntegrationRoutes.use('*', authMiddleware);

calendarIntegrationRoutes.get('/calendar-url', async (c) => {
  const user = c.get('user');
  const token = await getOrCreateCalendarToken(user.businessId);
  return c.json({ url: `${new URL(c.req.url).origin}/api/public/calendar/${token}.ics` });
});

calendarIntegrationRoutes.post('/google-calendar', async (c) => {
  const user = c.get('user');
  return c.json(await connectGoogleCalendar(user.businessId, user.email));
});

calendarIntegrationRoutes.post('/apple-calendar', async (c) => {
  const user = c.get('user');
  const input = await parseBody(c, connectAppleCalendarSchema);
  return c.json(await connectAppleCalendar(user.businessId, input));
});

calendarIntegrationRoutes.post('/apple-calendar/sync', async (c) => {
  const user = c.get('user');
  return c.json(await resyncAppleCalendar(user.businessId));
});

calendarIntegrationRoutes.delete('/apple-calendar', async (c) => {
  const user = c.get('user');
  return c.json(await disconnectAppleCalendar(user.businessId));
});
