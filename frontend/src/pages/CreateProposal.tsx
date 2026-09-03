import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { apiGet, apiPost, apiPut } from '../api/client';
import type { Customer } from '../types/customer';
import type { Package, Service } from '../types/catalog';
import type { Proposal, ProposalTemplate } from '../types/proposal';
import './CreateProposal.css';

const TEMPLATE_OPTIONS: { value: ProposalTemplate; label: string; description: string; swatch: string[] }[] = [
  { value: 'DARK_LUXE', label: 'Dark Luxe', description: 'Moody dark background, gold & crimson accents, serif headings.', swatch: ['#0d0703', '#d4a843', '#c0392b'] },
  { value: 'BRIGHT_MODERN', label: 'Bright Modern', description: 'Clean white background, vivid indigo accents, sans-serif.', swatch: ['#ffffff', '#5b4fe0', '#e6e5f2'] },
];

interface SelectedPackage {
  packageId: string;
  quantity: number;
}

interface SelectedItem {
  serviceId: string;
  priceType: 'per_day' | 'flat';
  quantity: number;
  isOptional: boolean;
}

function priceLabel(pkg: Package): string {
  return `₹${pkg.price.toLocaleString('en-IN')}`;
}

function servicePriceOptions(service: Service): { value: 'per_day' | 'flat'; label: string }[] {
  const options: { value: 'per_day' | 'flat'; label: string }[] = [];
  if (service.perDayPrice != null) {
    options.push({ value: 'per_day', label: `₹${service.perDayPrice.toLocaleString('en-IN')} / day` });
  }
  if (service.flatPrice != null) {
    options.push({ value: 'flat', label: `₹${service.flatPrice.toLocaleString('en-IN')} flat` });
  }
  return options;
}

