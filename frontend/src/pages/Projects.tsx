import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiGet, apiPatch } from '../api/client';
import type { Proposal } from '../types/proposal';
import { formatDateRange } from '../lib/dates';
import './Projects.css';
import { formatDate, money } from '../lib/format';

type Tab = 'active' | 'closed' | 'archived';

const TABS: { key: Tab; label: string }[] = [
  { key: 'active', label: 'Active' },
  { key: 'closed', label: 'Closed' },
  { key: 'archived', label: 'Archived' },
];

function matchesTab(p: Proposal, tab: Tab): boolean {
  if (tab === 'archived') return true;
  if (tab === 'active') return p.status === 'DRAFT' || p.status === 'SENT';
  return p.status === 'ACCEPTED' || p.status === 'REJECTED';
}

export default function Projects() {
  const [loaded, setLoaded] = useState<{ archived: boolean; items: Proposal[] } | null>(null);
  const [tab, setTab] = useState<Tab>('active');
  const [error, setError] = useState('');

  const archivedView = tab === 'archived';

  useEffect(() => {
    let cancelled = false;
    apiGet<Proposal[]>(`/api/proposals?archived=${archivedView}`)
      .then((items) => {
        if (!cancelled) setLoaded({ archived: archivedView, items });
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load projects');
      });
    return () => {
      cancelled = true;
    };
  }, [archivedView]);

  async function toggleArchived(p: Proposal) {
    setError('');
    try {
      const updated = await apiPatch<Proposal>(`/api/proposals/${p.id}/archive`, {
        archived: !p.isArchived,
      });
      setLoaded((prev) => prev && { ...prev, items: prev.items.filter((x) => x.id !== updated.id) });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update project');
    }
  }

  const filtered = loaded?.archived === archivedView ? loaded.items.filter((p) => matchesTab(p, tab)) : null;

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
            {loaded && loaded.archived === (t.key === 'archived') && (
              <span className="proj-tab-count">{loaded.items.filter((p) => matchesTab(p, t.key)).length}</span>
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
