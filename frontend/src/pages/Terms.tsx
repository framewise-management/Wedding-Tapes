import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiDelete, apiGet, apiPost, apiPut } from '../api/client';
import { notifySetupStatusChanged } from '../lib/setupStatus';
import type { Business } from '../types/business';
import type { Term } from '../types/term';
import './Services.css';
import './Terms.css';

function EditIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 20h4l10-10-4-4L4 16v4Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DeleteIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const EMPTY = { title: '', body: '' };

export default function Terms() {
  const [terms, setTerms] = useState<Term[] | null>(null);
  const [legacyTerms, setLegacyTerms] = useState<string | null>(null);
  const [draft, setDraft] = useState(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  function load() {
    apiGet<Term[]>('/api/terms').then(setTerms);
  }

  useEffect(() => {
    load();
    apiGet<Business>('/api/business')
      .then((b) => setLegacyTerms(b.defaultTerms))
      .catch(() => setLegacyTerms(null));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!draft.title.trim() || !draft.body.trim()) return;
    const payload = { title: draft.title.trim(), body: draft.body.trim() };
    try {
      if (editingId) {
        await apiPut(`/api/terms/${editingId}`, payload);
      } else {
        await apiPost('/api/terms', payload);
      }
      setDraft(EMPTY);
      setEditingId(null);
      load();
      notifySetupStatusChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save clause');
    }
  }

  async function toggleActive(term: Term) {
    setError('');
    try {
      await apiPut(`/api/terms/${term.id}`, { active: !term.active });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update clause');
    }
  }

  async function confirmDelete(term: Term) {
    setError('');
    try {
      await apiDelete(`/api/terms/${term.id}`);
      setConfirmDeleteId(null);
      load();
      notifySetupStatusChanged();
    } catch (err) {
      setConfirmDeleteId(null);
      setError(err instanceof Error ? err.message : 'Failed to delete clause');
    }
  }

  // One-way door out of the old single-textarea terms: the fallback keeps
  // printing until it is either imported here or cleared.
  async function importLegacy() {
    if (!legacyTerms) return;
    setError('');
    try {
      await apiPost('/api/terms', { title: 'Terms & Conditions', body: legacyTerms });
      await apiPut('/api/business', { defaultTerms: '' });
      setLegacyTerms(null);
      load();
      notifySetupStatusChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import terms');
    }
  }

  return (
    <div className="sv-container tm-page">
      <Link to="/setup" className="sv-back-link">← Back to setup</Link>
      <div className="sv-page-header">
        <div>
          <h1 className="sv-title">Terms &amp; Conditions</h1>
          <p className="sv-subtitle">
            Your clause library. Every active clause prints on each proposal and PDF, in this
            order.
          </p>
        </div>
      </div>

      {error && <div className="sv-error-banner">{error}</div>}

      {legacyTerms && terms?.length === 0 && (
        <div className="tm-legacy">
          <p>
            You still have terms saved on your business profile. Import them as your first clause
            so you can manage them here.
          </p>
          <button type="button" className="sv-add-btn" onClick={importLegacy}>
            Import existing terms
          </button>
        </div>
      )}

      <form className="tm-form" onSubmit={handleSubmit}>
        <input
          className="sv-input"
          value={draft.title}
          onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          placeholder="Clause title — e.g. Cancellation policy"
          aria-label="Clause title"
        />
        <textarea
          className="sv-input tm-body-input"
          rows={4}
          value={draft.body}
          onChange={(e) => setDraft({ ...draft, body: e.target.value })}
          placeholder="The clause text as it should appear on the proposal…"
          aria-label="Clause text"
        />
        <div className="tm-form-actions">
          {editingId && (
            <button
              type="button"
              className="sv-cancel-btn"
              onClick={() => {
                setEditingId(null);
                setDraft(EMPTY);
              }}
            >
              Cancel
            </button>
          )}
          <button type="submit" className="sv-add-btn">
            {editingId ? 'Save clause' : 'Add clause'}
          </button>
        </div>
      </form>

      <div className="sv-table">
        <div className="sv-table-head">
          <span>Clause</span>
          <span></span>
        </div>

        {terms === null ? (
          <div className="sv-empty">Loading…</div>
        ) : terms.length === 0 ? (
          <div className="sv-empty">No clauses yet. Add your first one above.</div>
        ) : (
          terms.map((term) => (
            <div className={'sv-table-row' + (term.active ? '' : ' tm-inactive')} key={term.id}>
              <div className="tm-cell">
                <div className="sv-cell-name">
                  {term.title}
                  {!term.active && <span className="tm-badge">Hidden</span>}
                </div>
                <p className="tm-body">{term.body}</p>
              </div>
              {confirmDeleteId === term.id ? (
                <div className="sv-row-confirm">
                  <span>Delete?</span>
                  <button type="button" className="sv-confirm-yes" onClick={() => confirmDelete(term)}>Yes</button>
                  <button type="button" className="sv-confirm-no" onClick={() => setConfirmDeleteId(null)}>No</button>
                </div>
              ) : (
                <div className="sv-row-actions">
                  <button type="button" className="tm-toggle" onClick={() => toggleActive(term)}>
                    {term.active ? 'Hide' : 'Show'}
                  </button>
                  <button
                    type="button"
                    className="sv-icon-btn"
                    aria-label="Edit"
                    onClick={() => {
                      setEditingId(term.id);
                      setDraft({ title: term.title, body: term.body });
                      setError('');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                  >
                    <EditIcon />
                  </button>
                  <button
                    type="button"
                    className="sv-icon-btn sv-danger"
                    aria-label="Delete"
                    onClick={() => setConfirmDeleteId(term.id)}
                  >
                    <DeleteIcon />
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
