import { Hono } from 'hono';
import type { AuthedVariables } from '../middleware/auth';
import { authMiddleware } from '../middleware/auth';
import { parseBody, parseQuery, parseUuidParam } from '../lib/validate';
import {
  createCustomerSchema,
  listCustomersQuerySchema,
  updateCustomerSchema,
} from '../schemas/customers';
import {
  createCustomer,
  findAllCustomers,
  findOneCustomer,
  removeCustomer,
  updateCustomer,
} from '../services/customers';

export const customersRoutes = new Hono<{ Variables: AuthedVariables }>();

customersRoutes.use('*', authMiddleware);

customersRoutes.get('/', async (c) => {
  const user = c.get('user');
  const query = parseQuery(c, listCustomersQuerySchema);
  return c.json(await findAllCustomers(user.businessId, query.search));
});

customersRoutes.post('/', async (c) => {
  const user = c.get('user');
  const input = await parseBody(c, createCustomerSchema);
  return c.json(await createCustomer(user.businessId, input), 201);
});

customersRoutes.get('/:id', async (c) => {
  const user = c.get('user');
  const id = parseUuidParam(c, 'id');
  return c.json(await findOneCustomer(user.businessId, id));
});

customersRoutes.put('/:id', async (c) => {
  const user = c.get('user');
  const id = parseUuidParam(c, 'id');
  const input = await parseBody(c, updateCustomerSchema);
  return c.json(await updateCustomer(user.businessId, id, input));
});

customersRoutes.delete('/:id', async (c) => {
  const user = c.get('user');
  const id = parseUuidParam(c, 'id');
  await removeCustomer(user.businessId, id);
  return c.json({ success: true });
});
