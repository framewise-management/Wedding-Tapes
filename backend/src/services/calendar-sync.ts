import { eq } from 'drizzle-orm';
import { db } from '../db/client';
import { proposals } from '../db/schema';
import { businessService } from './business';
import { appleCalendarService } from './apple-calendar';
import { googleCalendarService } from './google-calendar';

export class CalendarSyncService {
  // A calendar outage or a revoked connection must never fail the proposal write that triggered it.
  private async bestEffort(label: string, fn: () => Promise<void>): Promise<void> {
    try {
      await fn();
    } catch (err) {
      console.error(`${label} failed:`, err);
    }
  }

  async syncProposal(proposalId: string): Promise<void> {
    await this.bestEffort('Calendar sync', async () => {
      const proposal = await db.query.proposals.findFirst({
        where: eq(proposals.id, proposalId),
        with: { customer: true },
      });
      if (!proposal) return;
      const business = await businessService.findRow(proposal.businessId);

      await Promise.all([
        this.bestEffort('Google Calendar sync', () => googleCalendarService.syncProposal(proposal, business)),
        this.bestEffort('Apple Calendar sync', () => appleCalendarService.syncProposal(proposal, business)),
      ]);
    });
  }

  async removeProposal(
    proposal: Pick<typeof proposals.$inferSelect, 'id' | 'businessId' | 'googleEventId'>,
  ): Promise<void> {
    await this.bestEffort('Calendar delete', async () => {
      const business = await businessService.findRow(proposal.businessId);

      await Promise.all([
        this.bestEffort('Google Calendar delete', () => googleCalendarService.removeProposalEvent(proposal, business)),
        this.bestEffort('Apple Calendar delete', () => appleCalendarService.removeProposalEvent(proposal, business)),
      ]);
    });
  }
}

export const calendarSyncService = new CalendarSyncService();
