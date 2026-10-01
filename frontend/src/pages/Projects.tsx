import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiGet, apiPatch } from '../api/client';
import type { Proposal } from '../types/proposal';
import { formatDateRange } from '../lib/dates';
import './Projects.css';

type Tab = 'active' | 'closed' | 'archived';

const TABS: { key: Tab; label: string }[] = [
  { key: 'active', label: 'Active' },
  { key: 'closed', label: 'Closed' },
  { key: 'archived', label: 'Archived' },
];

function money(value: number): string {
  return `₹${value.toLocaleString('en-IN')}`;
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function matchesTab(p: Proposal, tab: Tab): boolean {
  if (tab === 'archived') return p.isArchived;
  if (p.isArchived) return false;
  if (tab === 'active') return p.status === 'DRAFT' || p.status === 'SENT';
  return p.status === 'ACCEPTED' || p.status === 'REJECTED';
}

export default function Projects() {
  const [proposals, setProposals] = useState<Proposal[] | null>(null);
  const [tab, setTab] = useState<Tab>('active');
  const [error, setError] = useState('');

  function load() {
    apiGet<Proposal[]>('/api/proposals')
      .then(setProposals)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load projects'));
  }

  useEffect(load, []);

  async function toggleArchived(p: Proposal) {
    setError('');
    try {
      const updated = await apiPatch<Proposal>(`/api/proposals/${p.id}/archive`, {
        archived: !p.isArchived,
      });
      setProposals((prev) => prev?.map((x) => (x.id === updated.id ? updated : x)) ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update project');
    }
  }

  const filtered = proposals?.filter((p) => matchesTab(p, tab)) ?? null;

  return (
    <div className="proj-container">
      <div className="proj-page-header">
        <div>
          <h1 className="proj-title">Projects</h1>
          <p className="proj-subtitle">Every proposal, grouped by where it stands.</p>
        </div>
      </div>

      {error && <div className="proj-error-banner">{error}</div>}

      <div className="proj-tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            className={`proj-tab${tab === t.key ? ' active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
            {proposals && (
              <span className="proj-tab-count">{proposals.filter((p) => matchesTab(p, t.key)).length}</span>
            )}
          </button>
        ))}
      </div>

      <div className="proj-table">
        <div className="proj-table-head">
          <span>Proposal</span>
          <span>Client</span>
          <span>Wedding date</span>
          <span>Total</span>
          <span>Status</span>
          <span></span>
        </div>

        {filtered === null ? (
          <div className="proj-empty">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="proj-empty">No {tab} projects.</div>
        ) : (
          filtered.map((p) => (
            <div className="proj-table-row" key={p.id}>
              <Link
                to={p.status === 'DRAFT' ? `/proposals/${p.id}/edit` : `/proposals/${p.id}/preview`}
                className="proj-cell-number proj-row-link"
              >
                {p.proposalNumber}
              </Link>
              <span className="proj-cell-customer">{p.customer.name}</span>
              <span className="proj-cell-date">{formatDateRange(p.weddingDate, p.weddingEndDate, formatDate)}</span>
              <span className="proj-cell-total">{money(p.total)}</span>
              <span className={`proj-status proj-status-${p.status.toLowerCase()}`}>{p.status}</span>
              <button type="button" className="proj-archive-btn" onClick={() => toggleArchived(p)}>
                {p.isArchived ? 'Unarchive' : 'Archive'}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
