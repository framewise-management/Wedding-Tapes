import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { sql } from 'drizzle-orm';
import { db } from './db/client';
import { businesses } from './db/schema';
import { errorHandler } from './middleware/error';
import { authRoutes } from './routes/auth';
import { businessRoutes } from './routes/business';
import { servicesRoutes } from './routes/services';
import { packagesRoutes } from './routes/packages';
import { customersRoutes } from './routes/customers';
import { proposalsRoutes } from './routes/proposals';
import { publicProposalsRoutes } from './routes/public-proposals';

const app = new Hono();

const LOCALHOST_ORIGIN = /^http:\/\/localhost:\d+$/;
app.use('*', cors({ origin: (origin) => (LOCALHOST_ORIGIN.test(origin) ? origin : undefined) }));
app.onError(errorHandler);

app.get('/', (c) => c.text('Hello World!'));

app.get('/health', async (c) => {
  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(businesses);
  return c.json({ status: 'ok', businessCount: count });
});

app.route('/api/auth', authRoutes);
app.route('/api/business', businessRoutes);
app.route('/api/services', servicesRoutes);
app.route('/api/packages', packagesRoutes);
app.route('/api/customers', customersRoutes);
app.route('/api/proposals', proposalsRoutes);
app.route('/api/public/proposals', publicProposalsRoutes);

export default app;
