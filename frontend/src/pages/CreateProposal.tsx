import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { apiGet, apiPost, apiPut } from '../api/client';
import { GroupedNumberInput } from '../components/GroupedNumberInput';
import { PhoneInput } from '../components/PhoneInput';
import { formatDateRange } from '../lib/dates';
import type { Business } from '../types/business';
import type { Customer } from '../types/customer';
import type { Package, Service } from '../types/catalog';
import type { Proposal, ProposalTemplate } from '../types/proposal';
import type { EventType } from '../types/eventType';
import ChangeClientModal, { type EventSummary } from '../components/ChangeClientModal';
import './CreateProposal.css';

const TEMPLATE_OPTIONS: { value: ProposalTemplate; label: string; description: string; swatch: string[] }[] = [
  { value: 'DARK_LUXE', label: 'Dark Luxe', description: 'Moody dark background, gold & crimson accents, serif headings.', swatch: ['#0d0703', '#d4a843', '#c0392b'] },
  { value: 'BRIGHT_MODERN', label: 'Bright Modern', description: 'Clean white background, vivid indigo accents, sans-serif.', swatch: ['#ffffff', '#5b4fe0', '#e6e5f2'] },
  { value: 'EDITORIAL', label: 'Editorial', description: 'Warm paper, gold rules, three pages — services, payment plan, deliverables.', swatch: ['#fffdf9', '#c9a86a', '#1f1a17'] },
];

const STEPS = ['Client', 'Events', 'Select Package', 'Customize', 'Review & Send'] as const;
type TabKey = 'services' | 'addons' | 'notes';

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

function money(value: number): string {
  return `₹${value.toLocaleString('en-IN')}`;
}

function initials(name: string): string {
  return (
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join('') || '—'
  );
}

function CheckIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="m5 13 4 4L19 7" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function GripIcon() {
  return (
    <svg width="12" height="16" viewBox="0 0 12 16" fill="none" aria-hidden="true">
      {[[3, 3], [9, 3], [3, 8], [9, 8], [3, 13], [9, 13]].map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="1.15" fill="currentColor" />
      ))}
    </svg>
  );
}

function MonitorIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="2" y="4" width="20" height="13" rx="2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M9 21h6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function TabletIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="5" y="2" width="14" height="20" rx="2" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="7" y="2" width="10" height="20" rx="2.2" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

function DocIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M8 3h5l5 5v11a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2ZM13 3v5h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function QtyStepper({ value, onChange }: { value: number; onChange: (next: number) => void }) {
  return (
    <div className="cp-qty">
      <button type="button" onClick={() => onChange(Math.max(1, value - 1))} aria-label="Decrease quantity">−</button>
      <span>{value}</span>
      <button type="button" onClick={() => onChange(value + 1)} aria-label="Increase quantity">+</button>
    </div>
  );
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

export default function CreateProposal() {
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);
  const navigate = useNavigate();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [business, setBusiness] = useState<Business | null>(null);

  const [customerId, setCustomerId] = useState('');
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');

  const [events, setEvents] = useState<EventRow[]>([newEvent()]);
  const [weddingLocation, setWeddingLocation] = useState('');
  const [notes, setNotes] = useState('');

  const [selectedPackages, setSelectedPackages] = useState<SelectedPackage[]>([]);
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [packageSearch, setPackageSearch] = useState('');
  const [packageCategory, setPackageCategory] = useState('');
  const [showPricing, setShowPricing] = useState(true);

  const [template, setTemplate] = useState<ProposalTemplate>('DARK_LUXE');

  const [discountType, setDiscountType] = useState<'' | 'FIXED' | 'PERCENTAGE'>('');
  const [discountValue, setDiscountValue] = useState('');
  const [taxRate, setTaxRate] = useState('');

  const [step, setStep] = useState(0);
  const [tab, setTab] = useState<TabKey>('services');
  const [device, setDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [changingClient, setChangingClient] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState<Proposal | null>(null);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    apiGet<Customer[]>('/api/customers').then(setCustomers).catch(() => setError('Failed to load clients'));
    apiGet<Package[]>('/api/packages').then(setPackages).catch(() => setError('Failed to load packages'));
    apiGet<Service[]>('/api/services').then(setServices).catch(() => setError('Failed to load services'));
    apiGet<EventType[]>('/api/event-types?active=true').then(setEventTypes).catch(() => setError('Failed to load events'));
    apiGet<Business>('/api/business').then(setBusiness).catch(() => setBusiness(null));
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

  async function createCustomer(name: string, phone: string): Promise<Customer> {
    const customer = await apiPost<Customer>('/api/customers', { name, phone });
    setCustomers((prev) => [...prev, customer]);
    return customer;
  }

  async function updateCustomer(customerIdToUpdate: string, fields: Record<string, string>) {
    const payload = {
      name: fields.name,
      phone: fields.phone,
      email: fields.email || undefined,
      address: fields.address || undefined,
      notes: fields.notes || undefined,
    };
    const updated = await apiPut<Customer>(`/api/customers/${customerIdToUpdate}`, payload);
    setCustomers((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  }

  async function handleCreateCustomer(e: React.FormEvent) {
    e.preventDefault();
    const customer = await createCustomer(newCustomerName, newCustomerPhone);
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

  function addService(service: Service, isOptional: boolean) {
    setSelectedItems((prev) => [
      ...prev,
      { key: crypto.randomUUID(), serviceId: service.id, quantity: 1, isOptional, eventKey: '' },
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
    setStep(0);
  }

  const customer = customers.find((c) => c.id === customerId) ?? null;
  const filledEvents = useMemo(() => events.filter((e) => e.name && e.date), [events]);
  const includedItems = selectedItems.filter((i) => !i.isOptional);
  const optionalItems = selectedItems.filter((i) => i.isOptional);

  const sortedEventDates = useMemo(
    () => filledEvents.map((e) => e.date).sort(),
    [filledEvents],
  );

  function buildEventSummary(): EventSummary {
    const longDate = (v: string) =>
      new Date(v).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    const type =
      filledEvents.length > 1 ? filledEvents.length + ' events' : filledEvents[0]?.name || 'Not set';
    const dateRange = sortedEventDates.length
      ? formatDateRange(sortedEventDates[0], sortedEventDates[sortedEventDates.length - 1], longDate)
      : 'Not set';
    return { type, dateRange };
  }

  const priceOf = (item: SelectedItem) =>
    (services.find((s) => s.id === item.serviceId)?.flatPrice ?? 0) * item.quantity;
  const packagePriceOf = (row: SelectedPackage) =>
    (packages.find((p) => p.id === row.packageId)?.price ?? 0) * row.quantity;

  const activePackages = packages.filter((p) => p.active);
  // Packages have no category of their own -- derived from the real category
  // on each included service, so the chips only ever name categories that
  // actually exist in this business's catalog.
  const packageCategories = useMemo(() => {
    const set = new Set<string>();
    for (const pkg of activePackages) {
      for (const item of pkg.items ?? []) {
        if (item.service.category) set.add(item.service.category);
      }
    }
    return [...set].sort();
  }, [packages]);

  const filteredPackages = activePackages.filter((pkg) => {
    if (packageCategory && !(pkg.items ?? []).some((i) => i.service.category === packageCategory)) {
      return false;
    }
    const q = packageSearch.trim().toLowerCase();
    if (!q) return true;
    return pkg.name.toLowerCase().includes(q) || (pkg.description ?? '').toLowerCase().includes(q);
  });

  // Display only -- the payload never carries a total, and the server recomputes
  // pricing from the ids on save (FR-011). Mirrors backend/src/pricing.ts.
  const preview = useMemo(() => {
    const subtotal =
      selectedPackages.reduce((sum, p) => sum + packagePriceOf(p), 0) +
      includedItems.reduce((sum, i) => sum + priceOf(i), 0);
    const value = Number(discountValue) || 0;
    const raw = discountType === 'PERCENTAGE' ? Math.round((subtotal * value) / 100) : discountType === 'FIXED' ? value : 0;
    const discountAmount = Math.min(Math.max(raw, 0), subtotal);
    const taxable = subtotal - discountAmount;
    const taxAmount = Math.round((taxable * (Number(taxRate) || 0)) / 100);
    return { subtotal, discountAmount, taxAmount, total: taxable + taxAmount };
  }, [selectedPackages, selectedItems, packages, services, discountType, discountValue, taxRate]);

  const stepDone = [
    Boolean(customerId),
    filledEvents.length > 0 && Boolean(weddingLocation),
    selectedPackages.length > 0,
    selectedPackages.length + selectedItems.length > 0,
    false,
  ];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (saved) return;
    setError('');
    if (!customerId) {
      setError('Select or create a client first');
      setStep(0);
      return;
    }
    if (!filledEvents.length) {
      setError('Add at least one event with a name and a date');
      setStep(1);
      return;
    }
    // Select Package (step 2) and Customize's Services tab (step 3) both
    // satisfy this, so land on Select Package as the earlier of the two.
    if (!selectedPackages.length && !selectedItems.length) {
      setError('Add at least one package or service');
      setStep(2);
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
      <div className="cp-line" key={item.key}>
        <span className="cp-grip" aria-hidden="true"><GripIcon /></span>
        <span className="cp-line-thumb">{initials(service.name)}</span>
        <div className="cp-line-info">
          <p className="cp-line-name">{service.name}</p>
          {service.description && <p className="cp-line-desc">{service.description}</p>}
        </div>
        <EventSelect
          value={item.eventKey}
          events={events}
          onChange={(eventKey) => updateItem(item.key, { eventKey })}
        />
        <QtyStepper
          value={item.quantity}
          onChange={(quantity) => updateItem(item.key, { quantity })}
        />
        <span className="cp-line-total">{money(priceOf(item))}</span>
        <button
          type="button"
          className="cp-icon-btn cp-danger"
          aria-label={`Remove ${service.name}`}
          onClick={() => removeItem(item.key)}
        >
          <TrashIcon />
        </button>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="cp-page">
        <p className="cp-error">{loadError}</p>
      </div>
    );
  }

  const previewId = saved?.id ?? id;

  return (
    <div className="cp-page">
      <header className="cp-topbar">
        <div>
          <h1 className="cp-title">{isEditing ? 'Edit Proposal' : 'Create Proposal'}</h1>
          <p className="cp-subtitle">Build, customize and impress your client — all in one place.</p>
        </div>
        <div className="cp-topbar-actions">
          {saved && (
            <span className="cp-saved-pill">
              <CheckIcon /> Saved as {saved.proposalNumber}
            </span>
          )}
          {previewId ? (
            <Link to={`/proposals/${previewId}/preview`} className="cp-btn cp-btn-ghost">
              Preview
            </Link>
          ) : (
            <span className="cp-btn cp-btn-ghost cp-btn-disabled" aria-disabled="true">
              Preview
            </span>
          )}
          {saved ? (
            <button type="button" className="cp-btn cp-btn-primary" onClick={resetForm}>
              Create another
            </button>
          ) : (
            <button
              type="submit"
              form="cp-form"
              className="cp-btn cp-btn-primary"
              disabled={saving}
            >
              {saving ? 'Saving…' : isEditing ? 'Save changes' : 'Save Draft'}
            </button>
          )}
        </div>
      </header>

      <div className="cp-layout">
        <form id="cp-form" className="cp-main" onSubmit={handleSubmit} autoComplete="off">
         <div className="cp-panel">
          <nav className="cp-stepper" aria-label="Proposal steps">
            {STEPS.map((label, i) => (
              <button
                type="button"
                key={label}
                className={
                  'cp-step' + (i === step ? ' cp-step-current' : '') + (stepDone[i] ? ' cp-step-done' : '')
                }
                onClick={() => setStep(i)}
              >
                <span className="cp-step-num">{stepDone[i] && i !== step ? <CheckIcon /> : i + 1}</span>
                <span className="cp-step-label">{label}</span>
              </button>
            ))}
          </nav>

          {customer && (
            <section className="cp-client-card">
              <span className="cp-avatar">{initials(customer.name)}</span>
              <div className="cp-client-id">
                <p className="cp-client-name">{customer.name}</p>
                {customer.email && <p className="cp-client-line">{customer.email}</p>}
                <p className="cp-client-line">{customer.phone}</p>
              </div>
              <div className="cp-client-meta">
                <p className="cp-client-line">
                  {sortedEventDates.length
                    ? formatDateRange(
                        sortedEventDates[0],
                        sortedEventDates[sortedEventDates.length - 1],
                        (v) => new Date(v).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
                      )
                    : 'No event dates yet'}
                </p>
                <p className="cp-client-line">{weddingLocation || 'No location yet'}</p>
              </div>
              <button type="button" className="cp-btn cp-btn-ghost" onClick={() => setChangingClient(true)}>
                Change client
              </button>
            </section>
          )}

          {changingClient && (
            <ChangeClientModal
              customers={customers}
              currentCustomerId={customerId}
              eventSummary={buildEventSummary()}
              onCreateCustomer={createCustomer}
              onUpdateCustomer={updateCustomer}
              onSelect={(id) => {
                setCustomerId(id);
                setChangingClient(false);
              }}
              onClose={() => setChangingClient(false)}
            />
          )}

          {/* ---------------- Step 1 — Client ---------------- */}
          {step === 0 && (
            <section className="cp-step-body">
              <h2>Client</h2>
              <p className="cp-panel-sub">Who this proposal is for.</p>

              <div className="cp-customer-row">
                <select
                  className="cp-select"
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                >
                  <option value="">Select a client…</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} — {c.phone}</option>
                  ))}
                </select>
                <button
                  type="button"
                  className="cp-btn cp-btn-ghost"
                  onClick={() => setShowNewCustomer((v) => !v)}
                >
                  {showNewCustomer ? 'Cancel' : '+ New client'}
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
                    <PhoneInput
                      id="cp-new-phone"
                      value={newCustomerPhone}
                      onChange={setNewCustomerPhone}
                    />
                  </div>
                  <button
                    type="button"
                    className="cp-btn cp-btn-primary"
                    disabled={!newCustomerName || !newCustomerPhone}
                    onClick={handleCreateCustomer}
                  >
                    Create
                  </button>
                </div>
              )}
            </section>
          )}

          {/* ---------------- Step 2 — Events ---------------- */}
          {step === 1 && (
            <section className="cp-step-body">
              <h2>Events</h2>
              <p className="cp-panel-sub">
                Every ceremony this proposal covers. The proposal lists them by date.
              </p>

              {events.map((row, i) => (
                <div className="cp-event-row" key={row.key}>
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
                    className="cp-icon-btn cp-danger"
                    onClick={() => removeEvent(i)}
                    disabled={events.length === 1}
                    aria-label="Remove event"
                  >
                    <TrashIcon />
                  </button>
                </div>
              ))}

              <button type="button" className="cp-dashed-btn" onClick={addEvent}>
                + Add event
              </button>

              <div className="cp-row cp-row-spaced">
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
              </div>
            </section>
          )}

          {/* ---------------- Step 3 — Select Package ---------------- */}
          {step === 2 && (
            <section className="cp-step-body">
              <div className="cp-panel-head">
                <div>
                  <h2>Select packages</h2>
                  <p className="cp-panel-sub">Choose from your pre-defined packages or start from scratch.</p>
                </div>
                <label className="cp-pricing-toggle">
                  <span>Show pricing</span>
                  <input
                    type="checkbox"
                    checked={showPricing}
                    onChange={(e) => setShowPricing(e.target.checked)}
                  />
                  <span className="cp-toggle-track" aria-hidden="true">
                    <span className="cp-toggle-thumb" />
                  </span>
                </label>
              </div>

              <div className="cp-package-toolbar">
                <input
                  className="cp-input"
                  value={packageSearch}
                  onChange={(e) => setPackageSearch(e.target.value)}
                  placeholder="Search packages…"
                />
                <Link to="/packages" className="cp-btn cp-btn-ghost">
                  + Create Custom Package
                </Link>
              </div>

              {packageCategories.length > 0 && (
                <div className="cp-chip-row">
                  <button
                    type="button"
                    className={'cp-filter-chip' + (packageCategory === '' ? ' cp-filter-chip-active' : '')}
                    onClick={() => setPackageCategory('')}
                  >
                    All Packages
                  </button>
                  {packageCategories.map((cat) => (
                    <button
                      type="button"
                      key={cat}
                      className={'cp-filter-chip' + (packageCategory === cat ? ' cp-filter-chip-active' : '')}
                      onClick={() => setPackageCategory(cat)}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              )}

              <div className="cp-card-grid">
                {filteredPackages.map((pkg) => {
                  const added = selectedPackages.some((sp) => sp.packageId === pkg.id);
                  const items = pkg.items ?? [];
                  const shown = items.slice(0, 5);
                  const overflow = items.length - shown.length;
                  return (
                    <div className={'cp-package-card' + (added ? ' cp-card-added' : '')} key={pkg.id}>
                      <span className="cp-card-thumb cp-card-thumb-lg">{initials(pkg.name)}</span>
                      <p className="cp-card-name">{pkg.name}</p>
                      {pkg.description && <p className="cp-card-desc">{pkg.description}</p>}
                      {showPricing && <p className="cp-card-price">{money(pkg.price)}</p>}
                      {shown.length > 0 && (
                        <ul className="cp-feature-list">
                          {shown.map((pi) => (
                            <li key={pi.id}>
                              {pi.service.name}
                              {pi.quantity > 1 ? ` × ${pi.quantity}` : ''}
                            </li>
                          ))}
                          {overflow > 0 && <li className="cp-feature-more">+{overflow} more</li>}
                        </ul>
                      )}
                      <button
                        type="button"
                        className={'cp-card-btn' + (added ? ' cp-card-btn-added' : '')}
                        onClick={() => addPackage(pkg)}
                      >
                        {added ? '✓ Selected' : 'Select Package'}
                      </button>
                    </div>
                  );
                })}
                {filteredPackages.length === 0 && activePackages.length > 0 && (
                  <p className="cp-empty">No packages match your search.</p>
                )}
                {activePackages.length === 0 && (
                  <p className="cp-empty">
                    No packages yet — <Link to="/packages" className="cp-link">create one</Link>.
                  </p>
                )}
              </div>

              {selectedPackages.length > 0 && (
                <>
                  <h3 className="cp-subhead">Selected packages</h3>
                  {selectedPackages.map((sp) => {
                    const pkg = packages.find((p) => p.id === sp.packageId);
                    if (!pkg) return null;
                    return (
                      <div key={sp.key}>
                        <div className="cp-line">
                          <span className="cp-line-thumb">{initials(pkg.name)}</span>
                          <div className="cp-line-info">
                            <p className="cp-line-name">{pkg.name}</p>
                            {pkg.description && <p className="cp-line-desc">{pkg.description}</p>}
                          </div>
                          <EventSelect
                            value={sp.eventKey}
                            events={events}
                            onChange={(eventKey) => updatePackage(sp.key, { eventKey })}
                          />
                          <QtyStepper
                            value={sp.quantity}
                            onChange={(quantity) => updatePackage(sp.key, { quantity })}
                          />
                          <span className="cp-line-total">{money(packagePriceOf(sp))}</span>
                          <button
                            type="button"
                            className="cp-icon-btn cp-danger"
                            aria-label={`Remove ${pkg.name}`}
                            onClick={() => removePackage(sp.key)}
                          >
                            <TrashIcon />
                          </button>
                        </div>
                        {pkg.items?.length > 0 && (
                          <ul className="cp-included">
                            {pkg.items.map((pi) => (
                              <li key={pi.id}>
                                {pi.service.name}
                                {pi.quantity > 1 ? ` × ${pi.quantity}` : ''}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    );
                  })}
                </>
              )}

              <div className="cp-help-bar">
                <span>
                  <strong>Can’t find what you need?</strong> Create a custom package or combine services
                  in the next step.
                </span>
                <button type="button" className="cp-btn cp-btn-ghost" onClick={() => setStep(3)}>
                  Continue to Customize →
                </button>
              </div>
            </section>
          )}

          {/* ---------------- Step 4 — Customize ---------------- */}
          {step === 3 && (
            <section className="cp-step-body">
              <div className="cp-tabs" role="tablist">
                {([
                  ['services', 'Services'],
                  ['addons', `Add-ons${optionalItems.length ? ` (${optionalItems.length})` : ''}`],
                  ['notes', 'Notes'],
                ] as [TabKey, string][]).map(([key, label]) => (
                  <button
                    type="button"
                    role="tab"
                    key={key}
                    aria-selected={tab === key}
                    className={'cp-tab' + (tab === key ? ' cp-tab-active' : '')}
                    onClick={() => setTab(key)}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {tab === 'services' && (
                <>
                  <div className="cp-panel-head">
                    <div>
                      <h2>Individual services</h2>
                      <p className="cp-panel-sub">Add services on their own, alongside any packages selected.</p>
                    </div>
                  </div>

                  <div className="cp-chip-row">
                    {services.filter((s) => s.active).map((s) => (
                      <button
                        type="button"
                        key={s.id}
                        className="cp-chip"
                        onClick={() => addService(s, false)}
                      >
                        + {s.name}
                        <span className="cp-chip-price">
                          {s.flatPrice != null ? money(s.flatPrice) : '—'}
                        </span>
                      </button>
                    ))}
                    {services.filter((s) => s.active).length === 0 && (
                      <p className="cp-empty">
                        No services yet — <Link to="/services" className="cp-link">add one</Link>.
                      </p>
                    )}
                  </div>

                  {includedItems.length > 0 && includedItems.map(renderItemRow)}

                  <div className="cp-dashed-row">
                    <button type="button" className="cp-dashed-btn" onClick={() => setTab('addons')}>
                      + Add an optional add-on
                    </button>
                    <Link to="/services" className="cp-dashed-btn">
                      + Manage service catalog
                    </Link>
                  </div>
                </>
              )}

              {tab === 'addons' && (
                <>
                  <div className="cp-panel-head">
                    <div>
                      <h2>Add-ons</h2>
                      <p className="cp-panel-sub">
                        Optional extras — shown to the client but excluded from the total.
                      </p>
                    </div>
                  </div>

                  <div className="cp-chip-row">
                    {services.filter((s) => s.active).map((s) => (
                      <button
                        type="button"
                        key={s.id}
                        className="cp-chip"
                        onClick={() => addService(s, true)}
                      >
                        + {s.name}
                        <span className="cp-chip-price">
                          {s.flatPrice != null ? money(s.flatPrice) : '—'}
                        </span>
                      </button>
                    ))}
                  </div>

                  {optionalItems.length ? (
                    optionalItems.map(renderItemRow)
                  ) : (
                    <p className="cp-empty">No add-ons yet. Pick a service above to offer it as an extra.</p>
                  )}
                </>
              )}

              {tab === 'notes' && (
                <>
                  <div className="cp-panel-head">
                    <div>
                      <h2>Notes</h2>
                      <p className="cp-panel-sub">Anything worth remembering on this proposal.</p>
                    </div>
                  </div>
                  <textarea
                    className="cp-input cp-textarea"
                    rows={5}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Travel, special requests, agreed exceptions…"
                  />
                  <h3 className="cp-subhead">Terms &amp; conditions</h3>
                  <p className="cp-panel-sub">
                    Your active clauses print on every proposal.{' '}
                    <Link to="/terms" className="cp-link">Edit terms</Link>
                  </p>
                  {business?.terms?.length ? (
                    business.terms.map((term) => (
                      <p className="cp-terms" key={term.id}>
                        <strong>{term.title}</strong>
                        {'\n'}
                        {term.body}
                      </p>
                    ))
                  ) : (
                    <p className="cp-terms">
                      {business?.defaultTerms || 'No terms set yet.'}
                    </p>
                  )}
                </>
              )}
            </section>
          )}

          {/* ---------------- Step 5 — Review & Send ---------------- */}
          {step === 4 && (
            <section className="cp-step-body">
              <h2>Review &amp; send</h2>
              <p className="cp-panel-sub">
                Discount and tax are applied server-side — nothing here is trusted from the browser.
              </p>

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

              <div className="cp-row cp-row-spaced">
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

              <h3 className="cp-subhead">Template</h3>
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
          )}

         </div>

          <div className="cp-footer-nav">
            <button
              type="button"
              className="cp-btn cp-btn-ghost"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
            >
              Back
            </button>
            {step < STEPS.length - 1 ? (
              <button
                type="button"
                className="cp-btn cp-btn-primary"
                onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
              >
                Continue
              </button>
            ) : saved ? (
              <Link to={`/proposals/${saved.id}/preview`} className="cp-btn cp-btn-primary">
                Preview &amp; send
              </Link>
            ) : (
              <button type="submit" className="cp-btn cp-btn-primary" disabled={saving}>
                {saving ? 'Saving…' : isEditing ? 'Save changes' : 'Save Draft'}
              </button>
            )}
            {error && <span className="cp-error">{error}</span>}
          </div>
        </form>

        {/* ---------------- Live preview ---------------- */}
        <aside className="cp-aside">
          <div className="cp-aside-head">
            <span className="cp-aside-title"><DocIcon /> Proposal Preview</span>
            <div className="cp-devices" role="group" aria-label="Preview width">
              {([
                ['desktop', 'Desktop', <MonitorIcon key="d" />],
                ['tablet', 'Tablet', <TabletIcon key="t" />],
                ['mobile', 'Mobile', <PhoneIcon key="m" />],
              ] as const).map(([key, label, icon]) => (
                <button
                  type="button"
                  key={key}
                  className={'cp-device' + (device === key ? ' cp-device-active' : '')}
                  onClick={() => setDevice(key)}
                >
                  {icon}
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className={`cp-doc cp-doc-${device}`}>
            <div className="cp-doc-head">
              <div>
                <p className="cp-doc-studio">{business?.name || 'Your studio'}</p>
                <p className="cp-doc-tagline">Capturing stories, forever</p>
              </div>
              <p className="cp-doc-number">{saved?.proposalNumber ?? 'Draft'}</p>
            </div>

            <div className="cp-doc-hero">
              <p className="cp-doc-client">{customer?.name || 'Select a client'}</p>
              <p className="cp-doc-sub">
                {sortedEventDates.length
                  ? formatDateRange(
                      sortedEventDates[0],
                      sortedEventDates[sortedEventDates.length - 1],
                      (v) => new Date(v).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
                    )
                  : 'Dates to be confirmed'}
                {weddingLocation ? ` · ${weddingLocation}` : ''}
              </p>
            </div>

            {filledEvents.length > 0 && (
              <div className="cp-doc-section">
                <p className="cp-doc-label">Schedule</p>
                {[...filledEvents]
                  .sort((a, b) => a.date.localeCompare(b.date))
                  .map((e) => (
                    <div className="cp-doc-row" key={e.key}>
                      <span>{e.name}</span>
                      <span className="cp-doc-muted">
                        {new Date(e.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                  ))}
              </div>
            )}

            <div className="cp-doc-section">
              <p className="cp-doc-label">Your customized package</p>
              {selectedPackages.length + includedItems.length === 0 && (
                <p className="cp-doc-muted">Nothing added yet.</p>
              )}
              {selectedPackages.map((sp) => {
                const pkg = packages.find((p) => p.id === sp.packageId);
                if (!pkg) return null;
                return (
                  <div className="cp-doc-row" key={sp.key}>
                    <span>{pkg.name}{sp.quantity > 1 ? ` × ${sp.quantity}` : ''}</span>
                    <span>{money(packagePriceOf(sp))}</span>
                  </div>
                );
              })}
              {includedItems.map((item) => {
                const service = services.find((s) => s.id === item.serviceId);
                if (!service) return null;
                return (
                  <div className="cp-doc-row" key={item.key}>
                    <span>{service.name}{item.quantity > 1 ? ` × ${item.quantity}` : ''}</span>
                    <span>{money(priceOf(item))}</span>
                  </div>
                );
              })}
            </div>

            {optionalItems.length > 0 && (
              <div className="cp-doc-section">
                <p className="cp-doc-label">Optional add-ons</p>
                {optionalItems.map((item) => {
                  const service = services.find((s) => s.id === item.serviceId);
                  if (!service) return null;
                  return (
                    <div className="cp-doc-row" key={item.key}>
                      <span className="cp-doc-muted">{service.name}</span>
                      <span className="cp-doc-muted">{money(priceOf(item))}</span>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="cp-doc-totals">
              <div className="cp-doc-row"><span>Subtotal</span><span>{money(preview.subtotal)}</span></div>
              {preview.discountAmount > 0 && (
                <div className="cp-doc-row"><span>Discount</span><span>−{money(preview.discountAmount)}</span></div>
              )}
              {preview.taxAmount > 0 && (
                <div className="cp-doc-row"><span>Tax ({taxRate}%)</span><span>+{money(preview.taxAmount)}</span></div>
              )}
              <div className="cp-doc-row cp-doc-total">
                <span>Total</span>
                <span>{money(saved?.total ?? preview.total)}</span>
              </div>
              {!saved && (
                <p className="cp-doc-note">Estimated — the server recalculates on save.</p>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
