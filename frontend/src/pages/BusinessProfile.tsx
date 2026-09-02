import { useEffect, useState } from 'react';
import { apiGet, apiPut } from '../api/client';
import type { Business } from '../types/business';
import './BusinessProfile.css';

function UploadIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 16V4m0 0-4 4m4-4 4 4" stroke="#e2661a" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" stroke="#8b8590" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function getInitials(name: string): string {
  return (
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join('') || 'WT'
  );
}

export default function BusinessProfile() {
  const [business, setBusiness] = useState<Business | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState('');

  useEffect(() => {
    apiGet<Business>('/api/business').then(setBusiness);
  }, []);

  function updateField<K extends keyof Business>(key: K, value: Business[K]) {
    setBusiness((prev) => (prev ? { ...prev, [key]: value } : prev));
    setStatus('');
  }

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => updateField('logo', reader.result as string);
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!business) return;
    setIsSaving(true);
    setStatus('');
    try {
      const updated = await apiPut<Business>('/api/business', {
        name: business.name,
        logo: business.logo ?? undefined,
        phone: business.phone ?? undefined,
        email: business.email ?? undefined,
        address: business.address ?? undefined,
        website: business.website ?? undefined,
        defaultValidityDays: business.defaultValidityDays ?? undefined,
        defaultTerms: business.defaultTerms ?? undefined,
      });
      setBusiness(updated);
      setStatus('Saved');
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  }

  if (!business) return <p>Loading...</p>;

  const today = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="bp-container">
      <div className="bp-page-header">
        <h1 className="bp-title">Business Profile</h1>
        <p className="bp-subtitle">
          This information appears on every proposal you send to customers.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bp-form">
        <div className="bp-col-main">
          <section className="bp-section">
            <h2>Identity</h2>
            <p className="bp-section-sub">Your studio name and logo.</p>

            <div className="bp-identity-row">
              <label className="bp-logo-upload">
                {business.logo ? (
                  <img src={business.logo} alt="Business logo" />
                ) : (
                  <>
                    <UploadIcon />
                    <span className="bp-upload-label">Upload</span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  style={{ display: 'none' }}
                />
              </label>

              <div className="bp-field">
                <label className="bp-label" htmlFor="bp-name">
                  Studio name
                </label>
                <input
                  id="bp-name"
                  className="bp-input"
                  value={business.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  placeholder="e.g. Wedding Tapes Studio"
                />
                <p className="bp-hint">
                  Square image, at least 200×200px, works best.
                </p>
              </div>
            </div>
          </section>

          <section className="bp-section">
            <h2>Contact</h2>
            <p className="bp-section-sub">How customers can reach you.</p>

            <div className="bp-grid-2">
              <div>
                <label className="bp-label" htmlFor="bp-phone">
                  Phone
                </label>
                <input
                  id="bp-phone"
                  className="bp-input"
                  value={business.phone ?? ''}
                  onChange={(e) => updateField('phone', e.target.value)}
                  placeholder="+91 98765 43210"
                />
              </div>
              <div>
                <label className="bp-label" htmlFor="bp-email">
                  Email
                </label>
                <input
                  id="bp-email"
                  className="bp-input"
                  value={business.email ?? ''}
                  onChange={(e) => updateField('email', e.target.value)}
                  placeholder="hello@studio.com"
                />
              </div>
              <div>
                <label className="bp-label" htmlFor="bp-website">
                  Website
                </label>
                <input
                  id="bp-website"
                  className="bp-input"
                  value={business.website ?? ''}
                  onChange={(e) => updateField('website', e.target.value)}
                  placeholder="www.studio.com"
                />
              </div>
              <div>
                <label className="bp-label" htmlFor="bp-address">
                  Address
                </label>
                <input
                  id="bp-address"
                  className="bp-input"
                  value={business.address ?? ''}
                  onChange={(e) => updateField('address', e.target.value)}
                  placeholder="Studio address"
                />
              </div>
            </div>
          </section>

          <section className="bp-section">
            <h2>Proposal defaults</h2>
            <p className="bp-section-sub">
              Applied to every new proposal; editable per proposal.
            </p>

            <div className="bp-defaults-col">
              <div className="bp-validity-field">
                <label className="bp-label" htmlFor="bp-validity">
                  Default validity (days)
                </label>
                <input
                  id="bp-validity"
                  type="number"
                  className="bp-input"
                  value={business.defaultValidityDays ?? ''}
                  onChange={(e) =>
                    updateField(
                      'defaultValidityDays',
                      e.target.value ? Number(e.target.value) : null,
                    )
                  }
                  placeholder="14"
                />
              </div>
              <div>
                <label className="bp-label" htmlFor="bp-terms">
                  Default terms &amp; conditions
                </label>
                <textarea
                  id="bp-terms"
                  className="bp-textarea"
                  rows={5}
                  value={business.defaultTerms ?? ''}
                  onChange={(e) => updateField('defaultTerms', e.target.value)}
                  placeholder="Payment terms, cancellation policy, delivery timeline…"
                />
              </div>
            </div>
          </section>

          <div className="bp-actions">
            <button type="submit" className="bp-save-btn" disabled={isSaving}>
              {isSaving && <span className="bp-spinner" />}
              {isSaving ? 'Saving…' : 'Save changes'}
            </button>
            {status && (
              <span className={'bp-status' + (status === 'Saved' ? '' : ' error')}>
                {status}
              </span>
            )}
          </div>
        </div>

        <aside className="bp-preview-aside">
          <p className="bp-preview-label">Proposal header preview</p>

          <div className="bp-preview-card">
            <div className="bp-preview-head">
              {business.logo ? (
                <img className="bp-preview-logo" src={business.logo} alt="" />
              ) : (
                <span className="bp-preview-avatar">
                  {getInitials(business.name)}
                </span>
              )}
              <div className="bp-preview-identity">
                <p className="bp-preview-name">
                  {business.name || 'Your studio name'}
                </p>
                <p className="bp-preview-date">Proposal · {today}</p>
              </div>
            </div>

            <div className="bp-preview-contact">
              {business.phone && <p>{business.phone}</p>}
              {business.email && <p>{business.email}</p>}
              {business.website && <p>{business.website}</p>}
              {business.address && <p>{business.address}</p>}
            </div>

            {business.defaultValidityDays != null && (
              <div className="bp-preview-validity">
                <p>Valid for {business.defaultValidityDays} days from issue</p>
              </div>
            )}
          </div>
        </aside>
      </form>
    </div>
  );
}
