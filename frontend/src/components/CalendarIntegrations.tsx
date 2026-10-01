import { useState, type Dispatch, type SetStateAction } from 'react';
import { apiDelete, apiPost } from '../api/client';
import type { Business } from '../types/business';
import GoogleIcon from './GoogleIcon';
import { AppleIcon, SyncIcon } from './icons';
import '../pages/Calendar.css';

function dates(n: number): string {
  return `${n} date${n === 1 ? '' : 's'}`;
}

export default function CalendarIntegrations({
  business,
  setBusiness,
  onError,
  onNote,
}: {
  business: Business | null;
  setBusiness: Dispatch<SetStateAction<Business | null>>;
  onError: (message: string) => void;
  onNote: (message: string) => void;
}) {
  const [syncing, setSyncing] = useState(false);
  const [appleForm, setAppleForm] = useState<{ appleId: string; appPassword: string } | null>(null);
  const [appleBusy, setAppleBusy] = useState(false);

  const connected = Boolean(business?.googleCalendarId);
  const appleConnected = Boolean(business?.appleConnected);
  const appleSaved = Boolean(business?.appleCredentialSaved);

  // Connect and sync are the same idempotent call — it reuses an existing
  // calendar, re-shares it, and re-pushes every open/booked date.
  function syncGoogle() {
    const wasConnected = connected;
    setSyncing(true);
    onError('');
    onNote('');
    apiPost<{ calendarId: string; sharedWith: string; syncedEvents: number }>('/api/business/google-calendar')
      .then((r) => {
        setBusiness((b) => (b ? { ...b, googleCalendarId: r.calendarId } : b));
        onNote(
          wasConnected
            ? `${dates(r.syncedEvents)} synced to Google Calendar.`
            : `Connected — shared with ${r.sharedWith}. Open Google Calendar and accept the invite. ${dates(r.syncedEvents)} synced.`,
        );
      })
      .catch((err) => onError(err instanceof Error ? err.message : 'Failed to sync'))
      .finally(() => setSyncing(false));
  }

  function connectApple(credentials?: { appleId: string; appPassword: string }) {
    setAppleBusy(true);
    onError('');
    onNote('');
    apiPost<{ appleId: string; syncedEvents: number }>('/api/business/apple-calendar', credentials ?? {})
      .then((r) => {
        setBusiness((b) => (b ? { ...b, appleId: r.appleId, appleConnected: true, appleCredentialSaved: true } : b));
        setAppleForm(null);
        onNote(`Apple Calendar connected — ${dates(r.syncedEvents)} pushed to ${r.appleId}.`);
      })
      .catch((err) => onError(err instanceof Error ? err.message : 'Failed to connect'))
      .finally(() => setAppleBusy(false));
  }

  function syncApple() {
    setAppleBusy(true);
    onError('');
    onNote('');
    apiPost<{ syncedEvents: number }>('/api/business/apple-calendar/sync')
      .then((r) => onNote(`${dates(r.syncedEvents)} synced to Apple Calendar.`))
      .catch((err) => onError(err instanceof Error ? err.message : 'Failed to sync'))
      .finally(() => setAppleBusy(false));
  }

  function disconnectApple() {
    setAppleBusy(true);
    onError('');
    apiDelete<{ disconnected: boolean }>('/api/business/apple-calendar')
      .then(() => {
        setBusiness((b) => (b ? { ...b, appleConnected: false } : b));
        onNote('Apple Calendar disconnected — your password stays saved, so Reconnect is one click.');
      })
      .catch((err) => onError(err instanceof Error ? err.message : 'Failed to disconnect'))
      .finally(() => setAppleBusy(false));
  }

  return (
    <div className="cal-side-card">
      <div className="cal-side-head">
        <span>Integrate Calendar</span>
      </div>
      <p className="cal-integrate-note">Sync your shoots and never miss a booking.</p>

      <div className="cal-google">
        <GoogleIcon size={16} />
        <span className="cal-google-label">Google</span>
        <span className={'cal-google-status' + (connected ? ' cal-google-status-active' : '')}>
          {connected ? 'Active' : 'Not connected'}
        </span>
        {!connected && (
          <button type="button" className="cal-connect-btn" onClick={syncGoogle} disabled={syncing || business === null}>
            {syncing ? 'Connecting…' : 'Connect'}
          </button>
        )}
        <button
          type="button"
          className={'cal-sync-icon' + (syncing ? ' cal-sync-icon-busy' : '')}
          onClick={syncGoogle}
          disabled={!connected || syncing}
          title={connected ? 'Sync now' : 'Connect Google Calendar to enable sync'}
          aria-label={connected ? 'Sync now' : 'Connect Google Calendar to enable sync'}
        >
          <SyncIcon />
        </button>
      </div>

      <div className="cal-google">
        <AppleIcon />
        <span className="cal-google-label">Apple</span>
        <span className={'cal-google-status' + (appleConnected ? ' cal-google-status-active' : '')}>
          {appleConnected ? 'Active' : 'Not connected'}
        </span>
        {appleConnected ? (
          <button type="button" className="cal-connect-btn" onClick={disconnectApple} disabled={appleBusy}>
            Disconnect
          </button>
        ) : appleSaved ? (
          <button type="button" className="cal-connect-btn" onClick={() => connectApple()} disabled={appleBusy}>
            {appleBusy ? 'Reconnecting…' : 'Reconnect'}
          </button>
        ) : (
          <button
            type="button"
            className="cal-connect-btn"
            onClick={() => setAppleForm((f) => (f ? null : { appleId: business?.appleId ?? '', appPassword: '' }))}
            disabled={appleBusy || business === null}
          >
            {appleForm ? 'Cancel' : 'Connect'}
          </button>
        )}
        <button
          type="button"
          className={'cal-sync-icon' + (appleBusy ? ' cal-sync-icon-busy' : '')}
          onClick={syncApple}
          disabled={!appleConnected || appleBusy}
          title={appleConnected ? 'Sync now' : 'Connect Apple Calendar to enable sync'}
          aria-label={appleConnected ? 'Sync now' : 'Connect Apple Calendar to enable sync'}
        >
          <SyncIcon />
        </button>
      </div>

      {appleForm && (
        <form
          className="cal-feed-panel"
          onSubmit={(e) => {
            e.preventDefault();
            connectApple(appleForm);
          }}
        >
          <p className="cal-feed-help">
            <b>Step 1.</b> Apple has no one-click authorisation, so this needs an{' '}
            <b>app-specific password</b>. Open your Apple account, go to{' '}
            <b>Sign-In and Security → App-Specific Passwords</b>, and create one.
          </p>
          <a className="cal-feed-subscribe" href="https://account.apple.com/account/manage" target="_blank" rel="noopener noreferrer">
            Generate password at Apple ↗
          </a>
          <p className="cal-feed-help">
            <b>Step 2.</b> Paste it here. It is stored encrypted, never shown again, and you can
            revoke it from that same Apple page at any time.
          </p>
          <div className="cal-feed-url-row">
            <input
              className="cal-input"
              type="email"
              required
              placeholder="Apple ID email"
              value={appleForm.appleId}
              onChange={(e) => setAppleForm({ ...appleForm, appleId: e.target.value })}
            />
            <input
              className="cal-input"
              type="password"
              required
              placeholder="xxxx-xxxx-xxxx-xxxx"
              value={appleForm.appPassword}
              onChange={(e) => setAppleForm({ ...appleForm, appPassword: e.target.value })}
            />
            <button type="submit" className="cal-btn cal-btn-primary" disabled={appleBusy}>
              {appleBusy ? 'Connecting…' : 'Connect'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
