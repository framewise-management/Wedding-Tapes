import { Hono } from 'hono';
import type { AuthedVariables } from '../middleware/auth';
import { authMiddleware } from '../middleware/auth';
import { parseBody, parseQuery, parseUuidParam } from '../lib/validate';
import {
  createEnquirySchema,
  listEnquiriesQuerySchema,
  updateEnquirySchema,
} from '../schemas/enquiries';
import {
  createEnquiry,
  deleteEnquiry,
  findAllEnquiries,
  findOneEnquiry,
  updateEnquiry,
} from '../services/enquiries';

export const enquiriesRoutes = new Hono<{ Variables: AuthedVariables }>();

enquiriesRoutes.use('*', authMiddleware);

enquiriesRoutes.post('/', async (c) => {
  const input = await parseBody(c, createEnquirySchema);
  const user = c.get('user');
  const enquiry = await createEnquiry({ ...input, businessId: user.businessId });
  return c.json(enquiry, 201);
});

enquiriesRoutes.get('/', async (c) => {
  const input = parseQuery(c, listEnquiriesQuerySchema);
  const user = c.get('user');
  const enquiries = await findAllEnquiries(user.businessId, input);
  return c.json(enquiries);
});

enquiriesRoutes.get('/:id', async (c) => {
  const id = parseUuidParam(c, 'id');
  const user = c.get('user');
  return c.json(await findOneEnquiry(user.businessId, id));
});

enquiriesRoutes.put('/:id', async (c) => {
  const id = parseUuidParam(c, 'id');
  const input = await parseBody(c, updateEnquirySchema);
  const user = c.get('user');
  return c.json(await updateEnquiry(user.businessId, id, input));
});

enquiriesRoutes.delete('/:id', async (c) => {
  const id = parseUuidParam(c, 'id');
  const user = c.get('user');
  return c.json(await deleteEnquiry(user.businessId, id));
});
