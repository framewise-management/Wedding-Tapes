import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiDelete, apiGet, apiPost } from '../api/client';
import GoogleIcon from '../components/GoogleIcon';
import type { Business } from '../types/business';
import type { Proposal } from '../types/proposal';
import './Calendar.css';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Only SENT (open inquiry) and ACCEPTED (booked) hold a calendar date — DRAFT
// hasn't gone to the customer yet, REJECTED frees the date back up.
const CALENDAR_STATUSES = ['SENT', 'ACCEPTED'] as const;

function money(value: number): string {
  return `₹${value.toLocaleString('en-IN')}`;
}

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function SyncIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true">
      <path
        d="M20 11a8 8 0 0 0-14.7-4.4M4 13a8 8 0 0 0 14.7 4.4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M20 4v4h-4M4 20v-4h4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path
        fill="#1a1a20"
        d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"
      />
    </svg>
  );
}

function dates(n: number): string {
  return `${n} date${n === 1 ? '' : 's'}`;
}

export default function Calendar() {
  const [proposals, setProposals] = useState<Proposal[] | null>(null);
  const [error, setError] = useState('');
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [googleStatus, setGoogleStatus] = useState('');
  const [appleForm, setAppleForm] = useState<{ appleId: string; appPassword: string } | null>(null);
  const [appleBusy, setAppleBusy] = useState(false);

  const connected = Boolean(business?.googleCalendarId);
  const appleConnected = Boolean(business?.appleConnected);
  const appleSaved = Boolean(business?.appleCredentialSaved);

  // An empty body tells the server to reuse the saved password, so reconnecting
  // after a disconnect never asks for credentials again.
  function connectApple(credentials?: { appleId: string; appPassword: string }) {
    setAppleBusy(true);
    setError('');
    setGoogleStatus('');
    apiPost<{ appleId: string; syncedEvents: number }>(
      '/api/business/apple-calendar',
      credentials ?? {},
    )
      .then((r) => {
        setBusiness((b) =>
          b ? { ...b, appleId: r.appleId, appleConnected: true, appleCredentialSaved: true } : b,
        );
        setAppleForm(null);
        setGoogleStatus(
          `Apple Calendar connected — ${dates(r.syncedEvents)} pushed to ${r.appleId}.`,
        );
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to connect'))
      .finally(() => setAppleBusy(false));
  }

  function syncApple() {
    setAppleBusy(true);
    setError('');
    setGoogleStatus('');
    apiPost<{ syncedEvents: number }>('/api/business/apple-calendar/sync')
      .then((r) => setGoogleStatus(`${dates(r.syncedEvents)} synced to Apple Calendar.`))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to sync'))
      .finally(() => setAppleBusy(false));
  }

  function disconnectApple() {
    setAppleBusy(true);
    setError('');
    apiDelete<{ disconnected: boolean }>('/api/business/apple-calendar')
      .then(() => {
        setBusiness((b) => (b ? { ...b, appleConnected: false } : b));
        setGoogleStatus(
          'Apple Calendar disconnected — your password stays saved, so Reconnect is one click.',
        );
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to disconnect'))
      .finally(() => setAppleBusy(false));
  }

  // Connect and sync are the same idempotent call — it reuses an existing
  // calendar, re-shares it, and re-pushes every open/booked date.
  function syncGoogle() {
    const wasConnected = connected;
    setSyncing(true);
    setError('');
    setGoogleStatus('');
    apiPost<{ calendarId: string; sharedWith: string; syncedEvents: number }>(
      '/api/business/google-calendar',
    )
      .then((r) => {
        setBusiness((b) => (b ? { ...b, googleCalendarId: r.calendarId } : b));
        setGoogleStatus(
          wasConnected
            ? `${dates(r.syncedEvents)} synced to Google Calendar.`
            : `Connected — shared with ${r.sharedWith}. Open Google Calendar and accept the invite. ${dates(r.syncedEvents)} synced.`,
        );
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to sync'))
      .finally(() => setSyncing(false));
  }

  useEffect(() => {
    apiGet<Proposal[]>('/api/proposals')
      .then(setProposals)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load proposals'));
    apiGet<Business>('/api/business')
      .then(setBusiness)
      .catch(() => setBusiness(null));
  }, []);

  const byDate = useMemo(() => {
    const map = new Map<string, Proposal[]>();
    for (const p of proposals ?? []) {
      if (!CALENDAR_STATUSES.includes(p.status as (typeof CALENDAR_STATUSES)[number])) continue;
      const key = p.weddingDate.slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    }
    return map;
  }, [proposals]);

  const weeks = useMemo(() => {
    const firstOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
    const gridStart = new Date(firstOfMonth);
    gridStart.setDate(gridStart.getDate() - firstOfMonth.getDay());

    const days: Date[] = [];
    for (let i = 0; i < 42; i++) {
      days.push(new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i));
    }
    const rows: Date[][] = [];
    for (let i = 0; i < days.length; i += 7) rows.push(days.slice(i, i + 7));
    return rows;
  }, [month]);

  const selectedProposals = selectedKey ? byDate.get(selectedKey) ?? [] : [];

  return (
    <div className="cal-container">
      <div className="cal-page-header">
        <div>
          <h1 className="cal-title">Calendar</h1>
          <p className="cal-subtitle">Open inquiries and booked dates at a glance.</p>
        </div>
        <div className="cal-header-right">
          <div className="cal-legend">
            <span className="cal-legend-item"><span className="cal-dot cal-dot-sent" />Open inquiry</span>
            <span className="cal-legend-item"><span className="cal-dot cal-dot-accepted" />Booked</span>
          </div>
          <div className="cal-google">
            <GoogleIcon size={16} />
            <span className="cal-google-label">Google Calendar</span>
            <span className={'cal-google-status' + (connected ? ' cal-google-status-active' : '')}>
              {connected ? 'Active' : 'Not connected'}
            </span>
            {!connected && (
              <button
                type="button"
                className="cal-connect-btn"
                onClick={syncGoogle}
                disabled={syncing || business === null}
              >
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
            <span className="cal-google-label">Apple Calendar</span>
            <span
              className={'cal-google-status' + (appleConnected ? ' cal-google-status-active' : '')}
            >
              {appleConnected ? 'Active' : 'Not connected'}
            </span>
            {appleConnected ? (
              <button
                type="button"
                className="cal-connect-btn"
                onClick={disconnectApple}
                disabled={appleBusy}
              >
                Disconnect
              </button>
            ) : appleSaved ? (
              <button
                type="button"
                className="cal-connect-btn"
                onClick={() => connectApple()}
                disabled={appleBusy}
              >
                {appleBusy ? 'Reconnecting…' : 'Reconnect'}
              </button>
            ) : (
              <button
                type="button"
                className="cal-connect-btn"
                onClick={() =>
                  setAppleForm((f) =>
                    f ? null : { appleId: business?.appleId ?? '', appPassword: '' },
                  )
                }
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
        </div>
      </div>

      {appleForm && (
        <form
          className="cal-feed-panel"
          onSubmit={(e) => {
            e.preventDefault();
            connectApple(appleForm);
          }}
        >
          <p className="cal-feed-title">
            {business?.appleId ? 'Reconnect Apple Calendar' : 'Connect Apple Calendar'}
          </p>
          <p className="cal-feed-help">
            <b>Step 1.</b> Apple has no one-click authorisation, so this needs an{' '}
            <b>app-specific password</b>. Open your Apple account, go to{' '}
            <b>Sign-In and Security → App-Specific Passwords</b>, and create one.
          </p>
          <p className="cal-feed-step">
            <a
              className="cal-feed-subscribe"
              href="https://account.apple.com/account/manage"
              target="_blank"
              rel="noopener noreferrer"
            >
              Generate password at Apple ↗
            </a>
          </p>
          <p className="cal-feed-help">
            <b>Step 2.</b> Paste it here. It is stored encrypted, never shown again, and you can
            revoke it from that same Apple page at any time.
          </p>
          <div className="cal-feed-url-row">
            <input
              className="cal-feed-url"
              type="email"
              required
              placeholder="Apple ID email"
              value={appleForm.appleId}
              onChange={(e) => setAppleForm({ ...appleForm, appleId: e.target.value })}
            />
            <input
              className="cal-feed-url"
              type="password"
              required
              placeholder="xxxx-xxxx-xxxx-xxxx"
              value={appleForm.appPassword}
              onChange={(e) => setAppleForm({ ...appleForm, appPassword: e.target.value })}
            />
            <button type="submit" className="cal-feed-subscribe" disabled={appleBusy}>
              {appleBusy ? 'Connecting…' : 'Connect'}
            </button>
          </div>
          <p className="cal-feed-help">
            Your normal Apple ID password will not work here — it must be an app-specific one, and
            your Apple ID needs two-factor authentication turned on to create it.
          </p>
        </form>
      )}

      {googleStatus && <div className="cal-sync-note">{googleStatus}</div>}

      {error && <div className="cal-error-banner">{error}</div>}

      <div className="cal-nav">
        <button type="button" onClick={() => setMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}>
          ‹
        </button>
        <span className="cal-month-label">
          {month.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
        </span>
        <button type="button" onClick={() => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}>
          ›
        </button>
      </div>

      <div className="cal-grid">
        {WEEKDAYS.map((d) => (
          <div className="cal-weekday" key={d}>{d}</div>
        ))}
        {weeks.flat().map((date) => {
          const key = toDateKey(date);
          const dayProposals = byDate.get(key) ?? [];
          const booked = dayProposals.some((p) => p.status === 'ACCEPTED');
          const inquiry = dayProposals.some((p) => p.status === 'SENT');
          const inMonth = date.getMonth() === month.getMonth();
          return (
            <button
              type="button"
              key={key}
              className={
                'cal-day' +
                (inMonth ? '' : ' cal-day-outside') +
                (inquiry ? ' cal-day-inquiry' : '') +
                (booked ? ' cal-day-booked' : '') +
                (selectedKey === key ? ' cal-day-selected' : '')
              }
              onClick={() => setSelectedKey(dayProposals.length ? key : null)}
            >
              <span className="cal-day-number">{date.getDate()}</span>
              {(booked || inquiry) && (
                <span className="cal-day-dots">
                  {booked && <span className="cal-dot cal-dot-accepted" />}
                  {inquiry && <span className="cal-dot cal-dot-sent" />}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {selectedKey && (
        <div className="cal-detail">
          <h2 className="cal-detail-title">
            {new Date(selectedKey).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
          </h2>
          {selectedProposals.map((p) => (
            <Link to={`/proposals/${p.id}/preview`} className="cal-detail-row" key={p.id}>
              <span className={`cal-status cal-status-${p.status.toLowerCase()}`}>
                {p.status === 'ACCEPTED' ? 'Booked' : 'Open Inquiry'}
              </span>
              <span className="cal-detail-number">{p.proposalNumber}</span>
              <span className="cal-detail-customer">{p.customer.name}</span>
              <span className="cal-detail-total">{money(p.total)}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
