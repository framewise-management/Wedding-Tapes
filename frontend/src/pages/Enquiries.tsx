import { useEffect, useState } from 'react';
import { apiDelete, apiGet, apiPost, apiPut } from '../api/client';
import type { Service } from '../types/catalog';
import type { Customer } from '../types/customer';
import './Enquiries.css';

const STATUS_OPTIONS = ['NEW', 'CONTACTED', 'CONVERTED', 'CANCELLED'] as const;
const SOURCE_OPTIONS = ['Meta Ad', 'Google', 'Instagram', 'Direct', 'Referral', 'Other'] as const;

type Enquiry = {
  id: string;
  clientName: string;
  brideName?: string;
  groomName?: string;
  phone?: string;
  email?: string;
  eventDate?: string;
  eventType?: string;
  eventDuration?: number;
  location?: string;
  services: string[];
  budget?: string;
  message?: string;
  source?: string;
  status: 'NEW' | 'CONTACTED' | 'CONVERTED' | 'CANCELLED';
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
  businessId: string;
};

function formatDate(dateString?: string): string {
  if (!dateString) return 'Not specified';
  return new Date(dateString).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function money(value?: number): string {
  if (!value) return 'Not specified';
  return `₹${value.toLocaleString('en-IN')}`;
}

function calculateServiceTotal(services: string[], allServices: Service[]): number {
  return services.reduce((total, serviceId) => {
    const service = allServices.find((s) => s.id === serviceId);
    return total + (service?.flatPrice || 0);
  }, 0);
}

export default function Enquiries() {
  const [enquiries, setEnquiries] = useState<Enquiry[] | null>(null);
  const [allServices, setAllServices] = useState<Service[] | null>(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = () => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (statusFilter) params.set('status', statusFilter);
    const query = params.toString();
    apiGet<Enquiry[]>(`/api/enquiries${query ? `?${query}` : ''}`)
      .then(setEnquiries)
      .catch(() => setError('Failed to load enquiries'));
  };

  const loadServices = () => {
    apiGet<Service[]>('/api/services?active=true')
      .then(setAllServices)
      .catch(() => {});
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 300);
    return () => clearTimeout(timer);
  }, [search, statusFilter]);

  useEffect(() => {
    loadServices();
  }, []);

  async function createEnquiry(enquiryData: Partial<Enquiry>) {
    setError('');
    setIsSubmitting(true);
    try {
      const newEnquiry = await apiPost<Enquiry>('/api/enquiries', enquiryData);
      setEnquiries((prev) => (prev ? [newEnquiry, ...prev] : [newEnquiry]));
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create enquiry');
    } finally {
      setIsSubmitting(false);
    }
  };

  async function updateEnquiryStatus(enquiryId: string, status: Enquiry['status']) {
    try {
      await apiPut<Enquiry>(`/api/enquiries/${enquiryId}`, { status });
      setEnquiries((prev) =>
        prev?.map((e) => (e.id === enquiryId ? { ...e, status } : e)) || null
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    }
  };

  async function deleteEnquiry(enquiry: Enquiry) {
    if (!confirm(`Delete enquiry from ${enquiry.clientName}? This can't be undone.`)) return;
    try {
      await apiDelete(`/api/enquiries/${enquiry.id}`);
      setEnquiries((prev) => prev?.filter((e) => e.id !== enquiry.id) || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete enquiry');
    }
  };

  async function convertToProposal(enquiry: Enquiry) {
    if (!confirm(`Convert this enquiry to a proposal? A proposal will be created for ${enquiry.clientName}.`)) return;
    try {
      const customer = {
        name: enquiry.clientName,
        phone: enquiry.phone,
        email: enquiry.email,
      };
      const customerResponse = await apiPost<Customer>('/api/customers', customer);
      const customerId = customerResponse.id;

      const proposalData = {
        customerId,
        services: enquiry.services || [],
        packages: [],
        eventDate: enquiry.eventDate || null,
        eventType: enquiry.eventType || null,
        eventDuration: enquiry.eventDuration || null,
        location: enquiry.location || null,
        budget: enquiry.budget || null,
        message: enquiry.message || null,
        notes: `Converted from enquiry - ${enquiry.source ? `Source: ${enquiry.source}` : ''}`,
      };
      const proposal = await apiPost<{ id: string }>('/api/proposals', proposalData);
      await updateEnquiryStatus(enquiry.id, 'CONVERTED');
      alert(`Proposal ${proposal.id} created successfully!`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to convert enquiry to proposal');
    }
  };

  return (
    <div className="enquiries-page">
      <div className="enq-page-header">
        <div>
          <h1 className="enq-title">Enquiries</h1>
          <p className="enq-subtitle">Capture and manage client enquiries for your wedding photography services</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="enq-add-btn"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          New Enquiry
        </button>
      </div>

      {error && <div className="enq-error-banner">{error}</div>}

      {showForm && (
        <div className="enq-form-container">
          <div className="enq-form-header">
            <h2>New Enquiry</h2>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="enq-close-btn"
            >
              ×
            </button>
          </div>

          <EnquiryForm
            onSubmit={createEnquiry}
            onCancel={() => setShowForm(false)}
            isSubmitting={isSubmitting}
            services={allServices || []}
          />
        </div>
      )}

      <div className="enq-filters">
        <input
          className="enq-search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by client name, phone, or location..."
        />
        <select
          className="enq-status-filter"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>{status}</option>
          ))}
        </select>
      </div>

      <div className="enq-table">
        <div className="enq-table-head">
          <span>Client</span>
          <span>Event Details</span>
          <span>Services</span>
          <span>Budget & Location</span>
          <span>Status</span>
          <span>Date Added</span>
          <span>Actions</span>
        </div>

        {enquiries === null ? (
          <div className="enq-empty">Loading...</div>
        ) : enquiries.length === 0 ? (
          <div className="enq-empty">
            {search || statusFilter ? 'No enquiries match your filters.' : 'No enquiries yet. Start by adding one above.'}
          </div>
        ) : (
          enquiries.map((enquiry) => (
            <div className="enq-table-row" key={enquiry.id}>
              <div className="enq-cell-client">
                <div className="enq-client-name">{enquiry.clientName}</div>
                {(enquiry.brideName || enquiry.groomName) && (
                  <div className="enq-client-couple">
                    {enquiry.brideName && `Bride: ${enquiry.brideName}`}
                    {enquiry.brideName && enquiry.groomName && ' • '}
                    {enquiry.groomName && `Groom: ${enquiry.groomName}`}
                  </div>
                )}
                {enquiry.email && (
                  <div className="enq-client-email">{enquiry.email}</div>
                )}
                {enquiry.phone && (
                  <div className="enq-client-phone">{enquiry.phone}</div>
                )}
              </div>

              <div className="enq-cell-event">
                {enquiry.eventDate ? (
                  <div>{formatDate(enquiry.eventDate)}</div>
                ) : null}
                {enquiry.eventType && (
                  <div className="enq-event-type">{enquiry.eventType}</div>
                )}
                {enquiry.eventDuration && (
                  <div className="enq-event-duration">
                    {enquiry.eventDuration} day{enquiry.eventDuration !== 1 ? 's' : ''}
                  </div>
                )}
              </div>

              <div className="enq-cell-services">
                {enquiry.services && enquiry.services.length > 0 ? (
                  <div>
                    {enquiry.services.map((serviceId) => {
                      const service = allServices?.find((s) => s.id === serviceId);
                      return service ? (
                        <span key={serviceId} className="enq-service-tag">
                          {service.name}
                        </span>
                      ) : null;
                    })}
                    {allServices && (
                      <div className="enq-service-total">
                        Total: {money(calculateServiceTotal(enquiry.services, allServices || []))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="enq-no-services">None selected</div>
                )}
              </div>

              <div className="enq-cell-location">
                {enquiry.location && (
                  <div>{enquiry.location}</div>
                )}
                {enquiry.budget && (
                  <div className="enq-budget">Budget: {enquiry.budget}</div>
                )}
              </div>

              <div className="enq-cell-status">
                <select
                  value={enquiry.status}
                  onChange={(e) => updateEnquiryStatus(enquiry.id, e.target.value as Enquiry['status'])}
                  className={`enq-status-badge enq-status-${enquiry.status.toLowerCase()}`}
                >
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>

              <div className="enq-cell-date">{formatDate(enquiry.createdAt)}</div>

              <div className="enq-cell-actions">
                <div className="enq-action-buttons">
                  <button
                    type="button"
                    onClick={() => convertToProposal(enquiry)}
                    className="enq-action-btn enq-convert-btn"
                    title="Convert to proposal"
                  >
                    Convert to Proposal
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteEnquiry(enquiry)}
                    className="enq-action-btn enq-delete-btn"
                    title="Delete"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function EnquiryForm({
  onSubmit,
  onCancel,
  isSubmitting,
  services,
}: {
  onSubmit: (data: Partial<Enquiry>) => void;
  onCancel: () => void;
  isSubmitting: boolean;
  services: Service[];
}) {
  const [clientName, setClientName] = useState('');
  const [brideName, setBrideName] = useState('');
  const [groomName, setGroomName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventType, setEventType] = useState('');
  const [eventDuration, setEventDuration] = useState('');
  const [location, setLocation] = useState('');
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [budget, setBudget] = useState('');
  const [message, setMessage] = useState('');
  const [source, setSource] = useState('Meta Ad');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const formData: Partial<Enquiry> = {
      clientName,
      brideName: brideName || undefined,
      groomName: groomName || undefined,
      phone: phone || undefined,
      email: email || undefined,
      eventDate: eventDate || undefined,
      eventType: eventType || undefined,
      eventDuration: eventDuration ? parseInt(eventDuration) : undefined,
      location,
      services: selectedServices,
      budget: budget || undefined,
      message: message || undefined,
      source,
    };
    await onSubmit(formData);
  }

  return (
    <form onSubmit={handleSubmit} className="enq-form">
      <div className="enq-form-grid">
        <div className="enq-form-section">
          <h3>Client Information</h3>
          <div className="enq-form-field">
            <label htmlFor="clientName">Full Name *</label>
            <input
              id="clientName"
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              required
              placeholder="e.g., John Doe"
            />
          </div>
          <div className="enq-form-field">
            <label htmlFor="brideName">Bride's Name</label>
            <input
              id="brideName"
              type="text"
              value={brideName}
              onChange={(e) => setBrideName(e.target.value)}
              placeholder="e.g., Jane Smith"
            />
          </div>
          <div className="enq-form-field">
            <label htmlFor="groomName">Groom's Name</label>
            <input
              id="groomName"
              type="text"
              value={groomName}
              onChange={(e) => setGroomName(e.target.value)}
              placeholder="e.g., Michael Johnson"
            />
          </div>
          <div className="enq-form-field">
            <label htmlFor="phone">Phone Number</label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g., +91 98765 43210"
            />
          </div>
          <div className="enq-form-field">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g., client@example.com"
            />
          </div>
        </div>

        <div className="enq-form-section">
          <h3>Event Details</h3>
          <div className="enq-form-field">
            <label htmlFor="eventDate">Event Date</label>
            <input
              id="eventDate"
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
            />
          </div>
          <div className="enq-form-field">
            <label htmlFor="eventType">Event Type</label>
            <input
              id="eventType"
              type="text"
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
              placeholder="e.g., Wedding, Engagement, Reception"
            />
          </div>
          <div className="enq-form-field">
            <label htmlFor="eventDuration">Duration (days)</label>
            <input
              id="eventDuration"
              type="number"
              value={eventDuration}
              onChange={(e) => setEventDuration(e.target.value)}
              min="1"
              placeholder="e.g., 2"
            />
          </div>
          <div className="enq-form-field">
            <label htmlFor="location">Location *</label>
            <input
              id="location"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              required
              placeholder="e.g., Mumbai, Maharashtra"
            />
          </div>
        </div>

        <div className="enq-form-section">
          <h3>Services & Budget</h3>
          <div className="enq-form-field">
            <label htmlFor="services">Photography Services</label>
            <div className="enq-services-grid">
              {services.map((service) => (
                <label key={service.id} className="enq-service-option">
                  <input
                    type="checkbox"
                    value={service.id}
                    checked={selectedServices.includes(service.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedServices((prev) => [...prev, service.id]);
                      } else {
                        setSelectedServices((prev) => prev.filter((id) => id !== service.id));
                      }
                    }}
                  />
                  <span className="enq-service-name">{service.name}</span>
                  <span className="enq-service-price">{service.flatPrice != null ? `₹${service.flatPrice}` : ""}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="enq-form-field">
            <label htmlFor="budget">Budget Range</label>
            <input
              id="budget"
              type="text"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="e.g., ₹50,000 - ₹1,00,000"
            />
          </div>
          <div className="enq-form-field">
            <label htmlFor="message">Special Requests/Message</label>
            <textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Any specific requirements or notes..."
              rows={3}
            />
          </div>
          <div className="enq-form-field">
            <label htmlFor="source">How did you hear about us</label>
            <select
              id="source"
              value={source}
              onChange={(e) => setSource(e.target.value)}
            >
              {SOURCE_OPTIONS.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="enq-form-actions">
        <button
          type="button"
          onClick={onCancel}
          className="enq-cancel-btn"
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="enq-submit-btn"
          disabled={isSubmitting || !clientName || !location}
        >
          {isSubmitting ? 'Saving...' : 'Save Enquiry'}
        </button>
      </div>
    </form>
  );
}
