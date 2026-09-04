import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiDelete, apiGet, apiPost, apiPut } from '../api/client';
import { GroupedNumberInput } from '../components/GroupedNumberInput';
import type { Package } from '../types/catalog';
import './Packages.css';

const EMPTY_FORM = { name: '', description: '', price: '' };

export default function Packages() {
  const [packages, setPackages] = useState<Package[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');

  function load() {
    apiGet<Package[]>('/api/packages').then(setPackages);
  }

  useEffect(load, []);

  function toggleForm() {
    setShowForm((v) => !v);
    setForm(EMPTY_FORM);
    setError('');
  }

  function updateField<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await apiPost('/api/packages', {
        name: form.name,
        description: form.description || undefined,
        price: Number(form.price),
      });
      setShowForm(false);
      setForm(EMPTY_FORM);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create package');
    }
  }

  async function toggleActive(pkg: Package) {
    setError('');
    try {
      await apiPut(`/api/packages/${pkg.id}`, { active: !pkg.active });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update package');
    }
  }

  async function deletePackage(pkg: Package) {
    if (!confirm(`Delete ${pkg.name}? This can't be undone.`)) return;
    setError('');
    try {
      await apiDelete(`/api/packages/${pkg.id}`);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete package');
    }
  }

  return (
    <div className="pk-container">
      <div className="pk-page-header">
        <div>
          <h1 className="pk-title">Packages</h1>
          <p className="pk-subtitle">Bundles of services you can add to a proposal as one line item.</p>
        </div>
        <button type="button" className="pk-add-btn" onClick={toggleForm}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            {showForm ? (
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            ) : (
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            )}
          </svg>
          {showForm ? 'Close' : 'Add package'}
        </button>
      </div>

      {error && <div className="pk-error-banner">{error}</div>}

      {showForm && (
        <form onSubmit={handleCreate} className="pk-form">
          <h2>New package</h2>
          <p className="pk-form-sub">Add services to it afterward from the package's detail page.</p>

          <div className="pk-form-row">
            <div>
              <label className="pk-label" htmlFor="pk-name">Name</label>
              <input
                id="pk-name"
                className="pk-input"
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="Gold Package"
                required
              />
            </div>
            <div>
              <label className="pk-label" htmlFor="pk-price">Price (₹)</label>
              <GroupedNumberInput
                id="pk-price"
                className="pk-input"
                value={form.price}
                onDigitsChange={(digits) => updateField('price', digits)}
                placeholder="1,25,000"
                required
              />
            </div>
          </div>
          <div className="pk-form-row">
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="pk-label" htmlFor="pk-description">Description</label>
              <input
                id="pk-description"
                className="pk-input"
                value={form.description}
                onChange={(e) => updateField('description', e.target.value)}
                placeholder="What's included, in a sentence"
              />
            </div>
          </div>

          <div className="pk-form-actions">
            <button type="submit" className="pk-submit-btn">Add</button>
          </div>
        </form>
      )}

      <div className="pk-table">
        <div className="pk-table-head">
          <span>Name</span>
          <span>Price</span>
          <span>Services</span>
          <span>Status</span>
          <span></span>
        </div>

        {packages === null ? (
          <div className="pk-empty">Loading…</div>
        ) : packages.length === 0 ? (
          <div className="pk-empty">No packages yet. Add your first one above.</div>
        ) : (
          packages.map((p) => (
            <div className="pk-table-row" key={p.id}>
              <span className="pk-cell-name">{p.name}</span>
              <span className="pk-cell-price">₹{p.price.toLocaleString('en-IN')}</span>
              <span className="pk-cell-services">{p.items.length}</span>
              <span className={`pk-status ${p.active ? 'pk-status-active' : 'pk-status-inactive'}`}>
                {p.active ? 'Active' : 'Inactive'}
              </span>
              <div className="pk-row-actions">
                <Link to={`/packages/${p.id}`} className="pk-manage-link">Manage</Link>
                <button type="button" className="pk-toggle-btn" onClick={() => toggleActive(p)}>
                  {p.active ? 'Deactivate' : 'Reactivate'}
                </button>
                <button type="button" className="pk-toggle-btn pk-danger" onClick={() => deletePackage(p)}>
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
