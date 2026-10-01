import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiDelete, apiGet, apiPost, apiPut } from '../api/client';
import type { Service } from '../types/catalog';
import type { Enquiry } from '../types/enquiry';
import EnquiryForm from '../components/EnquiryForm';
import { formatDate, money } from '../lib/format';
import './Enquiries.css';

const STATUS_OPTIONS = ['NEW', 'CONTACTED', 'CONVERTED', 'CANCELLED'] as const;
const NOT_SPECIFIED = 'Not specified';

function dateOrUnspecified(value?: string): string {
  return value ? formatDate(value) : NOT_SPECIFIED;
}

function moneyOrUnspecified(value?: number): string {
  return value ? money(value) : NOT_SPECIFIED;
}

function calculateServiceTotal(services: string[], allServices: Service[]): number {
  return services.reduce((total, serviceId) => {
    const service = allServices.find((s) => s.id === serviceId);
    return total + (service?.flatPrice || 0);
  }, 0);
}

export default function Enquiries() {
  const navigate = useNavigate();
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
    setError('');
    try {
      const proposal = await apiPost<{ id: string }>(`/api/enquiries/${enquiry.id}/convert`, {});
      navigate(`/proposals/${proposal.id}/edit`);
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
                  <div>{dateOrUnspecified(enquiry.eventDate)}</div>
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
                        Total: {moneyOrUnspecified(calculateServiceTotal(enquiry.services, allServices || []))}
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
