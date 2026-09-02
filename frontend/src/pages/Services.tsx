import { useEffect, useState } from 'react';
import { apiDelete, apiGet, apiPost, apiPut } from '../api/client';
import type { Service } from '../types/catalog';
import './Services.css';

const EMPTY_FORM = { name: '', category: '', perDayPrice: '', flatPrice: '' };

const CATEGORIES = ['Photography', 'Videography', 'Cinematic', 'Editing', 'Drone', 'Candid', 'Album'];

function EditIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 20h4l10-10-4-4L4 16v4Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DeleteIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function Services() {
  const [services, setServices] = useState<Service[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');

  function load() {
    apiGet<Service[]>('/api/services?active=true').then(setServices);
  }

  useEffect(load, []);

  function toggleForm() {
    setShowForm((v) => !v);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError('');
  }

  function startEdit(s: Service) {
    setShowForm(true);
    setEditingId(s.id);
    setForm({
      name: s.name,
      category: s.category ?? '',
      perDayPrice: s.perDayPrice != null ? String(s.perDayPrice) : '',
      flatPrice: s.flatPrice != null ? String(s.flatPrice) : '',
    });
  }

  function updateField<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!form.perDayPrice && !form.flatPrice) {
      setError('Set a per-day price, a flat price, or both');
      return;
    }
    const payload = {
      name: form.name,
      category: form.category || undefined,
      perDayPrice: form.perDayPrice ? Number(form.perDayPrice) : undefined,
      flatPrice: form.flatPrice ? Number(form.flatPrice) : undefined,
    };
    try {
      if (editingId) {
        await apiPut(`/api/services/${editingId}`, payload);
      } else {
        await apiPost('/api/services', payload);
      }
      setShowForm(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save service');
    }
  }

  async function deleteService(service: Service) {
    if (!confirm(`Delete ${service.name}? This can't be undone.`)) return;
    setError('');
    try {
      await apiDelete(`/api/services/${service.id}`);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete service');
    }
  }

  return (
    <div className="sv-container">
      <div className="sv-page-header">
        <div>
          <h1 className="sv-title">Services</h1>
          <p className="sv-subtitle">
            The catalog of individual services you can add to a proposal, on their own or inside a package.
          </p>
        </div>
        <button type="button" className="sv-add-btn" onClick={toggleForm}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            {showForm ? (
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            ) : (
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            )}
          </svg>
          {showForm ? 'Close' : 'Add service'}
        </button>
      </div>

      {error && <div className="sv-error-banner">{error}</div>}

      {showForm && (
        <form onSubmit={handleSubmit} className="sv-form">
          <h2>{editingId ? 'Edit service' : 'New service'}</h2>
          <p className="sv-form-sub">Appears in the catalog immediately, ready to add to proposals.</p>

          <div className="sv-form-row">
            <div>
              <label className="sv-label" htmlFor="sv-name">Name</label>
              <input
                id="sv-name"
                className="sv-input"
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="Candid photography"
                required
              />
            </div>
            <div>
              <label className="sv-label" htmlFor="sv-category">Category</label>
              <select
                id="sv-category"
                className="sv-input"
                value={form.category}
                onChange={(e) => updateField('category', e.target.value)}
              >
                <option value="">Select category</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <p className="sv-price-hint">
            Pricing — set either or both. The proposal builder will let you pick per-day or flat for this service.
          </p>
          <div className="sv-form-row">
            <div>
              <label className="sv-label" htmlFor="sv-per-day-price">Per-day price (₹)</label>
              <input
                id="sv-per-day-price"
                type="number"
                className="sv-input"
                value={form.perDayPrice}
                onChange={(e) => updateField('perDayPrice', e.target.value)}
                placeholder="45000"
              />
            </div>
            <div>
              <label className="sv-label" htmlFor="sv-flat-price">Flat price (₹)</label>
              <input
                id="sv-flat-price"
                type="number"
                className="sv-input"
                value={form.flatPrice}
                onChange={(e) => updateField('flatPrice', e.target.value)}
                placeholder="40000"
              />
            </div>
            <button type="submit" className="sv-submit-btn">
              {editingId ? 'Save changes' : 'Add'}
            </button>
          </div>
        </form>
      )}

      <div className="sv-table">
        <div className="sv-table-head">
          <span>Name</span>
          <span>Category</span>
          <span>Per day</span>
          <span>Flat</span>
          <span></span>
        </div>

        {services === null ? (
          <div className="sv-empty">Loading…</div>
        ) : services.length === 0 ? (
          <div className="sv-empty">No services yet. Add your first one above.</div>
        ) : (
          services.map((s) => (
            <div className="sv-table-row" key={s.id}>
              <span className="sv-cell-name">{s.name}</span>
              <span className="sv-cell-category">{s.category ?? '—'}</span>
              <span className="sv-cell-price">
                {s.perDayPrice != null ? `₹${s.perDayPrice.toLocaleString('en-IN')}` : '—'}
              </span>
              <span className="sv-cell-price">
                {s.flatPrice != null ? `₹${s.flatPrice.toLocaleString('en-IN')}` : '—'}
              </span>
              <div className="sv-row-actions">
                <button type="button" className="sv-icon-btn" aria-label="Edit" onClick={() => startEdit(s)}>
                  <EditIcon />
                </button>
                <button
                  type="button"
                  className="sv-icon-btn sv-danger"
                  aria-label="Delete"
                  onClick={() => deleteService(s)}
                >
                  <DeleteIcon />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
