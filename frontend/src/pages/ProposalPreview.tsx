import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { apiDelete, apiGet, apiPatch, apiPostFile } from '../api/client';
import type { Proposal, ProposalStatus } from '../types/proposal';
import type { Business } from '../types/business';
import './ProposalPreview.css';

const STATUSES: ProposalStatus[] = ['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED'];

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

export default function ProposalPreview() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState('');
  const [statusError, setStatusError] = useState('');
  const [deleteError, setDeleteError] = useState('');

  async function handleStatusChange(newStatus: ProposalStatus) {
    if (!id) return;
    setStatusError('');
    try {
      const updated = await apiPatch<Proposal>(`/api/proposals/${id}/status`, { status: newStatus });
      setProposal(updated);
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : 'Failed to update status');
    }
  }

  async function handleDelete() {
    if (!id || !proposal) return;
    if (!confirm(`Delete proposal ${proposal.proposalNumber}? This can't be undone.`)) return;
    setDeleteError('');
    try {
      await apiDelete(`/api/proposals/${id}`);
      navigate('/proposals');
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete proposal');
    }
  }

  async function handleDownloadPdf() {
    if (!id || !proposal) return;
    setDownloading(true);
    setDownloadError('');
    try {
      const blob = await apiPostFile(`/api/proposals/${id}/generate-pdf`);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${proposal.proposalNumber}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : 'Failed to generate PDF');
    } finally {
      setDownloading(false);
    }
  }

  useEffect(() => {
    if (!id) return;
    Promise.all([
      apiGet<Proposal>(`/api/proposals/${id}`),
      apiGet<Business>('/api/business'),
    ])
      .then(([p, b]) => {
        setProposal(p);
        setBusiness(b);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load proposal'));
  }, [id]);

  if (error) return <p className="pv-error">{error}</p>;
  if (!proposal || !business) return <p>Loading…</p>;

  const includedItems = proposal.items.filter((i) => !i.isOptional);
  const optionalItems = proposal.items.filter((i) => i.isOptional);

  return (
    <div className="pv-container">
      <div className="pv-page-header">
        <Link to="/proposals" className="pv-back-link">← Back to proposals</Link>
        <div className="pv-header-actions">
          {statusError && <span className="pv-error">{statusError}</span>}
          {downloadError && <span className="pv-error">{downloadError}</span>}
          {deleteError && <span className="pv-error">{deleteError}</span>}
          {proposal.status === 'DRAFT' && (
            <Link to={`/proposals/${proposal.id}/edit`} className="pv-edit-link">Edit</Link>
          )}
          <button type="button" className="pv-edit-link pv-danger" onClick={handleDelete}>
            Delete
          </button>
          <button type="button" className="pv-download-btn" onClick={handleDownloadPdf} disabled={downloading}>
            {downloading ? 'Generating…' : 'Download PDF'}
          </button>
          <select
            className={`pv-status-select pv-status-${proposal.status.toLowerCase()}`}
            value={proposal.status}
            onChange={(e) => handleStatusChange(e.target.value as ProposalStatus)}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

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
    </div>
  );
}
