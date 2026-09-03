import { Hono } from 'hono';
import type { AuthedVariables } from '../middleware/auth';
import { authMiddleware } from '../middleware/auth';
import { parseBody, parseQuery, parseUuidParam } from '../lib/validate';
import {
  calculateProposalSchema,
  createProposalSchema,
  listProposalsQuerySchema,
  updateProposalSchema,
  updateProposalStatusSchema,
} from '../schemas/proposals';
import {
  calculateProposal,
  createProposal,
  findAllProposals,
  findOneProposal,
  removeProposal,
  shareProposal,
  updateProposal,
  updateProposalStatus,
} from '../services/proposals';
import { getBusiness } from '../services/business';
import { generateProposalPdf, proposalPdfContentDisposition } from '../pdf';

export const proposalsRoutes = new Hono<{ Variables: AuthedVariables }>();

proposalsRoutes.use('*', authMiddleware);

proposalsRoutes.get('/', async (c) => {
  const user = c.get('user');
  const query = parseQuery(c, listProposalsQuerySchema);
  return c.json(await findAllProposals(user.businessId, query));
});

proposalsRoutes.post('/', async (c) => {
  const user = c.get('user');
  const input = await parseBody(c, createProposalSchema);
  return c.json(await createProposal(user.businessId, input), 201);
});

proposalsRoutes.get('/:id', async (c) => {
  const user = c.get('user');
  const id = parseUuidParam(c, 'id');
  return c.json(await findOneProposal(user.businessId, id));
});

proposalsRoutes.put('/:id', async (c) => {
  const user = c.get('user');
  const id = parseUuidParam(c, 'id');
  const input = await parseBody(c, updateProposalSchema);
  return c.json(await updateProposal(user.businessId, id, input));
});

proposalsRoutes.delete('/:id', async (c) => {
  const user = c.get('user');
  const id = parseUuidParam(c, 'id');
  await removeProposal(user.businessId, id);
  return c.json({ success: true });
});

proposalsRoutes.post('/:id/calculate', async (c) => {
  const user = c.get('user');
  const id = parseUuidParam(c, 'id');
  const input = await parseBody(c, calculateProposalSchema);
  return c.json(await calculateProposal(user.businessId, id, input), 201);
});

proposalsRoutes.patch('/:id/status', async (c) => {
  const user = c.get('user');
  const id = parseUuidParam(c, 'id');
  const input = await parseBody(c, updateProposalStatusSchema);
  return c.json(await updateProposalStatus(user.businessId, id, input.status));
});

proposalsRoutes.post('/:id/share', async (c) => {
  const user = c.get('user');
  const id = parseUuidParam(c, 'id');
  return c.json(await shareProposal(user.businessId, id));
});

proposalsRoutes.post('/:id/generate-pdf', async (c) => {
  const user = c.get('user');
  const id = parseUuidParam(c, 'id');
  const [proposal, business] = await Promise.all([
    findOneProposal(user.businessId, id),
    getBusiness(user.businessId),
  ]);
  const pdf = await generateProposalPdf(proposal, business);
  return c.body(new Uint8Array(pdf), 200, {
    'Content-Type': 'application/pdf',
    'Content-Disposition': proposalPdfContentDisposition(proposal.proposalNumber),
  });
});
