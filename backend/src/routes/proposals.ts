import { Hono } from 'hono';
import type { AuthedVariables } from '../middleware/auth';
import { authMiddleware } from '../middleware/auth';
import { parseBody, parseQuery, parseUuidParam } from '../lib/validate';
import {
  archiveProposalSchema,
  calculateProposalSchema,
  createProposalSchema,
  generatePdfQuerySchema,
  listProposalsQuerySchema,
  updateProposalSchema,
  updateProposalStatusSchema,
} from '../schemas/proposals';
import { proposalService } from '../services/proposals';
import { businessService } from '../services/business';
import { generateProposalPdf, proposalPdfContentDisposition } from '../pdf';
import { filterProposalToEvent } from '../pdf-shared';
import { NotFoundError } from '../lib/http-error';

export const proposalsRoutes = new Hono<{ Variables: AuthedVariables }>();

proposalsRoutes.use('*', authMiddleware);

proposalsRoutes.get('/', async (c) => {
  const user = c.get('user');
  const query = parseQuery(c, listProposalsQuerySchema);
  return c.json(await proposalService.findAll(user.businessId, query));
});

proposalsRoutes.post('/', async (c) => {
  const user = c.get('user');
  const input = await parseBody(c, createProposalSchema);
  return c.json(await proposalService.create(user.businessId, input), 201);
});

proposalsRoutes.get('/:id', async (c) => {
  const user = c.get('user');
  const id = parseUuidParam(c, 'id');
  return c.json(await proposalService.findOne(user.businessId, id));
});

proposalsRoutes.put('/:id', async (c) => {
  const user = c.get('user');
  const id = parseUuidParam(c, 'id');
  const input = await parseBody(c, updateProposalSchema);
  return c.json(await proposalService.update(user.businessId, id, input));
});

proposalsRoutes.delete('/:id', async (c) => {
  const user = c.get('user');
  const id = parseUuidParam(c, 'id');
  await proposalService.remove(user.businessId, id);
  return c.json({ success: true });
});

proposalsRoutes.post('/:id/calculate', async (c) => {
  const user = c.get('user');
  const id = parseUuidParam(c, 'id');
  const input = await parseBody(c, calculateProposalSchema);
  return c.json(await proposalService.calculate(user.businessId, id, input), 201);
});

proposalsRoutes.patch('/:id/status', async (c) => {
  const user = c.get('user');
  const id = parseUuidParam(c, 'id');
  const input = await parseBody(c, updateProposalStatusSchema);
  return c.json(await proposalService.updateStatus(user.businessId, id, input.status));
});

proposalsRoutes.patch('/:id/archive', async (c) => {
  const user = c.get('user');
  const id = parseUuidParam(c, 'id');
  const input = await parseBody(c, archiveProposalSchema);
  return c.json(await proposalService.setArchived(user.businessId, id, input.archived));
});

proposalsRoutes.post('/:id/share', async (c) => {
  const user = c.get('user');
  const id = parseUuidParam(c, 'id');
  return c.json(await proposalService.share(user.businessId, id));
});

proposalsRoutes.post('/:id/generate-pdf', async (c) => {
  const user = c.get('user');
  const id = parseUuidParam(c, 'id');
  const { eventId } = parseQuery(c, generatePdfQuerySchema);
  const [proposal, business] = await Promise.all([
    proposalService.findOne(user.businessId, id),
    businessService.get(user.businessId),
  ]);
  const scoped = eventId ? filterProposalToEvent(proposal, eventId) : proposal;
  if (!scoped) throw new NotFoundError('Event not found on this proposal');
  const pdf = await generateProposalPdf(scoped, business);
  return c.body(new Uint8Array(pdf), 200, {
    'Content-Type': 'application/pdf',
    'Content-Disposition': proposalPdfContentDisposition(proposal.proposalNumber),
  });
});
