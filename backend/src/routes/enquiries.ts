import { Hono } from 'hono';
import type { AuthedVariables } from '../middleware/auth';
import { authMiddleware } from '../middleware/auth';
import { parseBody, parseQuery, parseUuidParam } from '../lib/validate';
import {
  createEnquirySchema,
  listEnquiriesQuerySchema,
  updateEnquirySchema,
} from '../schemas/enquiries';
import { enquiryService } from '../services/enquiries';

export const enquiriesRoutes = new Hono<{ Variables: AuthedVariables }>();

enquiriesRoutes.use('*', authMiddleware);

enquiriesRoutes.post('/', async (c) => {
  const input = await parseBody(c, createEnquirySchema);
  const user = c.get('user');
  const enquiry = await enquiryService.create({ ...input, businessId: user.businessId });
  return c.json(enquiry, 201);
});

enquiriesRoutes.get('/', async (c) => {
  const input = parseQuery(c, listEnquiriesQuerySchema);
  const user = c.get('user');
  const enquiries = await enquiryService.findAll(user.businessId, input);
  return c.json(enquiries);
});

enquiriesRoutes.get('/:id', async (c) => {
  const id = parseUuidParam(c, 'id');
  const user = c.get('user');
  return c.json(await enquiryService.findOne(user.businessId, id));
});

enquiriesRoutes.put('/:id', async (c) => {
  const id = parseUuidParam(c, 'id');
  const input = await parseBody(c, updateEnquirySchema);
  const user = c.get('user');
  return c.json(await enquiryService.update(user.businessId, id, input));
});

enquiriesRoutes.delete('/:id', async (c) => {
  const id = parseUuidParam(c, 'id');
  const user = c.get('user');
  return c.json(await enquiryService.remove(user.businessId, id));
});

enquiriesRoutes.post('/:id/convert', async (c) => {
  const id = parseUuidParam(c, 'id');
  const user = c.get('user');
  return c.json(await enquiryService.convertToProposal(user.businessId, id), 201);
});
