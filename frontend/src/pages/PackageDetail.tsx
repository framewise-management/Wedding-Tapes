import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { apiDelete, apiGet, apiPost, apiPut } from '../api/client';
import { GroupedNumberInput } from '../components/GroupedNumberInput';
import type { Package, Service } from '../types/catalog';
import './PackageDetail.css';

export default function PackageDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [pkg, setPkg] = useState<Package | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [serviceId, setServiceId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [error, setError] = useState('');

  function load() {
    apiGet<Package>(`/api/packages/${id}`).then(setPkg);
    apiGet<Service[]>('/api/services?active=true').then(setServices);
  }

  useEffect(load, [id]);

  async function toggleActive() {
    if (!pkg) return;
    setError('');
    try {
      await apiPut(`/api/packages/${pkg.id}`, { active: !pkg.active });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update package');
    }
  }

  async function deletePackage() {
    if (!pkg || !confirm(`Delete ${pkg.name}? This can't be undone.`)) return;
    setError('');
    try {
      await apiDelete(`/api/packages/${pkg.id}`);
      navigate('/packages');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete package');
    }
  }

  async function handleAddService(e: React.FormEvent) {
    e.preventDefault();
    if (!pkg || !serviceId) return;
    setError('');
    try {
      await apiPost(`/api/packages/${pkg.id}/services`, {
        serviceId,
        quantity: Number(quantity),
      });
      setServiceId('');
      setQuantity('1');
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add service');
    }
  }

  async function handleRemoveService(serviceIdToRemove: string) {
    if (!pkg) return;
    setError('');
    try {
      await apiDelete(`/api/packages/${pkg.id}/services/${serviceIdToRemove}`);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove service');
    }
  }

  if (!pkg) return <p>Loading…</p>;

  const availableServices = services.filter(
    (s) => !pkg.items.some((item) => item.serviceId === s.id),
  );

  return (
    <div className="pd-container">
      <Link to="/packages" className="pd-back-link">← Back to packages</Link>

      <div className="pd-page-header">
        <div>
          <h1 className="pd-title">{pkg.name}</h1>
          <p className="pd-price">₹{pkg.price.toLocaleString('en-IN')}</p>
        </div>
        <div className="pd-header-actions">
          <span className={`pd-status ${pkg.active ? 'pd-status-active' : 'pd-status-inactive'}`}>
            {pkg.active ? 'Active' : 'Inactive'}
          </span>
          <button type="button" className="pd-toggle-btn" onClick={toggleActive}>
            {pkg.active ? 'Deactivate' : 'Reactivate'}
          </button>
          <button type="button" className="pd-toggle-btn pd-danger" onClick={deletePackage}>
            Delete
          </button>
        </div>
      </div>

      {error && <div className="pd-error-banner">{error}</div>}

      <section className="pd-section">
        <h2>Included services</h2>

        {pkg.items.length === 0 ? (
          <p className="pd-empty">No services in this package yet. Add one below.</p>
        ) : (
          <div className="pd-list">
            {pkg.items.map((item) => (
              <div className="pd-list-row" key={item.id}>
                <span className="pd-list-name">{item.service.name}</span>
                <span className="pd-list-qty">× {item.quantity}</span>
                <button
                  type="button"
                  className="pd-remove-btn"
                  onClick={() => handleRemoveService(item.serviceId)}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleAddService} className="pd-add-form">
          <select
            className="pd-select"
            value={serviceId}
            onChange={(e) => setServiceId(e.target.value)}
            required
          >
            <option value="">Select a service…</option>
            {availableServices.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <GroupedNumberInput
            className="pd-qty-input"
            value={quantity}
            onDigitsChange={setQuantity}
          />
          <button type="submit" className="pd-add-btn" disabled={!availableServices.length}>
            Add to package
          </button>
        </form>
      </section>
    </div>
  );
}
