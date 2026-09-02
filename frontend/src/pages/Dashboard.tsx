import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiGet } from '../api/client';
import type { Proposal, ProposalStatus } from '../types/proposal';
import './Dashboard.css';

const STAT_STATUSES: ProposalStatus[] = ['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED'];
const RECENT_COUNT = 5;

function money(value: number): string {
  return `₹${value.toLocaleString('en-IN')}`;
}

export default function Dashboard() {
  const [proposals, setProposals] = useState<Proposal[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    apiGet<Proposal[]>('/api/proposals')
      .then(setProposals)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load proposals'));
  }, []);

  if (error) return <p className="db-empty">{error}</p>;
  if (!proposals) return <p>Loading…</p>;

  const counts = STAT_STATUSES.reduce<Record<ProposalStatus, number>>(
    (acc, status) => {
      acc[status] = proposals.filter((p) => p.status === status).length;
      return acc;
    },
    { DRAFT: 0, SENT: 0, ACCEPTED: 0, REJECTED: 0 },
  );
  const recent = proposals.slice(0, RECENT_COUNT);

  return (
    <div className="db-container">
      <div className="db-page-header">
        <div>
          <h1 className="db-title">Dashboard</h1>
          <p className="db-subtitle">Wedding Proposal Generator</p>
        </div>
        <Link to="/proposals/new" className="db-new-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          New Proposal
        </Link>
      </div>

      <section className="db-section">
        <h2>Proposals</h2>
        <div className="db-stat-grid">
          <div className="db-stat-card">
            <span className="db-stat-value">{proposals.length}</span>
            <span className="db-stat-label">Total</span>
          </div>
          {STAT_STATUSES.map((status) => (
            <div className={`db-stat-card db-stat-${status.toLowerCase()}`} key={status}>
              <span className="db-stat-value">{counts[status]}</span>
              <span className="db-stat-label">{status.charAt(0) + status.slice(1).toLowerCase()}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="db-section">
        <h2>Recent Proposals</h2>
        {recent.length === 0 ? (
          <p className="db-empty">No proposals yet. Create your first one.</p>
        ) : (
          <div className="db-recent-list">
            {recent.map((p) => (
              <Link
                key={p.id}
                to={p.status === 'DRAFT' ? `/proposals/${p.id}/edit` : `/proposals/${p.id}/preview`}
                className="db-recent-row"
              >
                <div>
                  <p className="db-recent-number">{p.proposalNumber}</p>
                  <p className="db-recent-customer">{p.customer.name}</p>
                </div>
                <span className="db-recent-total">{money(p.total)}</span>
                <span className={`db-recent-status db-recent-status-${p.status.toLowerCase()}`}>{p.status}</span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
