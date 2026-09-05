import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiGet, apiPut } from '../api/client';
import { PhoneInput } from '../components/PhoneInput';
import type { Profile } from '../types/user';
import './BusinessProfile.css';

function getInitials(profile: Profile): string {
  const letters = [profile.firstName, profile.lastName]
    .filter(Boolean)
    .map((n) => n![0].toUpperCase())
    .join('');
  return letters || profile.email[0].toUpperCase();
}

export default function Profile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState('');

  useEffect(() => {
    apiGet<Profile>('/api/auth/me').then(setProfile);
  }, []);

  function updateField(key: 'firstName' | 'lastName' | 'phone', value: string) {
    setProfile((prev) => (prev ? { ...prev, [key]: value } : prev));
    setStatus('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setIsSaving(true);
    setStatus('');
    try {
      const updated = await apiPut<Profile>('/api/auth/me', {
        firstName: profile.firstName ?? undefined,
        lastName: profile.lastName ?? undefined,
        phone: profile.phone ?? undefined,
      });
      setProfile(updated);
      setStatus('Saved');
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  }

  if (!profile) return <p>Loading...</p>;

  const joined = new Date(profile.createdAt).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="bp-container">
      <Link to="/setup" className="bp-back-link">← Back to setup</Link>
      <div className="bp-page-header">
        <h1 className="bp-title">Personal Profile</h1>
        <p className="bp-subtitle">
          Your own account details — separate from the studio details customers see.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bp-form" autoComplete="off">
        <div className="bp-col-main">
          <section className="bp-section">
            <h2>Your name</h2>
            <p className="bp-section-sub">Used to greet you inside the app.</p>

            <div className="bp-grid-2">
              <div>
                <label className="bp-label" htmlFor="pf-first">First name</label>
                <input
                  id="pf-first"
                  className="bp-input"
                  value={profile.firstName ?? ''}
                  onChange={(e) => updateField('firstName', e.target.value)}
                  placeholder="e.g. Priya"
                  autoComplete="off"
                />
              </div>
              <div>
                <label className="bp-label" htmlFor="pf-last">Last name</label>
                <input
                  id="pf-last"
                  className="bp-input"
                  value={profile.lastName ?? ''}
                  onChange={(e) => updateField('lastName', e.target.value)}
                  placeholder="e.g. Sharma"
                  autoComplete="off"
                />
              </div>
            </div>
          </section>

          <section className="bp-section">
            <h2>Contact</h2>
            <p className="bp-section-sub">The email you log in with, and your own phone number.</p>

            <div className="bp-grid-2">
              <div>
                <label className="bp-label" htmlFor="pf-email">Email</label>
                <input id="pf-email" className="bp-input" value={profile.email} disabled />
                <p className="bp-hint">
                  Changing your sign-in email isn't supported yet — contact support if you need it moved.
                </p>
              </div>
              <div>
                <label className="bp-label" htmlFor="pf-phone">Phone</label>
                <PhoneInput
                  id="pf-phone"
                  value={profile.phone ?? ''}
                  onChange={(v) => updateField('phone', v)}
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
              <span className={'bp-status' + (status === 'Saved' ? '' : ' error')}>{status}</span>
            )}
          </div>
        </div>

        <aside className="bp-preview-aside">
          <p className="bp-preview-label">Account</p>

          <div className="bp-preview-card">
            <div className="bp-preview-head">
              <span className="bp-preview-avatar">{getInitials(profile)}</span>
              <div className="bp-preview-identity">
                <p className="bp-preview-name">
                  {[profile.firstName, profile.lastName].filter(Boolean).join(' ') || 'Your name'}
                </p>
                <p className="bp-preview-date">Member since {joined}</p>
              </div>
            </div>

            <div className="bp-preview-contact">
              <p>{profile.email}</p>
              {profile.phone && <p>{profile.phone}</p>}
            </div>
          </div>
        </aside>
      </form>
    </div>
  );
}
