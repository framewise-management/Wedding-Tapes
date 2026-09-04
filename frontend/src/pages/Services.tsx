import { useEffect, useState } from 'react';
import { apiDelete, apiGet, apiPost, apiPut } from '../api/client';
import { GroupedNumberInput } from '../components/GroupedNumberInput';
import { notifySetupStatusChanged } from '../lib/setupStatus';
import type { Service } from '../types/catalog';
import './Services.css';

const EMPTY_FORM = { name: '', category: '', description: '', flatPrice: '' };

const CATEGORIES = ['Photography', 'Videography', 'Cinematic', 'Editing', 'Drone', 'Candid', 'Album'];

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
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

function CategorySelect({ id, value, onChange }: { id: string; value: string; onChange: (v: string) => void }) {
  return (
    <select id={id} className="sv-input" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">Select category</option>
      {CATEGORIES.map((c) => (
        <option key={c} value={c}>{c}</option>
      ))}
    </select>
  );
}

export default function Services() {
  const [services, setServices] = useState<Service[] | null>(null);
  const [filterCategory, setFilterCategory] = useState('All');
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  function load() {
    apiGet<Service[]>('/api/services?active=true').then(setServices);
  }

  useEffect(load, []);

  function openAddModal() {
    setAddModalOpen(true);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError('');
  }

  function closeAddModal() {
    setAddModalOpen(false);
  }

  function startEdit(s: Service) {
    setAddModalOpen(false);
    setEditingId(s.id);
    setError('');
    setForm({
      name: s.name,
      category: s.category ?? '',
      description: s.description ?? '',
      flatPrice: s.flatPrice != null ? String(s.flatPrice) : '',
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError('');
  }

  function updateField<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) {
      setError('Give the service a name');
      return;
    }
    if (!form.flatPrice) {
      setError('Set a price');
      return;
    }
    const payload = {
      name: form.name,
      category: form.category,
      description: form.description,
      flatPrice: Number(form.flatPrice),
    };
    try {
      if (editingId) {
        await apiPut(`/api/services/${editingId}`, payload);
      } else {
        await apiPost('/api/services', payload);
      }
      setAddModalOpen(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
      load();
      notifySetupStatusChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save service');
    }
  }

  async function confirmDelete(service: Service) {
    setError('');
    try {
      await apiDelete(`/api/services/${service.id}`);
      setConfirmDeleteId(null);
      load();
      notifySetupStatusChanged();
    } catch (err) {
      setConfirmDeleteId(null);
      setError(err instanceof Error ? err.message : 'Failed to delete service');
    }
  }

  const presentCategories = services ? [...new Set(services.map((s) => s.category).filter((c): c is string => !!c))] : [];
  const categoryChips = ['All', ...presentCategories];
  const filtered = services === null ? null : filterCategory === 'All' ? services : services.filter((s) => s.category === filterCategory);

  return (
    <div className="sv-container">
      <div className="sv-page-header">
        <div>
          <h1 className="sv-title">Services</h1>
          <p className="sv-subtitle">
            The catalog of individual services you can add to a proposal, on their own or inside a package.
          </p>
        </div>
        <button type="button" className="sv-add-btn" onClick={openAddModal}>
          <PlusIcon />
          Add service
        </button>
      </div>

      {error && <div className="sv-error-banner">{error}</div>}

      {categoryChips.length > 1 && (
        <div className="sv-chip-row">
          {categoryChips.map((cat) => (
            <button
              key={cat}
              type="button"
              className={'sv-chip' + (cat === filterCategory ? ' sv-chip-active' : '')}
              onClick={() => setFilterCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      <div className="sv-table">
        <div className="sv-table-head">
          <span>Service</span>
          <span>Category</span>
          <span>Price</span>
          <span></span>
        </div>

        {filtered === null ? (
          <div className="sv-empty">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="sv-empty">
            {services && services.length === 0 ? 'No services yet. Add your first one above.' : 'No services match this filter.'}
          </div>
        ) : (
          filtered.map((s) =>
            s.id === editingId ? (
              <form onSubmit={handleSubmit} className="sv-table-row sv-edit-row" key={s.id}>
                <div className="sv-edit-row-fields">
                  <input
                    className="sv-input"
                    value={form.name}
                    onChange={(e) => updateField('name', e.target.value)}
                    placeholder="Service name"
                    required
                    autoFocus
                  />
                  <CategorySelect id={`sv-edit-category-${s.id}`} value={form.category} onChange={(v) => updateField('category', v)} />
                  <GroupedNumberInput
                    className="sv-input"
                    value={form.flatPrice}
                    onDigitsChange={(digits) => updateField('flatPrice', digits)}
                    placeholder="Price (₹)"
                    required
                  />
                  <div className="sv-edit-row-actions">
                    <button type="button" className="sv-cancel-btn" onClick={cancelEdit}>Cancel</button>
                    <button type="submit" className="sv-submit-btn">Save</button>
                  </div>
                </div>
                <input
                  className="sv-input sv-edit-row-desc"
                  value={form.description}
                  onChange={(e) => updateField('description', e.target.value)}
                  placeholder="Description (optional)"
                />
              </form>
            ) : (
              <div className="sv-table-row" key={s.id}>
                <div className="sv-cell-name-wrap">
                  <div className="sv-cell-name">{s.name}</div>
                  {s.description && <p className="sv-cell-desc">{s.description}</p>}
                </div>
                <div>
                  {s.category && <span className="sv-category-badge">{s.category}</span>}
                </div>
                <span className="sv-cell-price">
                  {s.flatPrice != null ? `₹${s.flatPrice.toLocaleString('en-IN')}` : '—'}
                </span>
                {confirmDeleteId === s.id ? (
                  <div className="sv-row-confirm">
                    <span>Delete?</span>
                    <button type="button" className="sv-confirm-yes" onClick={() => confirmDelete(s)}>Yes</button>
                    <button type="button" className="sv-confirm-no" onClick={() => setConfirmDeleteId(null)}>No</button>
                  </div>
                ) : (
                  <div className="sv-row-actions">
                    <button type="button" className="sv-icon-btn" aria-label="Edit" onClick={() => startEdit(s)}>
                      <EditIcon />
                    </button>
                    <button
                      type="button"
                      className="sv-icon-btn sv-danger"
                      aria-label="Delete"
                      onClick={() => setConfirmDeleteId(s.id)}
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

      {addModalOpen && (
        <div className="sv-modal-backdrop" onClick={closeAddModal}>
          <div className="sv-modal" onClick={(e) => e.stopPropagation()}>
            <div className="sv-modal-header">
              <div>
                <h2>New service</h2>
                <p>Appears in the catalog immediately, ready to add to proposals.</p>
              </div>
              <button type="button" className="sv-modal-close" aria-label="Close" onClick={closeAddModal}>
                <CloseIcon />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="sv-modal-form">
              <div>
                <label className="sv-label" htmlFor="sv-name">Name</label>
                <input
                  id="sv-name"
                  className="sv-input"
                  value={form.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  placeholder="Candid photography"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="sv-label" htmlFor="sv-category">Category</label>
                <CategorySelect id="sv-category" value={form.category} onChange={(v) => updateField('category', v)} />
              </div>

              <div>
                <label className="sv-label" htmlFor="sv-description">Description</label>
                <textarea
                  id="sv-description"
                  className="sv-input sv-textarea"
                  value={form.description}
                  onChange={(e) => updateField('description', e.target.value)}
                  placeholder="A short note about what's included"
                  rows={3}
                />
              </div>

              <div>
                <label className="sv-label" htmlFor="sv-flat-price">Price (₹)</label>
                <GroupedNumberInput
                  id="sv-flat-price"
                  className="sv-input"
                  value={form.flatPrice}
                  onDigitsChange={(digits) => updateField('flatPrice', digits)}
                  placeholder="40,000"
                  required
                />
              </div>

              <div className="sv-modal-footer">
                <button type="button" className="sv-cancel-btn" onClick={closeAddModal}>Cancel</button>
                <button type="submit" className="sv-submit-btn">Add service</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
