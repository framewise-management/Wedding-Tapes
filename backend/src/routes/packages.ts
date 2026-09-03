import { Hono } from 'hono';
import type { AuthedVariables } from '../middleware/auth';
import { authMiddleware } from '../middleware/auth';
import { parseBody, parseQuery, parseUuidParam } from '../lib/validate';
import {
  addPackageServiceSchema,
  createPackageSchema,
  listPackagesQuerySchema,
  updatePackageSchema,
} from '../schemas/packages';
import {
  addPackageService,
  createPackage,
  findAllPackages,
  findOnePackage,
  removePackage,
  removePackageService,
  updatePackage,
} from '../services/packages';

export const packagesRoutes = new Hono<{ Variables: AuthedVariables }>();

packagesRoutes.use('*', authMiddleware);

packagesRoutes.get('/', async (c) => {
  const user = c.get('user');
  const query = parseQuery(c, listPackagesQuerySchema);
  return c.json(await findAllPackages(user.businessId, query.active));
});

packagesRoutes.post('/', async (c) => {
  const user = c.get('user');
  const input = await parseBody(c, createPackageSchema);
  return c.json(await createPackage(user.businessId, input), 201);
});

packagesRoutes.get('/:id', async (c) => {
  const user = c.get('user');
  const id = parseUuidParam(c, 'id');
  return c.json(await findOnePackage(user.businessId, id));
});

packagesRoutes.put('/:id', async (c) => {
  const user = c.get('user');
  const id = parseUuidParam(c, 'id');
  const input = await parseBody(c, updatePackageSchema);
  return c.json(await updatePackage(user.businessId, id, input));
});

packagesRoutes.delete('/:id', async (c) => {
  const user = c.get('user');
  const id = parseUuidParam(c, 'id');
  await removePackage(user.businessId, id);
  return c.json({ success: true });
});

packagesRoutes.post('/:id/services', async (c) => {
  const user = c.get('user');
  const id = parseUuidParam(c, 'id');
  const input = await parseBody(c, addPackageServiceSchema);
  return c.json(await addPackageService(user.businessId, id, input), 201);
});

packagesRoutes.delete('/:id/services/:serviceId', async (c) => {
  const user = c.get('user');
  const id = parseUuidParam(c, 'id');
  const serviceId = parseUuidParam(c, 'serviceId');
  return c.json(await removePackageService(user.businessId, id, serviceId));
});
