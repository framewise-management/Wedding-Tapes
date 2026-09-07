import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiDelete, apiGet, apiPost, apiPut } from '../api/client';
import { notifySetupStatusChanged } from '../lib/setupStatus';
import type { EventType } from '../types/eventType';
import './Services.css';
import './EventTypes.css';

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

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

export default function EventTypes() {
  const [eventTypes, setEventTypes] = useState<EventType[] | null>(null);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [error, setError] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  function load() {
    apiGet<EventType[]>('/api/event-types?active=true').then(setEventTypes);
  }

  useEffect(load, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!newName.trim()) return;
    try {
      await apiPost('/api/event-types', { name: newName.trim() });
      setNewName('');
      load();
      notifySetupStatusChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add event');
    }
  }

  async function handleRename(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!editName.trim() || !editingId) return;
    try {
      await apiPut(`/api/event-types/${editingId}`, { name: editName.trim() });
      setEditingId(null);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rename event');
    }
  }

  async function confirmDelete(eventType: EventType) {
    setError('');
    try {
      await apiDelete(`/api/event-types/${eventType.id}`);
      setConfirmDeleteId(null);
      load();
      notifySetupStatusChanged();
    } catch (err) {
      setConfirmDeleteId(null);
      setError(err instanceof Error ? err.message : 'Failed to delete event');
    }
  }

  return (
    <div className="sv-container et-page">
      <Link to="/setup" className="sv-back-link">← Back to setup</Link>
      <div className="sv-page-header">
        <div>
          <h1 className="sv-title">Events</h1>
          <p className="sv-subtitle">
            The ceremonies you shoot — pick from these when building a proposal.
          </p>
        </div>
      </div>

      {error && <div className="sv-error-banner">{error}</div>}

      <form className="et-add-form" onSubmit={handleAdd}>
        <input
          className="sv-input"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="e.g. Cocktail party"
          aria-label="New event name"
        />
        <button type="submit" className="sv-add-btn">
          <PlusIcon />
          Add event
        </button>
      </form>

      <div className="sv-table">
        <div className="sv-table-head">
          <span>Event</span>
          <span></span>
        </div>

        {eventTypes === null ? (
          <div className="sv-empty">Loading…</div>
        ) : eventTypes.length === 0 ? (
          <div className="sv-empty">No events yet. Add your first one above.</div>
        ) : (
          eventTypes.map((et) =>
            et.id === editingId ? (
              <form onSubmit={handleRename} className="sv-table-row" key={et.id}>
                <input
                  className="sv-input"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  autoFocus
                />
                <div className="sv-row-actions">
                  <button type="button" className="sv-cancel-btn" onClick={() => setEditingId(null)}>
                    Cancel
                  </button>
                  <button type="submit" className="sv-submit-btn">Save</button>
                </div>
              </form>
            ) : (
              <div className="sv-table-row" key={et.id}>
                <div className="sv-cell-name">{et.name}</div>
                {confirmDeleteId === et.id ? (
                  <div className="sv-row-confirm">
                    <span>Delete?</span>
                    <button type="button" className="sv-confirm-yes" onClick={() => confirmDelete(et)}>Yes</button>
                    <button type="button" className="sv-confirm-no" onClick={() => setConfirmDeleteId(null)}>No</button>
                  </div>
                ) : (
                  <div className="sv-row-actions">
                    <button
                      type="button"
                      className="sv-icon-btn"
                      aria-label="Rename"
                      onClick={() => {
                        setEditingId(et.id);
                        setEditName(et.name);
                        setError('');
                      }}
                    >
                      <EditIcon />
                    </button>
                    <button
                      type="button"
                      className="sv-icon-btn sv-danger"
                      aria-label="Delete"
                      onClick={() => setConfirmDeleteId(et.id)}
                    >
                      <DeleteIcon />
                    </button>
                  </div>
                )}
              </div>
            ),
          )
        )}
      </div>
    </div>
  );
}
