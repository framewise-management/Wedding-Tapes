import type { Proposal } from '../types/proposal';
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

export default function ProposalSheet({
  proposal,
  business,
}: {
  proposal: Proposal;
  business: Business;
}) {
  const includedItems = proposal.items.filter((i) => !i.isOptional);
  const optionalItems = proposal.items.filter((i) => i.isOptional);

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
        <h2>Wedding details</h2>
        <p className="pv-line">{formatDate(proposal.weddingDate)} — {proposal.weddingLocation}</p>
        {proposal.numberOfDays != null && (
          <p className="pv-line pv-muted">{proposal.numberOfDays} day{proposal.numberOfDays === 1 ? '' : 's'}</p>
        )}
      </section>

      {proposal.packages.length > 0 && (
        <section className="pv-section">
          <h2>Selected packages</h2>
          {proposal.packages.map((p) => (
            <div className="pv-line-item" key={p.id}>
              <div>
                <p className="pv-line-item-name">{p.packageName}{p.quantity > 1 ? ` × ${p.quantity}` : ''}</p>
                {p.packageDescription && <p className="pv-line-item-desc">{p.packageDescription}</p>}
              </div>
              <span className="pv-line-item-total">{money(p.total)}</span>
            </div>
          ))}
        </section>
      )}

      {includedItems.length > 0 && (
        <section className="pv-section">
          <h2>Selected services</h2>
          {includedItems.map((i) => (
            <div className="pv-line-item" key={i.id}>
              <div>
                <p className="pv-line-item-name">{i.serviceName}{i.quantity > 1 ? ` × ${i.quantity}` : ''}</p>
                {i.description && <p className="pv-line-item-desc">{i.description}</p>}
              </div>
              <span className="pv-line-item-total">{money(i.total)}</span>
            </div>
          ))}
        </section>
      )}

      {optionalItems.length > 0 && (
        <section className="pv-section">
          <h2>Optional services</h2>
          <p className="pv-section-sub">Not included in the total unless added.</p>
          {optionalItems.map((i) => (
            <div className="pv-line-item" key={i.id}>
              <div>
                <p className="pv-line-item-name">{i.serviceName}{i.quantity > 1 ? ` × ${i.quantity}` : ''}</p>
                {i.description && <p className="pv-line-item-desc">{i.description}</p>}
              </div>
              <span className="pv-line-item-total">{money(i.total)}</span>
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
