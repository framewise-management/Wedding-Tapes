import { Hono } from 'hono';
import type { AuthedVariables } from '../middleware/auth';
import { authMiddleware } from '../middleware/auth';
import { parseBody, parseQuery, parseUuidParam } from '../lib/validate';
import { createTermSchema, listTermsQuerySchema, updateTermSchema } from '../schemas/terms';
import { termService } from '../services/terms';

export const termsRoutes = new Hono<{ Variables: AuthedVariables }>();

termsRoutes.use('*', authMiddleware);

termsRoutes.get('/', async (c) => {
  const user = c.get('user');
  const query = parseQuery(c, listTermsQuerySchema);
  return c.json(await termService.findAll(user.businessId, query.active));
});

termsRoutes.post('/', async (c) => {
  const user = c.get('user');
  const input = await parseBody(c, createTermSchema);
  return c.json(await termService.create(user.businessId, input), 201);
});

termsRoutes.get('/:id', async (c) => {
  const user = c.get('user');
  const id = parseUuidParam(c, 'id');
  return c.json(await termService.findOne(user.businessId, id));
});

termsRoutes.put('/:id', async (c) => {
  const user = c.get('user');
  const id = parseUuidParam(c, 'id');
  const input = await parseBody(c, updateTermSchema);
  return c.json(await termService.update(user.businessId, id, input));
});

termsRoutes.delete('/:id', async (c) => {
  const user = c.get('user');
  const id = parseUuidParam(c, 'id');
  await termService.remove(user.businessId, id);
  return c.json({ success: true });
});
