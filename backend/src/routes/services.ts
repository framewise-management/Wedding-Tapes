import { Hono } from 'hono';
import type { AuthedVariables } from '../middleware/auth';
import { authMiddleware } from '../middleware/auth';
import { parseBody, parseQuery, parseUuidParam } from '../lib/validate';
import {
  createServiceSchema,
  listServicesQuerySchema,
  updateServiceSchema,
} from '../schemas/services';
import { serviceCatalog } from '../services';

export const servicesRoutes = new Hono<{ Variables: AuthedVariables }>();

servicesRoutes.use('*', authMiddleware);

servicesRoutes.get('/', async (c) => {
  const user = c.get('user');
  const query = parseQuery(c, listServicesQuerySchema);
  return c.json(await serviceCatalog.findAll(user.businessId, query.active));
});

servicesRoutes.post('/', async (c) => {
  const user = c.get('user');
  const input = await parseBody(c, createServiceSchema);
  return c.json(await serviceCatalog.create(user.businessId, input), 201);
});

servicesRoutes.get('/:id', async (c) => {
  const user = c.get('user');
  const id = parseUuidParam(c, 'id');
  return c.json(await serviceCatalog.findOne(user.businessId, id));
});

servicesRoutes.put('/:id', async (c) => {
  const user = c.get('user');
  const id = parseUuidParam(c, 'id');
  const input = await parseBody(c, updateServiceSchema);
  return c.json(await serviceCatalog.update(user.businessId, id, input));
});

servicesRoutes.delete('/:id', async (c) => {
  const user = c.get('user');
  const id = parseUuidParam(c, 'id');
  await serviceCatalog.remove(user.businessId, id);
  return c.json({ success: true });
});
