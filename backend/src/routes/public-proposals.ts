import { Hono } from 'hono';
import { parseUuidParam } from '../lib/validate';
import { proposalService, businessService } from '../services';
import { generateProposalPdf, proposalPdfContentDisposition } from '../pdf';

// Unauthenticated by design: a proposal's id doubles as its share-link
// token, so anyone with the link (but only with the link) can view it.
export const publicProposalsRoutes = new Hono();

publicProposalsRoutes.get('/:id', async (c) => {
  const id = parseUuidParam(c, 'id');
  const proposal = await proposalService.findById(id);
  const business = await businessService.get(proposal.businessId);
  await proposalService.incrementShareViewCount(id);
  return c.json({ proposal, business });
});

publicProposalsRoutes.get('/:id/pdf', async (c) => {
  const id = parseUuidParam(c, 'id');
  const proposal = await proposalService.findById(id);
  const business = await businessService.get(proposal.businessId);
  const pdf = await generateProposalPdf(proposal, business);
  return c.body(new Uint8Array(pdf), 200, {
    'Content-Type': 'application/pdf',
    'Content-Disposition': proposalPdfContentDisposition(proposal.proposalNumber),
  });
});
