import { eq } from 'drizzle-orm';
import type { Db } from '../db/client';
import { proposals } from '../db/schema';
import type { businesses } from '../db/schema';
import type { BusinessService } from './business';

type SyncableProposal = typeof proposals.$inferSelect & {
  customer: { name: string; phone: string | null };
};

export interface CalendarProvider {
  readonly label: string;
  syncProposal(proposal: SyncableProposal, business: typeof businesses.$inferSelect): Promise<void>;
  removeProposalEvent(
    proposal: Pick<typeof proposals.$inferSelect, 'id' | 'businessId' | 'googleEventId'>,
    business: typeof businesses.$inferSelect,
  ): Promise<void>;
}

export class CalendarSyncService {
  constructor(
    private readonly db: Db,
    private readonly business: BusinessService,
    private readonly providers: CalendarProvider[],
  ) {}

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
      const proposal = await this.db.query.proposals.findFirst({
        where: eq(proposals.id, proposalId),
        with: { customer: true },
      });
      if (!proposal) return;
      const business = await this.business.findRow(proposal.businessId);

      await Promise.all(
        this.providers.map((p) =>
          this.bestEffort(`${p.label} sync`, () => p.syncProposal(proposal, business)),
        ),
      );
    });
  }

  async removeProposal(
    proposal: Pick<typeof proposals.$inferSelect, 'id' | 'businessId' | 'googleEventId'>,
  ): Promise<void> {
    await this.bestEffort('Calendar delete', async () => {
      const business = await this.business.findRow(proposal.businessId);

      await Promise.all(
        this.providers.map((p) =>
          this.bestEffort(`${p.label} delete`, () => p.removeProposalEvent(proposal, business)),
        ),
      );
    });
  }
}

