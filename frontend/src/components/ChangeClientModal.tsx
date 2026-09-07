import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { apiGet } from '../api/client';
import { PhoneInput } from './PhoneInput';
import type { Customer } from '../types/customer';
import type { Proposal } from '../types/proposal';
import './ChangeClientModal.css';

const PAGE_SIZE = 5;
type Tab = 'all' | 'recent' | 'leads' | 'archived';
const TABS: { key: Tab; label: string }[] = [
  { key: 'all', label: 'All Clients' },
  { key: 'recent', label: 'Recent' },
  { key: 'leads', label: 'Leads' },
  { key: 'archived', label: 'Archived' },
];

function initials(name: string): string {
  return (
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join('') || '—'
  );
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export interface EventSummary {
  type: string;
  dateRange: string;
}

interface EditableFields {
  name: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
}

function toEditable(c: Customer): EditableFields {
  return { name: c.name, phone: c.phone, email: c.email ?? '', address: c.address ?? '', notes: c.notes ?? '' };
}

export default function ChangeClientModal({
  customers,
  currentCustomerId,
  eventSummary,
  onSelect,
  onCreateCustomer,
  onUpdateCustomer,
  onClose,
}: {
  customers: Customer[];
  currentCustomerId: string;
  eventSummary: EventSummary;
  onSelect: (customerId: string) => void;
  onCreateCustomer: (name: string, phone: string) => Promise<Customer>;
  onUpdateCustomer: (id: string, fields: Partial<EditableFields>) => Promise<void>;
  onClose: () => void;
}) {
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<Tab>('all');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState(currentCustomerId);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [previousProposals, setPreviousProposals] = useState<Proposal[] | null>(null);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<EditableFields | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Tab and search both narrow the same underlying list, so either one
  // resets pagination back to the first page.
  useEffect(() => {
    setPage(1);
  }, [search, tab]);

  const tabbed = useMemo(() => {
    if (tab === 'leads' || tab === 'archived') return [];
    if (tab === 'recent') return [...customers].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return customers;
  }, [customers, tab]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tabbed;
    return tabbed.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        (c.email ?? '').toLowerCase().includes(q),
    );
  }, [tabbed, search]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageStart = (page - 1) * PAGE_SIZE;
  const pageRows = filtered.slice(pageStart, pageStart + PAGE_SIZE);

  const selected = customers.find((c) => c.id === selectedId) ?? null;

  useEffect(() => {
    setEditing(false);
    setEditForm(selected ? toEditable(selected) : null);
    // Reset to the loading state on every switch -- otherwise the previous
    // customer's (possibly empty) result flashes for the duration of the new
    // fetch and reads as "this client has no proposals" while it's unknown.
    setPreviousProposals(null);
    if (!selected) return;
    let cancelled = false;
    apiGet<Proposal[]>(`/api/proposals?customerId=${selected.id}`)
      .then((rows) => {
        if (!cancelled) setPreviousProposals(rows);
      })
      .catch(() => {
        if (!cancelled) setPreviousProposals([]);
      });
    return () => {
      cancelled = true;
    };
  }, [selected?.id]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setCreating(true);
    try {
      const customer = await onCreateCustomer(newName, newPhone);
      setSelectedId(customer.id);
      setAdding(false);
      setNewName('');
      setNewPhone('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add client');
    } finally {
      setCreating(false);
    }
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected || !editForm) return;
    setError('');
    setSavingEdit(true);
    try {
      await onUpdateCustomer(selected.id, editForm);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setSavingEdit(false);
    }
  }

  // Portalled to <body> -- this component is opened from inside CreateProposal's
  // own <form>, and its own forms (Add Client, Edit) would otherwise nest
  // illegally inside it. Nested <form> is invalid HTML, and browsers resolve
  // it unpredictably: clicking "Save" here was submitting the OUTER proposal
  // form instead, closing the whole modal.
  return createPortal(
    <div className="ccm-backdrop" onClick={onClose}>
      <div className="ccm-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Change client">
        <div className="ccm-header">
          <div>
            <h2>Change Client</h2>
            <p className="ccm-sub">Select an existing client or add a new one</p>
          </div>
          <button type="button" className="ccm-close" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="ccm-toolbar">
          <input
            className="ccm-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search clients by name, email or phone…"
            autoFocus
          />
          <button type="button" className="ccm-add-btn" onClick={() => setAdding((v) => !v)}>
            {adding ? 'Cancel' : '+ Add New Client'}
          </button>
        </div>

        {adding && (
          <form className="ccm-add-form" onSubmit={handleCreate}>
            <input
              className="ccm-input"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Client name"
              required
              autoFocus
            />
            <PhoneInput value={newPhone} onChange={setNewPhone} />
            <button type="submit" className="ccm-btn ccm-btn-primary" disabled={creating || !newName || !newPhone}>
              {creating ? 'Adding…' : 'Add'}
            </button>
          </form>
        )}
        {error && <p className="ccm-error">{error}</p>}

        <div className="ccm-tabs" role="tablist">
          {TABS.map((t) => (
            <button
              type="button"
              role="tab"
              key={t.key}
              aria-selected={tab === t.key}
              className={'ccm-tab' + (tab === t.key ? ' ccm-tab-active' : '')}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="ccm-body">
          <div className="ccm-list-col">
            <div className="ccm-list">
              {(tab === 'leads' || tab === 'archived') && (
                <p className="ccm-empty">
                  {tab === 'leads' ? 'Lead tracking isn’t set up yet.' : 'Archived clients aren’t tracked yet.'}
                </p>
              )}
              {tab !== 'leads' && tab !== 'archived' && filtered.length === 0 && (
                <p className="ccm-empty">No clients match your search.</p>
              )}
              {pageRows.map((c) => (
                <button
                  type="button"
                  key={c.id}
                  className={'ccm-row' + (c.id === selectedId ? ' ccm-row-selected' : '')}
                  onClick={() => setSelectedId(c.id)}
                >
                  <span className="ccm-avatar">{initials(c.name)}</span>
                  <span className="ccm-row-text">
                    <span className="ccm-row-name">
                      {c.name}
                      {c.id === currentCustomerId && <span className="ccm-current-badge">Current</span>}
                    </span>
                    {c.email && <span className="ccm-row-line">{c.email}</span>}
                    <span className="ccm-row-line">{c.phone}</span>
                  </span>
                </button>
              ))}
            </div>

            {filtered.length > 0 && (
              <div className="ccm-pagination">
                <span className="ccm-pagination-count">
                  Showing {Math.min(pageRows.length, filtered.length)} of {filtered.length} client{filtered.length === 1 ? '' : 's'}
                </span>
                {pageCount > 1 && (
                  <div className="ccm-pagination-pages">
                    <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} aria-label="Previous page">
                      ‹
                    </button>
                    {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
                      <button
                        type="button"
                        key={n}
                        className={n === page ? 'ccm-page-active' : ''}
                        onClick={() => setPage(n)}
                      >
                        {n}
                      </button>
                    ))}
                    <button type="button" onClick={() => setPage((p) => Math.min(pageCount, p + 1))} disabled={page === pageCount} aria-label="Next page">
                      ›
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="ccm-detail">
            {selected && editForm ? (
              editing ? (
                <form className="ccm-edit-form" onSubmit={handleSaveEdit}>
                  <label className="ccm-edit-label">Name</label>
                  <input
                    className="ccm-input"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    required
                  />
                  <label className="ccm-edit-label">Phone</label>
                  <PhoneInput value={editForm.phone} onChange={(v) => setEditForm({ ...editForm, phone: v })} />
                  <label className="ccm-edit-label">Email</label>
                  <input
                    className="ccm-input"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  />
                  <label className="ccm-edit-label">Address</label>
                  <input
                    className="ccm-input"
                    value={editForm.address}
                    onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  />
                  <label className="ccm-edit-label">Notes</label>
                  <textarea
                    className="ccm-input ccm-textarea"
                    rows={3}
                    value={editForm.notes}
                    onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  />
                  <div className="ccm-edit-actions">
                    <button
                      type="button"
                      className="ccm-btn"
                      onClick={() => {
                        setEditing(false);
                        setEditForm(toEditable(selected));
                      }}
                    >
                      Cancel
                    </button>
                    <button type="submit" className="ccm-btn ccm-btn-primary" disabled={savingEdit}>
                      {savingEdit ? 'Saving…' : 'Save'}
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="ccm-detail-head">
                    <span className="ccm-avatar ccm-avatar-lg">{initials(selected.name)}</span>
                    <p className="ccm-detail-name">{selected.name}</p>
                    <button type="button" className="ccm-edit-btn" onClick={() => setEditing(true)}>
                      ✎ Edit
                    </button>
                  </div>
                  <div className="ccm-detail-lines">
                    {selected.email && <p className="ccm-detail-line">{selected.email}</p>}
                    <p className="ccm-detail-line">{selected.phone}</p>
                    {selected.address && <p className="ccm-detail-line">{selected.address}</p>}
                  </div>

                  <div className="ccm-event-grid">
                    <div>
                      <p className="ccm-detail-label">Event Type</p>
                      <p className="ccm-event-value">{eventSummary.type}</p>
                    </div>
                    <div>
                      <p className="ccm-detail-label">Event Date</p>
                      <p className="ccm-event-value">{eventSummary.dateRange}</p>
                    </div>
                  </div>

                  {selected.notes && (
                    <>
                      <p className="ccm-detail-label">Notes</p>
                      <p className="ccm-detail-notes">{selected.notes}</p>
                    </>
                  )}

                  <div className="ccm-detail-head-row">
                    <p className="ccm-detail-label">
                      Previous proposals{previousProposals ? ` (${previousProposals.length})` : ''}
                    </p>
                    <Link to={`/proposals?search=${encodeURIComponent(selected.name)}`} className="ccm-view-all" onClick={onClose}>
                      View all
                    </Link>
                  </div>
                  {previousProposals === null ? (
                    <p className="ccm-empty">Loading…</p>
                  ) : previousProposals.length === 0 ? (
                    <p className="ccm-empty">No previous proposals.</p>
                  ) : (
                    previousProposals.slice(0, 3).map((p) => (
                      <div className="ccm-proposal-row" key={p.id}>
                        <span>{p.proposalNumber}</span>
                        <span className="ccm-detail-line">{formatDate(p.createdAt)}</span>
                        <span className={`ccm-status ccm-status-${p.status.toLowerCase()}`}>{p.status}</span>
                      </div>
                    ))
                  )}
                </>
              )
            ) : (
              <p className="ccm-empty">Select a client to see their details.</p>
            )}
          </div>
        </div>

        <div className="ccm-footer">
          <button type="button" className="ccm-btn" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="ccm-btn ccm-btn-primary"
            disabled={!selectedId}
            onClick={() => selectedId && onSelect(selectedId)}
          >
            Select Client
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
