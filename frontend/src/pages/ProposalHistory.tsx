import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiDelete, apiGet } from '../api/client';
import type { Proposal, ProposalStatus } from '../types/proposal';
import './ProposalHistory.css';

const STATUSES: ProposalStatus[] = ['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED'];

function money(value: number): string {
  return `₹${value.toLocaleString('en-IN')}`;
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function ProposalHistory() {
  const [proposals, setProposals] = useState<Proposal[] | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'' | ProposalStatus>('');
  const [error, setError] = useState('');

  function load(currentSearch: string, currentStatus: string) {
    const params = new URLSearchParams();
    if (currentSearch) params.set('search', currentSearch);
    if (currentStatus) params.set('status', currentStatus);
    const query = params.toString();
    apiGet<Proposal[]>(`/api/proposals${query ? `?${query}` : ''}`)
      .then(setProposals)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load proposals'));
  }

  useEffect(() => {
    const timer = setTimeout(() => load(search, status), 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, status]);

  async function deleteProposal(proposal: Proposal) {
    if (!confirm(`Delete proposal ${proposal.proposalNumber}? This can't be undone.`)) return;
    setError('');
    try {
      await apiDelete(`/api/proposals/${proposal.id}`);
      load(search, status);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete proposal');
    }
  }

  return (
    <div className="ph-container">
      <div className="ph-page-header">
        <div>
          <h1 className="ph-title">Proposals</h1>
          <p className="ph-subtitle">Every quotation you've built, searchable by customer.</p>
        </div>
        <Link to="/proposals/new" className="ph-add-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          New Proposal
        </Link>
      </div>

      {error && <div className="ph-error-banner">{error}</div>}

      <div className="ph-filters">
        <input
          className="ph-search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by customer name…"
        />
        <select className="ph-status-filter" value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="ph-table">
        <div className="ph-table-head">
          <span>Proposal</span>
          <span>Customer</span>
          <span>Wedding date</span>
          <span>Total</span>
          <span>Status</span>
          <span>Views</span>
          <span>Updated</span>
          <span></span>
        </div>

        {proposals === null ? (
          <div className="ph-empty">Loading…</div>
        ) : proposals.length === 0 ? (
          <div className="ph-empty">
            {search || status ? 'No proposals match your filters.' : 'No proposals yet. Create your first one.'}
          </div>
        ) : (
          proposals.map((p) => (
            <div className="ph-table-row" key={p.id}>
              <Link
                to={p.status === 'DRAFT' ? `/proposals/${p.id}/edit` : `/proposals/${p.id}/preview`}
                className="ph-cell-number ph-row-link"
              >
                {p.proposalNumber}
              </Link>
              <span className="ph-cell-customer">{p.customer.name}</span>
              <span className="ph-cell-date">{formatDate(p.weddingDate)}</span>
              <span className="ph-cell-total">{money(p.total)}</span>
              <span className={`ph-status ph-status-${p.status.toLowerCase()}`}>{p.status}</span>
              <span className="ph-cell-date">{p.shareViewCount || '—'}</span>
              <span className="ph-cell-date">{formatDate(p.updatedAt)}</span>
              <button
                type="button"
                className="ph-delete-btn"
                aria-label="Delete"
                onClick={() => deleteProposal(p)}
              >
                Delete
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
