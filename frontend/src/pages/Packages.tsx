import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiDelete, apiGet, apiPost, apiPut } from '../api/client';
import { GroupedNumberInput } from '../components/GroupedNumberInput';
import type { Package, Service } from '../types/catalog';
import './Packages.css';

const EMPTY_FORM = { name: '', description: '', price: '' };

interface DraftService {
  serviceId: string;
  quantity: number;
  name: string;
}

export default function Packages() {
  const [packages, setPackages] = useState<Package[] | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [draftServices, setDraftServices] = useState<DraftService[]>([]);
  const [serviceId, setServiceId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [error, setError] = useState('');

  function load() {
    apiGet<Package[]>('/api/packages').then(setPackages);
    apiGet<Service[]>('/api/services?active=true').then(setServices);
  }

  useEffect(load, []);

  function toggleForm() {
    setShowForm((v) => !v);
    setForm(EMPTY_FORM);
    setDraftServices([]);
    setServiceId('');
    setQuantity('1');
    setError('');
  }

  function addDraftService() {
    const service = services.find((s) => s.id === serviceId);
    if (!service) return;
    setDraftServices((list) => [
      ...list,
      { serviceId: service.id, quantity: Number(quantity) || 1, name: service.name },
    ]);
    setServiceId('');
    setQuantity('1');
  }

  function removeDraftService(id: string) {
    setDraftServices((list) => list.filter((s) => s.serviceId !== id));
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
        services: draftServices.length
          ? draftServices.map(({ serviceId, quantity }) => ({ serviceId, quantity }))
          : undefined,
      });
      setShowForm(false);
      setForm(EMPTY_FORM);
      setDraftServices([]);
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
      <Link to="/setup" className="pk-back-link">← Back to setup</Link>
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
          <p className="pk-form-sub">Add services now, or later from the package's detail page.</p>

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

          <div className="pk-services-section">
            <label className="pk-label">Services</label>

            {draftServices.length > 0 && (
              <div className="pk-draft-list">
                {draftServices.map((s) => (
                  <div className="pk-draft-row" key={s.serviceId}>
                    <span className="pk-draft-name">{s.name}</span>
                    <span className="pk-draft-qty">× {s.quantity}</span>
                    <button
                      type="button"
                      className="pk-draft-remove-btn"
                      onClick={() => removeDraftService(s.serviceId)}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="pk-draft-add-row">
              <select
                className="pk-select"
                value={serviceId}
                onChange={(e) => setServiceId(e.target.value)}
              >
                <option value="">Select a service…</option>
                {services
                  .filter((s) => !draftServices.some((d) => d.serviceId === s.id))
                  .map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
              </select>
              <GroupedNumberInput
                className="pk-qty-input"
                value={quantity}
                onDigitsChange={setQuantity}
              />
              <button type="button" className="pk-draft-add-btn" disabled={!serviceId} onClick={addDraftService}>
                Add service
              </button>
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
