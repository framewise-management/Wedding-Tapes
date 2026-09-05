import { Hono } from 'hono';
import { buildCalendarFeed } from '../services/calendar';

// Unauthenticated by design: the token in the URL is the credential, so the
// feed can be handed to Google Calendar, which sends no auth header.
export const calendarRoutes = new Hono();

calendarRoutes.get('/:token', async (c) => {
  const token = c.req.param('token').replace(/\.ics$/, '');
  const feed = await buildCalendarFeed(token);
  return c.body(feed, 200, {
    'Content-Type': 'text/calendar; charset=utf-8',
    'Content-Disposition': 'inline; filename="weddings.ics"',
  });
});