export default function CreateProposal() {
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);
  const navigate = useNavigate();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [services, setServices] = useState<Service[]>([]);

  const [customerId, setCustomerId] = useState('');
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');

  const [weddingDate, setWeddingDate] = useState('');
  const [weddingLocation, setWeddingLocation] = useState('');
  const [numberOfDays, setNumberOfDays] = useState('');
  const [notes, setNotes] = useState('');

  const [selectedPackages, setSelectedPackages] = useState<SelectedPackage[]>([]);
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);

  const [template, setTemplate] = useState<ProposalTemplate>('DARK_LUXE');

  const [discountType, setDiscountType] = useState<'' | 'FIXED' | 'PERCENTAGE'>('');
  const [discountValue, setDiscountValue] = useState('');
  const [taxRate, setTaxRate] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState<Proposal | null>(null);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    apiGet<Customer[]>('/api/customers').then(setCustomers).catch(() => setError('Failed to load customers'));
    apiGet<Package[]>('/api/packages').then(setPackages).catch(() => setError('Failed to load packages'));
    apiGet<Service[]>('/api/services').then(setServices).catch(() => setError('Failed to load services'));
  }, []);

  useEffect(() => {
    if (!id) return;
    apiGet<Proposal>(`/api/proposals/${id}`)
      .then((p) => {
        setCustomerId(p.customerId);
        setWeddingDate(p.weddingDate);
        setWeddingLocation(p.weddingLocation);
        setNumberOfDays(p.numberOfDays != null ? String(p.numberOfDays) : '');
        setNotes(p.notes ?? '');
        setSelectedPackages(p.packages.map((pkg) => ({ packageId: pkg.packageId, quantity: pkg.quantity })));
        setSelectedItems(
          p.items.map((item) => ({
            serviceId: item.serviceId,
            priceType: item.priceType,
            quantity: item.quantity,
            isOptional: item.isOptional,
          })),
        );
        setDiscountType(p.discountType ?? '');
        setDiscountValue(p.discountValue != null ? String(p.discountValue) : '');
        setTaxRate(String(p.taxRate));
        setTemplate(p.template);
      })
      .catch((err) => setLoadError(err instanceof Error ? err.message : 'Failed to load proposal'));
  }, [id]);

  async function handleCreateCustomer(e: React.FormEvent) {
    e.preventDefault();
    const customer = await apiPost<Customer>('/api/customers', {
      name: newCustomerName,
      phone: newCustomerPhone,
    });
    setCustomers((prev) => [...prev, customer]);
    setCustomerId(customer.id);
    setNewCustomerName('');
    setNewCustomerPhone('');
    setShowNewCustomer(false);
  }

  function addPackage(pkg: Package) {
    if (selectedPackages.some((p) => p.packageId === pkg.id)) return;
    setSelectedPackages((prev) => [...prev, { packageId: pkg.id, quantity: 1 }]);
  }

  function updatePackageQuantity(packageId: string, quantity: number) {
    setSelectedPackages((prev) =>
      prev.map((p) => (p.packageId === packageId ? { ...p, quantity } : p)),
    );
  }

  function removePackage(packageId: string) {
    setSelectedPackages((prev) => prev.filter((p) => p.packageId !== packageId));
  }

  function addService(service: Service) {
    if (selectedItems.some((i) => i.serviceId === service.id)) return;
    const priceType = service.perDayPrice != null ? 'per_day' : 'flat';
    setSelectedItems((prev) => [
      ...prev,
      { serviceId: service.id, priceType, quantity: 1, isOptional: false },
    ]);
  }

  function updateItem(serviceId: string, patch: Partial<SelectedItem>) {
    setSelectedItems((prev) =>
      prev.map((i) => (i.serviceId === serviceId ? { ...i, ...patch } : i)),
    );
  }

  function removeItem(serviceId: string) {
    setSelectedItems((prev) => prev.filter((i) => i.serviceId !== serviceId));
  }

  function resetForm() {
    setCustomerId('');
    setShowNewCustomer(false);
    setWeddingDate('');
    setWeddingLocation('');
    setNumberOfDays('');
    setNotes('');
    setSelectedPackages([]);
    setSelectedItems([]);
    setDiscountType('');
    setDiscountValue('');
    setTaxRate('');
    setTemplate('DARK_LUXE');
    setError('');
    setSaved(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (saved) return;
    setError('');
    if (!customerId) {
      setError('Select or create a customer first');
      return;
    }
    if (!selectedPackages.length && !selectedItems.length) {
      setError('Add at least one package or service');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        customerId,
        weddingDate,
        weddingLocation,
        numberOfDays: numberOfDays ? Number(numberOfDays) : undefined,
        notes: notes || undefined,
        packages: selectedPackages,
        items: selectedItems,
        template,
        discount:
          discountType && discountValue
            ? { type: discountType, value: Number(discountValue) }
            : isEditing ? null : undefined,
        taxRate: taxRate ? Number(taxRate) : undefined,
      };
      if (isEditing && id) {
        await apiPut<Proposal>(`/api/proposals/${id}`, payload);
        navigate(`/proposals/${id}/preview`);
      } else {
        const proposal = await apiPost<Proposal>('/api/proposals', payload);
        setSaved(proposal);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save proposal');
    } finally {
      setSaving(false);
    }
  }

  const includedItems = selectedItems.filter((i) => !i.isOptional);
  const optionalItems = selectedItems.filter((i) => i.isOptional);

  if (loadError) {
    return (
      <div className="cp-container">
        <p className="cp-error">{loadError}</p>
      </div>
    );
  }

  return (
    <div className="cp-container">
      <div className="cp-page-header">
        <h1 className="cp-title">{isEditing ? 'Edit Proposal' : 'Create Proposal'}</h1>
        <p className="cp-subtitle">
          {isEditing
            ? 'Only drafts can be edited — changes recalculate the total.'
            : 'Build a quotation from your catalog and send it to a customer.'}
        </p>
      </div>

      {saved && (
        <div className="cp-success">
          Proposal <strong>{saved.proposalNumber}</strong> saved as a draft — total <strong>₹{saved.total.toLocaleString('en-IN')}</strong>.
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <section className="cp-section">
          <h2>Customer</h2>
          <p className="cp-section-sub">Who this proposal is for.</p>

          <div className="cp-customer-row">
            <select
              className="cp-select"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
            >
              <option value="">Select a customer…</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name} — {c.phone}</option>
              ))}
            </select>
            <button
              type="button"
              className="cp-link-btn"
              onClick={() => setShowNewCustomer((v) => !v)}
            >
              {showNewCustomer ? 'Cancel' : '+ New customer'}
            </button>
          </div>

          {showNewCustomer && (
            <div className="cp-new-customer">
              <div>
                <label className="cp-label" htmlFor="cp-new-name">Name</label>
                <input
                  id="cp-new-name"
                  className="cp-input"
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  placeholder="Priya & Arjun"
                />
              </div>
              <div>
                <label className="cp-label" htmlFor="cp-new-phone">Phone</label>
                <input
                  id="cp-new-phone"
                  className="cp-input"
                  value={newCustomerPhone}
                  onChange={(e) => setNewCustomerPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                />
              </div>
              <button
                type="button"
                className="cp-add-btn"
                disabled={!newCustomerName || !newCustomerPhone}
                onClick={handleCreateCustomer}
              >
                Create
              </button>
            </div>
          )}
        </section>

        <section className="cp-section">
          <h2>Wedding details</h2>
          <p className="cp-section-sub">Date, location, and anything worth noting.</p>

          <div className="cp-row">
            <div>
              <label className="cp-label" htmlFor="cp-date">Wedding date</label>
              <input
                id="cp-date"
                type="date"
                className="cp-input"
                value={weddingDate}
                onChange={(e) => setWeddingDate(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="cp-label" htmlFor="cp-location">Location</label>
              <input
                id="cp-location"
                className="cp-input"
                value={weddingLocation}
                onChange={(e) => setWeddingLocation(e.target.value)}
                placeholder="Nagpur"
                required
              />
            </div>
          </div>
          <div className="cp-row">
            <div>
              <label className="cp-label" htmlFor="cp-days">Number of days</label>
              <input
                id="cp-days"
                type="number"
                min="1"
                className="cp-input"
                value={numberOfDays}
                onChange={(e) => setNumberOfDays(e.target.value)}
                placeholder="1"
              />
            </div>
            <div>
              <label className="cp-label" htmlFor="cp-notes">Notes</label>
              <input
                id="cp-notes"
                className="cp-input"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Anything worth remembering"
              />
            </div>
          </div>
        </section>

        <section className="cp-section">
          <h2>Template</h2>
          <p className="cp-section-sub">How the proposal looks when shared with the customer.</p>
          <div className="cp-template-grid">
            {TEMPLATE_OPTIONS.map((opt) => (
              <button
                type="button"
                key={opt.value}
                className={`cp-template-card${template === opt.value ? ' cp-template-card-selected' : ''}`}
                onClick={() => setTemplate(opt.value)}
              >
                <div className="cp-template-swatch">
                  {opt.swatch.map((color, i) => (
                    <span key={i} style={{ background: color }} />
                  ))}
                </div>
                <div className="cp-template-name">{opt.label}</div>
                <div className="cp-template-desc">{opt.description}</div>
              </button>
            ))}
          </div>
        </section>

        <section className="cp-section">
          <h2>Packages</h2>
          <p className="cp-section-sub">Add one or more packages from your catalog.</p>

          {packages
            .filter((p) => p.active && !selectedPackages.some((sp) => sp.packageId === p.id))
            .map((p) => (
              <div className="cp-catalog-row" key={p.id}>
                <div className="cp-catalog-info">
                  <div className="cp-catalog-name">{p.name}</div>
                  <div className="cp-catalog-price">{priceLabel(p)}</div>
                </div>
                <button type="button" className="cp-add-btn" onClick={() => addPackage(p)}>Add</button>
              </div>
            ))}

          {selectedPackages.length > 0 && (
            <div className="cp-selected-list">
              {selectedPackages.map((sp) => {
                const pkg = packages.find((p) => p.id === sp.packageId);
                if (!pkg) return null;
                return (
                  <div className="cp-selected-row" key={sp.packageId}>
                    <span className="cp-selected-name">{pkg.name}</span>
                    <input
                      type="number"
                      min="1"
                      className="cp-qty-input"
                      value={sp.quantity}
                      onChange={(e) =>
                        updatePackageQuantity(sp.packageId, Math.max(1, Number(e.target.value)))
                      }
                    />
                    <span className="cp-selected-total">
                      ₹{(pkg.price * sp.quantity).toLocaleString('en-IN')}
                    </span>
                    <button
                      type="button"
                      className="cp-remove-btn"
                      aria-label="Remove"
                      onClick={() => removePackage(sp.packageId)}
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="cp-section">
          <h2>Services</h2>
          <p className="cp-section-sub">Add individual services. Mark any as optional to exclude them from the total.</p>

          {services
            .filter((s) => s.active && !selectedItems.some((si) => si.serviceId === s.id))
            .map((s) => (
              <div className="cp-catalog-row" key={s.id}>
                <div className="cp-catalog-info">
                  <div className="cp-catalog-name">{s.name}</div>
                  <div className="cp-catalog-price">
                    {servicePriceOptions(s).map((o) => o.label).join(' · ')}
                  </div>
                </div>
                <button type="button" className="cp-add-btn" onClick={() => addService(s)}>Add</button>
              </div>
            ))}

          {includedItems.length > 0 && (
            <>
              <p className="cp-selected-heading">Included</p>
              <div className="cp-selected-list">
                {includedItems.map((item) => {
                  const service = services.find((s) => s.id === item.serviceId);
                  if (!service) return null;
                  const options = servicePriceOptions(service);
                  const unitPrice = item.priceType === 'per_day' ? service.perDayPrice! : service.flatPrice!;
                  return (
                    <div className="cp-selected-row" key={item.serviceId}>
                      <span className="cp-selected-name">{service.name}</span>
                      {options.length > 1 && (
                        <select
                          className="cp-price-type-select"
                          value={item.priceType}
                          onChange={(e) =>
                            updateItem(item.serviceId, { priceType: e.target.value as 'per_day' | 'flat' })
                          }
                        >
                          {options.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                      )}
                      <input
                        type="number"
                        min="1"
                        className="cp-qty-input"
                        value={item.quantity}
                        onChange={(e) =>
                          updateItem(item.serviceId, { quantity: Math.max(1, Number(e.target.value)) })
                        }
                      />
                      <label className="cp-checkbox-label">
                        <input
                          type="checkbox"
                          checked={item.isOptional}
                          onChange={(e) => updateItem(item.serviceId, { isOptional: e.target.checked })}
                        />
                        Optional
                      </label>
                      <span className="cp-selected-total">
                        ₹{(unitPrice * item.quantity).toLocaleString('en-IN')}
                      </span>
                      <button
                        type="button"
                        className="cp-remove-btn"
                        aria-label="Remove"
                        onClick={() => removeItem(item.serviceId)}
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {optionalItems.length > 0 && (
            <>
              <p className="cp-selected-heading">Optional (excluded from total)</p>
              <div className="cp-selected-list">
                {optionalItems.map((item) => {
                  const service = services.find((s) => s.id === item.serviceId);
                  if (!service) return null;
                  const options = servicePriceOptions(service);
                  const unitPrice = item.priceType === 'per_day' ? service.perDayPrice! : service.flatPrice!;
                  return (
                    <div className="cp-selected-row" key={item.serviceId}>
                      <span className="cp-selected-name">{service.name}</span>
                      {options.length > 1 && (
                        <select
                          className="cp-price-type-select"
                          value={item.priceType}
                          onChange={(e) =>
                            updateItem(item.serviceId, { priceType: e.target.value as 'per_day' | 'flat' })
                          }
                        >
                          {options.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                      )}
                      <input
                        type="number"
                        min="1"
                        className="cp-qty-input"
                        value={item.quantity}
                        onChange={(e) =>
                          updateItem(item.serviceId, { quantity: Math.max(1, Number(e.target.value)) })
                        }
                      />
                      <label className="cp-checkbox-label">
                        <input
                          type="checkbox"
                          checked={item.isOptional}
                          onChange={(e) => updateItem(item.serviceId, { isOptional: e.target.checked })}
                        />
                        Optional
                      </label>
                      <span className="cp-selected-total">
                        ₹{(unitPrice * item.quantity).toLocaleString('en-IN')}
                      </span>
                      <button
                        type="button"
                        className="cp-remove-btn"
                        aria-label="Remove"
                        onClick={() => removeItem(item.serviceId)}
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {!selectedPackages.length && !includedItems.length && !optionalItems.length && (
            <p className="cp-empty-note">Nothing added yet.</p>
          )}
        </section>

        <section className="cp-section">
          <h2>Pricing</h2>
          <p className="cp-section-sub">Discount and tax are applied server-side — nothing here is trusted from the browser.</p>

          {!saved && (
            <div className="cp-row">
              <div>
                <label className="cp-label" htmlFor="cp-discount-type">Discount</label>
                <select
                  id="cp-discount-type"
                  className="cp-select"
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value as typeof discountType)}
                >
                  <option value="">None</option>
                  <option value="FIXED">Fixed amount (₹)</option>
                  <option value="PERCENTAGE">Percentage (%)</option>
                </select>
              </div>
              <div>
                <label className="cp-label" htmlFor="cp-discount-value">
                  {discountType === 'PERCENTAGE' ? 'Discount %' : 'Discount amount (₹)'}
                </label>
                <input
                  id="cp-discount-value"
                  type="number"
                  min="0"
                  className="cp-input"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  disabled={!discountType}
                  placeholder={discountType === 'PERCENTAGE' ? '10' : '5000'}
                />
              </div>
            </div>
          )}
          {!saved && (
            <div className="cp-row">
              <div>
                <label className="cp-label" htmlFor="cp-tax-rate">Tax rate (%)</label>
                <input
                  id="cp-tax-rate"
                  type="number"
                  min="0"
                  className="cp-input"
                  value={taxRate}
                  onChange={(e) => setTaxRate(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div />
            </div>
          )}

          {saved ? (
            <>
              <div className="cp-pricing-row"><span>Subtotal</span><span>₹{saved.subtotal.toLocaleString('en-IN')}</span></div>
              {saved.discountAmount > 0 && (
                <div className="cp-pricing-row"><span>Discount</span><span>−₹{saved.discountAmount.toLocaleString('en-IN')}</span></div>
              )}
              {saved.taxAmount > 0 && (
                <div className="cp-pricing-row"><span>Tax ({saved.taxRate}%)</span><span>+₹{saved.taxAmount.toLocaleString('en-IN')}</span></div>
              )}
              <div className="cp-pricing-row cp-total"><span>Total</span><span>₹{saved.total.toLocaleString('en-IN')}</span></div>
            </>
          ) : (
            <p className="cp-empty-note">Save the draft to see the computed total.</p>
          )}
        </section>

        <section className="cp-section">
          <div className="cp-actions">
            {saved ? (
              <button type="button" className="cp-save-btn" onClick={resetForm}>
                Create another proposal
              </button>
            ) : (
              <button type="submit" className="cp-save-btn" disabled={saving}>
                {saving ? 'Saving…' : isEditing ? 'Save changes' : 'Save Draft'}
              </button>
            )}
            {saved && (
              <Link to={`/proposals/${saved.id}/preview`} className="cp-preview-link">
                Preview Proposal
              </Link>
            )}
            {isEditing && !saving && (
              <Link to={`/proposals/${id}/preview`} className="cp-preview-link">
                Cancel
              </Link>
            )}
            {error && <span className="cp-error">{error}</span>}
          </div>
        </section>
      </form>
    </div>
  );
}
