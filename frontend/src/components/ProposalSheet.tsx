import type { Proposal, ProposalEvent } from '../types/proposal';
import type { Business } from '../types/business';

function money(value: number): string {
  return `₹${value.toLocaleString('en-IN')}`;
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function shortDate(value: string): string {
  return new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

/**
 * Orders lines by their ceremony (schedule order, unassigned last) and labels
 * each with its group heading. All-null groups render exactly as before.
 */
function groupByEvent<T extends { proposalEventId: string | null }>(
  events: ProposalEvent[],
  items: T[],
): { group: string | null; items: T[] }[] {
  const order = new Map(events.map((e, i) => [e.id, i]));
  const labels = new Map(events.map((e) => [e.id, `${e.name} · ${shortDate(e.date)}`]));
  const groups = new Map<string, { group: string | null; rank: number; items: T[] }>();
  for (const item of items) {
    const id = item.proposalEventId;
    const key = id ?? '';
    if (!groups.has(key)) {
      groups.set(key, {
        group: (id && labels.get(id)) || null,
        rank: id ? order.get(id) ?? Number.MAX_SAFE_INTEGER : Number.MAX_SAFE_INTEGER,
        items: [],
      });
    }
    groups.get(key)!.items.push(item);
  }
  return [...groups.values()].sort((a, b) => a.rank - b.rank);
}

function GroupHeading({ label, show }: { label: string | null; show: boolean }) {
  if (!show) return null;
  return <p className="pv-event-group">{label ?? 'All events'}</p>;
}

function EventLine({ event, fallbackLocation }: { event: ProposalEvent; fallbackLocation: string }) {
  return (
    <p className="pv-line">
      <strong>{event.name}</strong> — {formatDate(event.date)}
      <span className="pv-muted"> · {event.location ?? fallbackLocation}</span>
    </p>
  );
}

export default function ProposalSheet({
  proposal,
  business,
}: {
  proposal: Proposal;
  business: Business;
}) {
  const includedItems = proposal.items.filter((i) => !i.isOptional);
  const optionalItems = proposal.items.filter((i) => i.isOptional);
  const hasEventGroups = [...proposal.packages, ...proposal.items].some(
    (line) => line.proposalEventId,
  );

  return (
    <div className="pv-sheet">
      <div className="pv-business-row">
        <div className="pv-business-identity">
          {business.logo && <img className="pv-logo" src={business.logo} alt="" />}
          <div>
            <p className="pv-business-name">{business.name}</p>
            <div className="pv-business-contact">
              {business.phone && <span>{business.phone}</span>}
              {business.email && <span>{business.email}</span>}
              {business.website && <span>{business.website}</span>}
              {business.instagram && <span>{business.instagram}</span>}
            </div>
            {business.address && <p className="pv-business-address">{business.address}</p>}
          </div>
        </div>
        <div className="pv-proposal-meta">
          <p className="pv-proposal-number">{proposal.proposalNumber}</p>
          {proposal.validUntil && (
            <p className="pv-valid-until">Valid until {formatDate(proposal.validUntil)}</p>
          )}
        </div>
      </div>

      <section className="pv-section">
        <h2>Customer</h2>
        <p className="pv-line">{proposal.customer.name}</p>
        <p className="pv-line pv-muted">{proposal.customer.phone}</p>
        {proposal.customer.email && <p className="pv-line pv-muted">{proposal.customer.email}</p>}
      </section>

      <section className="pv-section">
        <h2>{proposal.events.length > 1 ? 'Event schedule' : 'Wedding details'}</h2>
        {proposal.events.length ? (
          proposal.events.map((e) => (
            <EventLine key={e.id} event={e} fallbackLocation={proposal.weddingLocation} />
          ))
        ) : (
          <p className="pv-line">{formatDate(proposal.weddingDate)} — {proposal.weddingLocation}</p>
        )}
        {proposal.numberOfDays != null && (
          <p className="pv-line pv-muted">{proposal.numberOfDays} day{proposal.numberOfDays === 1 ? '' : 's'}</p>
        )}
      </section>

      {proposal.packages.length > 0 && (
        <section className="pv-section">
          <h2>Selected packages</h2>
          {groupByEvent(proposal.events, proposal.packages).map((g) => (
            <div key={g.group ?? 'all'}>
              <GroupHeading label={g.group} show={hasEventGroups} />
              {g.items.map((p) => (
                <div className="pv-line-item" key={p.id}>
                  <div>
                    <p className="pv-line-item-name">
                      {p.packageName}{p.quantity > 1 ? ` × ${p.quantity}` : ''}
                    </p>
                    {p.packageDescription && <p className="pv-line-item-desc">{p.packageDescription}</p>}
                  </div>
                  <span className="pv-line-item-total">{money(p.total)}</span>
                </div>
              ))}
            </div>
          ))}
        </section>
      )}

      {includedItems.length > 0 && (
        <section className="pv-section">
          <h2>Selected services</h2>
          {groupByEvent(proposal.events, includedItems).map((g) => (
            <div key={g.group ?? 'all'}>
              <GroupHeading label={g.group} show={hasEventGroups} />
              {g.items.map((i) => (
                <div className="pv-line-item" key={i.id}>
                  <div>
                    <p className="pv-line-item-name">
                      {i.serviceName}{i.quantity > 1 ? ` × ${i.quantity}` : ''}
                    </p>
                    {i.description && <p className="pv-line-item-desc">{i.description}</p>}
                  </div>
                  <span className="pv-line-item-total">{money(i.total)}</span>
                </div>
              ))}
            </div>
          ))}
        </section>
      )}

      {optionalItems.length > 0 && (
        <section className="pv-section">
          <h2>Optional services</h2>
          <p className="pv-section-sub">Not included in the total unless added.</p>
          {groupByEvent(proposal.events, optionalItems).map((g) => (
            <div key={g.group ?? 'all'}>
              <GroupHeading label={g.group} show={hasEventGroups} />
              {g.items.map((i) => (
                <div className="pv-line-item" key={i.id}>
                  <div>
                    <p className="pv-line-item-name">
                      {i.serviceName}{i.quantity > 1 ? ` × ${i.quantity}` : ''}
                    </p>
                    {i.description && <p className="pv-line-item-desc">{i.description}</p>}
                  </div>
                  <span className="pv-line-item-total">{money(i.total)}</span>
                </div>
              ))}
            </div>
          ))}
        </section>
      )}

      <section className="pv-section">
        <h2>Pricing</h2>
        <div className="pv-pricing-row"><span>Subtotal</span><span>{money(proposal.subtotal)}</span></div>
        {proposal.discountAmount > 0 && (
          <div className="pv-pricing-row"><span>Discount</span><span>−{money(proposal.discountAmount)}</span></div>
        )}
        {proposal.taxAmount > 0 && (
          <div className="pv-pricing-row"><span>Tax ({proposal.taxRate}%)</span><span>+{money(proposal.taxAmount)}</span></div>
        )}
        <div className="pv-pricing-row pv-total"><span>Final total</span><span>{money(proposal.total)}</span></div>
      </section>

      {business.defaultTerms && (
        <section className="pv-section">
          <h2>Terms &amp; conditions</h2>
          <p className="pv-terms">{business.defaultTerms}</p>
        </section>
      )}
    </div>
  );
}
