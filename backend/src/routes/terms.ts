import { Hono } from 'hono';
import type { AuthedVariables } from '../middleware/auth';
import { authMiddleware } from '../middleware/auth';
import { parseBody, parseQuery, parseUuidParam } from '../lib/validate';
import { createTermSchema, listTermsQuerySchema, updateTermSchema } from '../schemas/terms';
import { createTerm, findAllTerms, findOneTerm, removeTerm, updateTerm } from '../services/terms';

export const termsRoutes = new Hono<{ Variables: AuthedVariables }>();

termsRoutes.use('*', authMiddleware);

termsRoutes.get('/', async (c) => {
  const user = c.get('user');
  const query = parseQuery(c, listTermsQuerySchema);
  return c.json(await findAllTerms(user.businessId, query.active));
});

termsRoutes.post('/', async (c) => {
  const user = c.get('user');
  const input = await parseBody(c, createTermSchema);
  return c.json(await createTerm(user.businessId, input), 201);
});

termsRoutes.get('/:id', async (c) => {
  const user = c.get('user');
  const id = parseUuidParam(c, 'id');
  return c.json(await findOneTerm(user.businessId, id));
});

termsRoutes.put('/:id', async (c) => {
  const user = c.get('user');
  const id = parseUuidParam(c, 'id');
  const input = await parseBody(c, updateTermSchema);
  return c.json(await updateTerm(user.businessId, id, input));
});

termsRoutes.delete('/:id', async (c) => {
  const user = c.get('user');
  const id = parseUuidParam(c, 'id');
  await removeTerm(user.businessId, id);
  return c.json({ success: true });
});
