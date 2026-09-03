import { Hono } from 'hono';
import { parseUuidParam } from '../lib/validate';
import { findProposalById, incrementShareViewCount } from '../services/proposals';
import { getBusiness } from '../services/business';
import { generateProposalPdf, proposalPdfContentDisposition } from '../pdf';

// Unauthenticated by design: a proposal's id doubles as its share-link
// token, so anyone with the link (but only with the link) can view it.
export const publicProposalsRoutes = new Hono();

publicProposalsRoutes.get('/:id', async (c) => {
  const id = parseUuidParam(c, 'id');
  const proposal = await findProposalById(id);
  const business = await getBusiness(proposal.businessId);
  await incrementShareViewCount(id);
  return c.json({ proposal, business });
});

publicProposalsRoutes.get('/:id/pdf', async (c) => {
  const id = parseUuidParam(c, 'id');
  const proposal = await findProposalById(id);
  const business = await getBusiness(proposal.businessId);
  const pdf = await generateProposalPdf(proposal, business);
  return c.body(new Uint8Array(pdf), 200, {
    'Content-Type': 'application/pdf',
    'Content-Disposition': proposalPdfContentDisposition(proposal.proposalNumber),
  });
});
