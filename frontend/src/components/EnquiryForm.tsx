import { useState } from 'react';
import type { Service } from '../types/catalog';
import type { Enquiry } from '../types/enquiry';
import '../pages/Enquiries.css';

const SOURCE_OPTIONS = ['Meta Ad', 'Google', 'Instagram', 'Direct', 'Referral', 'Other'] as const;

export default function EnquiryForm({
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
