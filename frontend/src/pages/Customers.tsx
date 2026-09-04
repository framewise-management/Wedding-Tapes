import { useEffect, useState } from 'react';
import { apiDelete, apiGet, apiPost, apiPut } from '../api/client';
import { PhoneInput } from '../components/PhoneInput';
import type { Customer } from '../types/customer';
import './Customers.css';

const EMPTY_FORM = { name: '', phone: '', email: '', address: '', notes: '' };

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

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[] | null>(null);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');

  function load(currentSearch: string) {
    const query = currentSearch ? `?search=${encodeURIComponent(currentSearch)}` : '';
    apiGet<Customer[]>(`/api/customers${query}`).then(setCustomers);
  }

  useEffect(() => {
    const timer = setTimeout(() => load(search), 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  function toggleForm() {
    setShowForm((v) => !v);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError('');
  }

  function startEdit(c: Customer) {
    setShowForm(true);
    setEditingId(c.id);
    setForm({
      name: c.name,
      phone: c.phone,
      email: c.email ?? '',
      address: c.address ?? '',
      notes: c.notes ?? '',
    });
  }

  function updateField<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const payload = {
      name: form.name,
      phone: form.phone,
      email: form.email || undefined,
      address: form.address || undefined,
      notes: form.notes || undefined,
    };
    try {
      if (editingId) {
        await apiPut(`/api/customers/${editingId}`, payload);
      } else {
        await apiPost('/api/customers', payload);
      }
      setShowForm(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
      load(search);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save customer');
    }
  }

  async function deleteCustomer(customer: Customer) {
    if (!confirm(`Delete ${customer.name}? This can't be undone.`)) return;
    setError('');
    try {
      await apiDelete(`/api/customers/${customer.id}`);
      load(search);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete customer');
    }
  }

  return (
    <div className="cu-container">
      <div className="cu-page-header">
        <div>
          <h1 className="cu-title">Customers</h1>
          <p className="cu-subtitle">
            Everyone you've built a proposal for, or plan to.
          </p>
        </div>
        <button type="button" className="cu-add-btn" onClick={toggleForm}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            {showForm ? (
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            ) : (
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            )}
          </svg>
          {showForm ? 'Close' : 'Add customer'}
        </button>
      </div>

      {error && <div className="cu-error-banner">{error}</div>}

      {showForm && (
        <form onSubmit={handleSubmit} className="cu-form" autoComplete="off">
          <h2>{editingId ? 'Edit customer' : 'New customer'}</h2>
          <p className="cu-form-sub">Name and phone are required.</p>

          <div className="cu-form-row">
            <div>
              <label className="cu-label" htmlFor="cu-name">Name</label>
              <input
                id="cu-name"
                className="cu-input"
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="Priya & Arjun"
                autoComplete="off"
                required
              />
            </div>
            <div>
              <label className="cu-label" htmlFor="cu-phone">Phone</label>
              <PhoneInput
                id="cu-phone"
                value={form.phone}
                onChange={(v) => updateField('phone', v)}
                required
              />
            </div>
          </div>

          <div className="cu-form-row">
            <div>
              <label className="cu-label" htmlFor="cu-email">Email</label>
              <input
                id="cu-email"
                type="email"
                className="cu-input"
                value={form.email}
                onChange={(e) => updateField('email', e.target.value)}
                placeholder="hello@example.com"
                autoComplete="off"
              />
            </div>
            <div>
              <label className="cu-label" htmlFor="cu-address">Address</label>
              <input
                id="cu-address"
                className="cu-input"
                value={form.address}
                onChange={(e) => updateField('address', e.target.value)}
                placeholder="Customer address"
                autoComplete="off"
              />
            </div>
          </div>

          <div className="cu-form-row">
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="cu-label" htmlFor="cu-notes">Notes</label>
              <textarea
                id="cu-notes"
                className="cu-textarea"
                rows={3}
                value={form.notes}
                onChange={(e) => updateField('notes', e.target.value)}
                placeholder="Anything worth remembering about this customer"
              />
            </div>
          </div>

          <div className="cu-form-actions">
            <button type="submit" className="cu-submit-btn">
              {editingId ? 'Save changes' : 'Add'}
            </button>
          </div>
        </form>
      )}

      <div className="cu-search">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or phone…"
          autoComplete="off"
        />
      </div>

      <div className="cu-table">
        <div className="cu-table-head">
          <span>Name</span>
          <span>Phone</span>
          <span>Email</span>
          <span>Address</span>
          <span></span>
        </div>

        {customers === null ? (
          <div className="cu-empty">Loading…</div>
        ) : customers.length === 0 ? (
          <div className="cu-empty">
            {search ? 'No customers match your search.' : 'No customers yet. Add your first one above.'}
          </div>
        ) : (
          customers.map((c) => (
            <div className="cu-table-row" key={c.id}>
              <span className="cu-cell-name">{c.name}</span>
              <span className="cu-cell-phone">{c.phone}</span>
              <span className="cu-cell-email">{c.email ?? '—'}</span>
              <span className="cu-cell-address">{c.address ?? '—'}</span>
              <div className="cu-row-actions">
                <button type="button" className="cu-icon-btn" aria-label="Edit" onClick={() => startEdit(c)}>
                  <EditIcon />
                </button>
                <button
                  type="button"
                  className="cu-icon-btn cu-danger"
                  aria-label="Delete"
                  onClick={() => deleteCustomer(c)}
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
