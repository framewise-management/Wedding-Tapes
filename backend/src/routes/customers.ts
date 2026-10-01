import { Hono } from 'hono';
import type { AuthedVariables } from '../middleware/auth';
import { authMiddleware } from '../middleware/auth';
import { parseBody, parseQuery, parseUuidParam } from '../lib/validate';
import {
  createCustomerSchema,
  listCustomersQuerySchema,
  updateCustomerSchema,
} from '../schemas/customers';
import { customerService } from '../services/customers';

export const customersRoutes = new Hono<{ Variables: AuthedVariables }>();

customersRoutes.use('*', authMiddleware);

customersRoutes.get('/', async (c) => {
  const user = c.get('user');
  const query = parseQuery(c, listCustomersQuerySchema);
  return c.json(await customerService.findAll(user.businessId, query.search));
});

customersRoutes.post('/', async (c) => {
  const user = c.get('user');
  const input = await parseBody(c, createCustomerSchema);
  return c.json(await customerService.create(user.businessId, input), 201);
});

customersRoutes.get('/:id', async (c) => {
  const user = c.get('user');
  const id = parseUuidParam(c, 'id');
  return c.json(await customerService.findOne(user.businessId, id));
});

customersRoutes.put('/:id', async (c) => {
  const user = c.get('user');
  const id = parseUuidParam(c, 'id');
  const input = await parseBody(c, updateCustomerSchema);
  return c.json(await customerService.update(user.businessId, id, input));
});

customersRoutes.delete('/:id', async (c) => {
  const user = c.get('user');
  const id = parseUuidParam(c, 'id');
  await customerService.remove(user.businessId, id);
  return c.json({ success: true });
});
