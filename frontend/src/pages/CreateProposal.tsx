import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { apiGet, apiPost, apiPut } from '../api/client';
import { GroupedNumberInput } from '../components/GroupedNumberInput';
import { PhoneInput } from '../components/PhoneInput';
import type { Customer } from '../types/customer';
import type { Package, Service } from '../types/catalog';
import type { Proposal, ProposalTemplate } from '../types/proposal';
import type { EventType } from '../types/eventType';
import './CreateProposal.css';

const TEMPLATE_OPTIONS: { value: ProposalTemplate; label: string; description: string; swatch: string[] }[] = [
  { value: 'DARK_LUXE', label: 'Dark Luxe', description: 'Moody dark background, gold & crimson accents, serif headings.', swatch: ['#0d0703', '#d4a843', '#c0392b'] },
  { value: 'BRIGHT_MODERN', label: 'Bright Modern', description: 'Clean white background, vivid indigo accents, sans-serif.', swatch: ['#ffffff', '#5b4fe0', '#e6e5f2'] },
  { value: 'EDITORIAL', label: 'Editorial', description: 'Warm paper, gold rules, three pages — services, payment plan, deliverables.', swatch: ['#fffdf9', '#c9a86a', '#1f1a17'] },
];

interface SelectedPackage {
  key: string;
  packageId: string;
  quantity: number;
  eventKey: string;
}

interface EventRow {
  key: string;
  eventTypeId: string;
  name: string;
  date: string;
  location: string;
}

function newEvent(fields: Partial<EventRow> = {}): EventRow {
  return { key: crypto.randomUUID(), eventTypeId: '', name: '', date: '', location: '', ...fields };
}

interface SelectedItem {
  key: string;
  serviceId: string;
  quantity: number;
  isOptional: boolean;
  eventKey: string;
}

// '' means the line covers the whole proposal rather than one event.
function EventSelect({
  value,
  events,
  onChange,
}: {
  value: string;
  events: EventRow[];
  onChange: (eventKey: string) => void;
}) {
  return (
    <select
      className="cp-select cp-event-select"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label="Applies to"
    >
      <option value="">All events</option>
      {events
        .filter((e) => e.name && e.date)
        .map((e) => (
          <option key={e.key} value={e.key}>{e.name}</option>
        ))}
    </select>
  );
}

function priceLabel(pkg: Package): string {
  return `₹${pkg.price.toLocaleString('en-IN')}`;
}

function servicePriceLabel(service: Service): string {
  return service.flatPrice != null ? `₹${service.flatPrice.toLocaleString('en-IN')}` : '—';
}

