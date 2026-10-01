import { eq } from 'drizzle-orm';
import { db } from '../db/client';
import { proposals } from '../db/schema';
import { findBusinessRow } from './business';
import { removeAppleEvent, syncProposalToApple } from './apple-calendar';
import { removeGoogleEvent, syncProposalToGoogle } from './google-calendar';

// A calendar outage or a revoked connection must never fail the proposal write that triggered it.
async function bestEffort(label: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
  } catch (err) {
    console.error(`${label} failed:`, err);
  }
}

export async function syncProposalToCalendars(proposalId: string): Promise<void> {
  await bestEffort('Calendar sync', async () => {
    const proposal = await db.query.proposals.findFirst({
      where: eq(proposals.id, proposalId),
      with: { customer: true },
    });
    if (!proposal) return;
    const business = await findBusinessRow(proposal.businessId);

    await Promise.all([
      bestEffort('Google Calendar sync', () => syncProposalToGoogle(proposal, business)),
      bestEffort('Apple Calendar sync', () => syncProposalToApple(proposal, business)),
    ]);
  });
}

export async function removeProposalFromCalendars(
  proposal: Pick<typeof proposals.$inferSelect, 'id' | 'businessId' | 'googleEventId'>,
): Promise<void> {
  await bestEffort('Calendar delete', async () => {
    const business = await findBusinessRow(proposal.businessId);

    await Promise.all([
      bestEffort('Google Calendar delete', () => removeGoogleEvent(proposal, business)),
      bestEffort('Apple Calendar delete', () => removeAppleEvent(proposal, business)),
    ]);
  });
}