export default function CreateProposal() {
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);
  const navigate = useNavigate();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);

  const [customerId, setCustomerId] = useState('');
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');

  const [events, setEvents] = useState<EventRow[]>([newEvent()]);
  const [weddingLocation, setWeddingLocation] = useState('');
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
    apiGet<EventType[]>('/api/event-types?active=true').then(setEventTypes).catch(() => setError('Failed to load events'));
  }, []);

  useEffect(() => {
    if (!id) return;
    apiGet<Proposal>(`/api/proposals/${id}`)
      .then((p) => {
        setCustomerId(p.customerId);
        // A proposal created before events existed has none -- seed one row
        // from its single date so the form stays editable.
        // Event rows carry their DB id as the form key, so saved line items can
        // point back at the row they belong to.
        const loadedEvents = p.events.length
          ? p.events.map((e) =>
              newEvent({
                key: e.id,
                eventTypeId: e.eventTypeId ?? '',
                name: e.name,
                date: e.date,
                location: e.location ?? '',
              }),
            )
          : [newEvent({ name: 'Wedding', date: p.weddingDate })];
        setEvents(loadedEvents);
        const eventKeyOf = (id: string | null) =>
          id && loadedEvents.some((e) => e.key === id) ? id : '';
        setWeddingLocation(p.weddingLocation);
        setNotes(p.notes ?? '');
        setSelectedPackages(
          p.packages.map((pkg) => ({
            key: pkg.id,
            packageId: pkg.packageId,
            quantity: pkg.quantity,
            eventKey: eventKeyOf(pkg.proposalEventId),
          })),
        );
        setSelectedItems(
          p.items.map((item) => ({
            key: item.id,
            serviceId: item.serviceId,
            quantity: item.quantity,
            isOptional: item.isOptional,
            eventKey: eventKeyOf(item.proposalEventId),
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
    setSelectedPackages((prev) => [
      ...prev,
      { key: crypto.randomUUID(), packageId: pkg.id, quantity: 1, eventKey: '' },
    ]);
  }

  function updatePackage(key: string, patch: Partial<SelectedPackage>) {
    setSelectedPackages((prev) => prev.map((p) => (p.key === key ? { ...p, ...patch } : p)));
  }

  function removePackage(key: string) {
    setSelectedPackages((prev) => prev.filter((p) => p.key !== key));
  }

  function addService(service: Service) {
    setSelectedItems((prev) => [
      ...prev,
      { key: crypto.randomUUID(), serviceId: service.id, quantity: 1, isOptional: false, eventKey: '' },
    ]);
  }

  function updateItem(key: string, patch: Partial<SelectedItem>) {
    setSelectedItems((prev) => prev.map((i) => (i.key === key ? { ...i, ...patch } : i)));
  }

  function removeItem(key: string) {
    setSelectedItems((prev) => prev.filter((i) => i.key !== key));
  }

  function addEvent() {
    setEvents((prev) => [...prev, newEvent()]);
  }

  function updateEvent(index: number, patch: Partial<EventRow>) {
    setEvents((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function removeEvent(index: number) {
    setEvents((prev) => prev.filter((_, i) => i !== index));
  }

  function selectEventType(index: number, name: string) {
    const match = eventTypes.find((t) => t.name === name);
    updateEvent(index, { name, eventTypeId: match?.id ?? '' });
  }

  function resetForm() {
    setCustomerId('');
    setShowNewCustomer(false);
    setEvents([newEvent()]);
    setWeddingLocation('');
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
    const filledEvents = events.filter((e) => e.name && e.date);
    if (!filledEvents.length) {
      setError('Add at least one event with a name and a date');
      return;
    }
    // A line pointing at an event row that was since emptied falls back to
    // covering the whole proposal.
    const eventIndexOf = (eventKey: string) => {
      const index = filledEvents.findIndex((e) => e.key === eventKey);
      return index === -1 ? undefined : index;
    };
    setSaving(true);
    try {
      const payload = {
        customerId,
        events: filledEvents.map((e) => ({
          eventTypeId: e.eventTypeId || undefined,
          name: e.name,
          date: e.date,
          location: e.location || undefined,
        })),
        weddingLocation,
        notes: notes || undefined,
        packages: selectedPackages.map((p) => ({
          packageId: p.packageId,
          quantity: p.quantity,
          eventIndex: eventIndexOf(p.eventKey),
        })),
        items: selectedItems.map((i) => ({
          serviceId: i.serviceId,
          quantity: i.quantity,
          isOptional: i.isOptional,
          eventIndex: eventIndexOf(i.eventKey),
        })),
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

  function renderItemRow(item: SelectedItem) {
    const service = services.find((s) => s.id === item.serviceId);
    if (!service) return null;
    return (
      <div className="cp-selected-row cp-selected-row-service" key={item.key}>
        <span className="cp-selected-name">{service.name}</span>
        <EventSelect
          value={item.eventKey}
          events={events}
          onChange={(eventKey) => updateItem(item.key, { eventKey })}
        />
        <GroupedNumberInput
          className="cp-qty-input"
          value={item.quantity}
          onDigitsChange={(digits) =>
            updateItem(item.key, { quantity: Math.max(1, Number(digits) || 1) })
          }
        />
        <label className="cp-checkbox-label">
          <input
            type="checkbox"
            checked={item.isOptional}
            onChange={(e) => updateItem(item.key, { isOptional: e.target.checked })}
          />
          Optional
        </label>
        <span className="cp-selected-total">
          ₹{(service.flatPrice! * item.quantity).toLocaleString('en-IN')}
        </span>
        <button
          type="button"
          className="cp-remove-btn"
          aria-label="Remove"
          onClick={() => removeItem(item.key)}
        >
          ×
        </button>
      </div>
    );
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

      <form onSubmit={handleSubmit} autoComplete="off">
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
                  autoComplete="off"
                />
              </div>
              <div>
                <label className="cp-label" htmlFor="cp-new-phone">Phone</label>
                <PhoneInput
                  id="cp-new-phone"
                  value={newCustomerPhone}
                  onChange={setNewCustomerPhone}
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
          <h2>Events</h2>
          <p className="cp-section-sub">
            Every ceremony this proposal covers. The proposal lists them by date.
          </p>

          {events.map((row, i) => (
            <div className="cp-event-row" key={i}>
              <select
                className="cp-select"
                value={row.name}
                onChange={(e) => selectEventType(i, e.target.value)}
                aria-label="Event"
              >
                <option value="">Select event…</option>
                {/* A snapshotted name whose catalog entry is gone still needs an option to sit in. */}
                {row.name && !eventTypes.some((t) => t.name === row.name) && (
                  <option value={row.name}>{row.name}</option>
                )}
                {eventTypes.map((t) => (
                  <option key={t.id} value={t.name}>{t.name}</option>
                ))}
              </select>
              <input
                type="date"
                className="cp-input"
                value={row.date}
                onChange={(e) => updateEvent(i, { date: e.target.value })}
                aria-label="Event date"
              />
              <input
                className="cp-input"
                value={row.location}
                onChange={(e) => updateEvent(i, { location: e.target.value })}
                placeholder="Venue (optional)"
                aria-label="Event venue"
              />
              <button
                type="button"
                className="cp-remove-btn"
                onClick={() => removeEvent(i)}
                disabled={events.length === 1}
                aria-label="Remove event"
              >
                ×
              </button>
            </div>
          ))}

          <button type="button" className="cp-link-btn cp-event-add" onClick={addEvent}>
            + Add event
          </button>

          <div className="cp-row" style={{ marginTop: 18 }}>
            <div>
              <label className="cp-label" htmlFor="cp-location">Main location</label>
              <input
                id="cp-location"
                className="cp-input"
                value={weddingLocation}
                onChange={(e) => setWeddingLocation(e.target.value)}
                placeholder="Nagpur"
                required
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
            .filter((p) => p.active)
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
                  <div className="cp-selected-row cp-selected-row-package" key={sp.key}>
                    <span className="cp-selected-name">{pkg.name}</span>
                    <EventSelect
                      value={sp.eventKey}
                      events={events}
                      onChange={(eventKey) => updatePackage(sp.key, { eventKey })}
                    />
                    <GroupedNumberInput
                      className="cp-qty-input"
                      value={sp.quantity}
                      onDigitsChange={(digits) =>
                        updatePackage(sp.key, { quantity: Math.max(1, Number(digits) || 1) })
                      }
                    />
                    <span className="cp-selected-total">
                      ₹{(pkg.price * sp.quantity).toLocaleString('en-IN')}
                    </span>
                    <button
                      type="button"
                      className="cp-remove-btn"
                      aria-label="Remove"
                      onClick={() => removePackage(sp.key)}
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
            .filter((s) => s.active)
            .map((s) => (
              <div className="cp-catalog-row" key={s.id}>
                <div className="cp-catalog-info">
                  <div className="cp-catalog-name">{s.name}</div>
                  <div className="cp-catalog-price">{servicePriceLabel(s)}</div>
                </div>
                <button type="button" className="cp-add-btn" onClick={() => addService(s)}>Add</button>
              </div>
            ))}

          {includedItems.length > 0 && (
            <>
              <p className="cp-selected-heading">Included</p>
              <div className="cp-selected-list">
                {includedItems.map((item) => renderItemRow(item))}
              </div>
            </>
          )}

          {optionalItems.length > 0 && (
            <>
              <p className="cp-selected-heading">Optional (excluded from total)</p>
              <div className="cp-selected-list">
                {optionalItems.map((item) => renderItemRow(item))}
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
                <GroupedNumberInput
                  id="cp-discount-value"
                  className="cp-input"
                  value={discountValue}
                  onDigitsChange={setDiscountValue}
                  disabled={!discountType}
                  placeholder={discountType === 'PERCENTAGE' ? '10' : '5,000'}
                />
              </div>
            </div>
          )}
          {!saved && (
            <div className="cp-row">
              <div>
                <label className="cp-label" htmlFor="cp-tax-rate">Tax rate (%)</label>
                <GroupedNumberInput
                  id="cp-tax-rate"
                  className="cp-input"
                  value={taxRate}
                  onDigitsChange={setTaxRate}
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
