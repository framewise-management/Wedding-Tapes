import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiDelete, apiGet, apiPost } from '../api/client';
import GoogleIcon from '../components/GoogleIcon';
import type { Business } from '../types/business';
import type { Proposal, ProposalStatus } from '../types/proposal';
import type { BlockedDate } from '../types/blockedDate';
import { datesInRange } from '../lib/dates';
import './Calendar.css';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAYS_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

// Only SENT (open inquiry) and ACCEPTED (booked) hold a calendar date — DRAFT
// hasn't gone to the customer yet, REJECTED frees the date back up.
const CALENDAR_STATUSES = ['SENT', 'ACCEPTED'] as const;

type Tab = 'all' | 'shoots' | 'blocked';

interface CalendarEntry {
  key: string;
  kind: 'shoot' | 'blocked';
  date: string;
  title: string;
  subtitle: string;
  location: string | null;
  status?: ProposalStatus;
  proposalId?: string;
  blockedId?: string;
}

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatShort(dateKey: string): string {
  return new Date(dateKey).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function dates(n: number): string {
  return `${n} date${n === 1 ? '' : 's'}`;
}

function CameraIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 8.5a1.5 1.5 0 0 1 1.5-1.5h1.6l1-1.6A1.5 1.5 0 0 1 9.4 4.6h5.2a1.5 1.5 0 0 1 1.3.8l1 1.6h1.6A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5v-9Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12.5" r="3" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function BlockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="4" width="18" height="17" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3 9h18M8 2v4M16 2v4M7 13l10 6M17 13l-10 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="m9 6 6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SyncIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true">
      <path d="M20 11a8 8 0 0 0-14.7-4.4M4 13a8 8 0 0 0 14.7 4.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M20 4v4h-4M4 20v-4h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"
      />
    </svg>
  );
}

export default function Calendar() {
  const [proposals, setProposals] = useState<Proposal[] | null>(null);
  const [blockedDates, setBlockedDates] = useState<BlockedDate[] | null>(null);
  const [error, setError] = useState('');
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('all');
  const [business, setBusiness] = useState<Business | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [googleStatus, setGoogleStatus] = useState('');
  const [appleForm, setAppleForm] = useState<{ appleId: string; appPassword: string } | null>(null);
  const [appleBusy, setAppleBusy] = useState(false);
  const [addingBlock, setAddingBlock] = useState(false);
  const [blockDate, setBlockDate] = useState('');
  const [blockReason, setBlockReason] = useState('');
  const [blockSaving, setBlockSaving] = useState(false);

  const connected = Boolean(business?.googleCalendarId);
  const appleConnected = Boolean(business?.appleConnected);
  const appleSaved = Boolean(business?.appleCredentialSaved);
  const todayKey = toDateKey(new Date());

  function loadBlockedDates() {
    apiGet<BlockedDate[]>('/api/blocked-dates').then(setBlockedDates).catch(() => setBlockedDates([]));
  }

  useEffect(() => {
    apiGet<Proposal[]>('/api/proposals')
      .then(setProposals)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load proposals'));
    loadBlockedDates();
    apiGet<Business>('/api/business').then(setBusiness).catch(() => setBusiness(null));
  }, []);

  async function handleAddBlockDate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBlockSaving(true);
    try {
      await apiPost('/api/blocked-dates', { date: blockDate, reason: blockReason || undefined });
      setBlockDate('');
      setBlockReason('');
      setAddingBlock(false);
      loadBlockedDates();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to block date');
    } finally {
      setBlockSaving(false);
    }
  }

  async function handleRemoveBlockDate(id: string) {
    try {
      await apiDelete(`/api/blocked-dates/${id}`);
      loadBlockedDates();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove blocked date');
    }
  }

  // Connect and sync are the same idempotent call — it reuses an existing
  // calendar, re-shares it, and re-pushes every open/booked date.
  function syncGoogle() {
    const wasConnected = connected;
    setSyncing(true);
    setError('');
    setGoogleStatus('');
    apiPost<{ calendarId: string; sharedWith: string; syncedEvents: number }>('/api/business/google-calendar')
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

  function connectApple(credentials?: { appleId: string; appPassword: string }) {
    setAppleBusy(true);
    setError('');
    setGoogleStatus('');
    apiPost<{ appleId: string; syncedEvents: number }>('/api/business/apple-calendar', credentials ?? {})
      .then((r) => {
        setBusiness((b) => (b ? { ...b, appleId: r.appleId, appleConnected: true, appleCredentialSaved: true } : b));
        setAppleForm(null);
        setGoogleStatus(`Apple Calendar connected — ${dates(r.syncedEvents)} pushed to ${r.appleId}.`);
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
        setGoogleStatus('Apple Calendar disconnected — your password stays saved, so Reconnect is one click.');
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to disconnect'))
      .finally(() => setAppleBusy(false));
  }

  // Every open/booked proposal contributes one entry per real ceremony
  // (Haldi, Wedding, Reception, …) on its own date -- far more accurate than
  // a single blob across the whole date range. A proposal saved before
  // per-event scheduling existed has no events, so it falls back to
  // spanning weddingDate..weddingEndDate as one generic entry.
  const entriesByDate = useMemo(() => {
    const map = new Map<string, CalendarEntry[]>();
    const push = (key: string, entry: CalendarEntry) => {
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(entry);
    };

    for (const p of proposals ?? []) {
      if (!CALENDAR_STATUSES.includes(p.status as (typeof CALENDAR_STATUSES)[number])) continue;
      if (p.events.length) {
        for (const e of p.events) {
          push(e.date, {
            key: `shoot-${e.id}`,
            kind: 'shoot',
            date: e.date,
            title: e.name,
            subtitle: p.customer.name,
            location: e.location ?? p.weddingLocation,
            status: p.status,
            proposalId: p.id,
          });
        }
      } else {
        for (const key of datesInRange(p.weddingDate, p.weddingEndDate)) {
          push(key, {
            key: `shoot-${p.id}-${key}`,
            kind: 'shoot',
            date: key,
            title: 'Wedding',
            subtitle: p.customer.name,
            location: p.weddingLocation,
            status: p.status,
            proposalId: p.id,
          });
        }
      }
    }

    for (const b of blockedDates ?? []) {
      push(b.date, {
        key: `blocked-${b.id}`,
        kind: 'blocked',
        date: b.date,
        title: 'Blocked',
        subtitle: b.reason || 'Out of station',
        location: null,
        blockedId: b.id,
      });
    }

    return map;
  }, [proposals, blockedDates]);

  function entriesFor(key: string): CalendarEntry[] {
    const all = entriesByDate.get(key) ?? [];
    if (tab === 'all') return all;
    if (tab === 'shoots') return all.filter((e) => e.kind === 'shoot');
    return all.filter((e) => e.kind === 'blocked');
  }

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

  const shootsThisMonth = useMemo(() => {
    let count = 0;
    for (const [key, list] of entriesByDate) {
      const d = new Date(key);
      if (d.getFullYear() === month.getFullYear() && d.getMonth() === month.getMonth()) {
        count += list.filter((e) => e.kind === 'shoot').length;
      }
    }
    return count;
  }, [entriesByDate, month]);

  const blockedThisMonth = useMemo(() => {
    return (blockedDates ?? []).filter((b) => {
      const d = new Date(b.date);
      return d.getFullYear() === month.getFullYear() && d.getMonth() === month.getMonth();
    }).length;
  }, [blockedDates, month]);

  const upcoming = useMemo(() => {
    const all: CalendarEntry[] = [];
    for (const [, list] of entriesByDate) all.push(...list);
    return all
      .filter((e) => e.date >= todayKey)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 6);
  }, [entriesByDate, todayKey]);

  const todaysEntries = entriesFor(todayKey);
  const selectedEntries = selectedKey ? entriesFor(selectedKey) : [];

  return (
    <div className="cal-page">
      <div className="cal-topbar">
        <div>
          <h1 className="cal-title">Calendar</h1>
          <p className="cal-subtitle">Stay organized. Manage your shoots and blocked dates.</p>
        </div>
        <div className="cal-topbar-actions">
          <Link to="/proposals/new" className="cal-btn cal-btn-primary">
            + Add Shoot
          </Link>
        </div>
      </div>

      {error && <div className="cal-error-banner">{error}</div>}
      {googleStatus && <div className="cal-sync-note">{googleStatus}</div>}

      <div className="cal-stats">
        <div className="cal-stat-card">
          <span className="cal-stat-icon cal-stat-icon-shoot"><CameraIcon /></span>
          <div>
            <p className="cal-stat-value">{shootsThisMonth}</p>
            <p className="cal-stat-label">Shoots this month</p>
          </div>
        </div>
        <div className="cal-stat-card">
          <span className="cal-stat-icon cal-stat-icon-blocked"><BlockIcon /></span>
          <div>
            <p className="cal-stat-value">{blockedThisMonth}</p>
            <p className="cal-stat-label">Blocked dates</p>
          </div>
        </div>
      </div>

      <div className="cal-layout">
        <div className="cal-main">
          <div className="cal-toolbar">
            <div className="cal-tabs" role="tablist">
              {([
                ['all', 'All Events'],
                ['shoots', 'Shoots'],
                ['blocked', 'Block Dates'],
              ] as [Tab, string][]).map(([key, label]) => (
                <button
                  type="button"
                  role="tab"
                  key={key}
                  aria-selected={tab === key}
                  className={'cal-tab' + (tab === key ? ' cal-tab-active' : '')}
                  onClick={() => setTab(key)}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="cal-nav">
              <button type="button" className="cal-btn" onClick={() => setMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}>
                Today
              </button>
              <button
                type="button"
                className="cal-nav-arrow"
                aria-label="Previous month"
                onClick={() => setMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
              >
                ‹
              </button>
              <button
                type="button"
                className="cal-nav-arrow"
                aria-label="Next month"
                onClick={() => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
              >
                ›
              </button>
              <span className="cal-month-label">
                {month.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
              </span>
            </div>
          </div>

          {addingBlock && (
            <form className="cal-block-form" onSubmit={handleAddBlockDate}>
              <input
                type="date"
                className="cal-input"
                value={blockDate}
                onChange={(e) => setBlockDate(e.target.value)}
                required
              />
              <input
                className="cal-input"
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                placeholder="Reason (optional)"
              />
              <button type="submit" className="cal-btn cal-btn-primary" disabled={blockSaving}>
                {blockSaving ? 'Blocking…' : 'Block date'}
              </button>
              <button type="button" className="cal-btn" onClick={() => setAddingBlock(false)}>
                Cancel
              </button>
            </form>
          )}

          <div className="cal-grid">
            {WEEKDAYS.map((d) => (
              <div className="cal-weekday" key={d}>{d}</div>
            ))}
            {weeks.flat().map((date) => {
              const key = toDateKey(date);
              const dayEntries = entriesFor(key);
              const inMonth = date.getMonth() === month.getMonth();
              const shown = dayEntries.slice(0, 2);
              const overflow = dayEntries.length - shown.length;
              return (
                <button
                  type="button"
                  key={key}
                  data-date={key}
                  className={
                    'cal-day' +
                    (inMonth ? '' : ' cal-day-outside') +
                    (key === todayKey ? ' cal-day-today' : '') +
                    (selectedKey === key ? ' cal-day-selected' : '')
                  }
                  onClick={() => setSelectedKey(dayEntries.length ? key : null)}
                >
                  <span className="cal-day-number">{date.getDate()}</span>
                  {shown.map((entry) => (
                    <span
                      key={entry.key}
                      className={'cal-day-pill' + (entry.kind === 'blocked' ? ' cal-day-pill-blocked' : ' cal-day-pill-shoot')}
                    >
                      <span className="cal-day-pill-icon">
                        {entry.kind === 'blocked' ? <BlockIcon /> : <CameraIcon />}
                      </span>
                      <span className="cal-day-pill-text">
                        <strong>{entry.title}</strong>
                        <span>{entry.subtitle}</span>
                      </span>
                    </span>
                  ))}
                  {overflow > 0 && <span className="cal-day-more">+{overflow} more</span>}
                </button>
              );
            })}
          </div>

        </div>

        <aside className="cal-aside">
          <div className="cal-mini-card">
            <div className="cal-mini-head">
              <span>{month.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</span>
              <div className="cal-mini-nav">
                <button type="button" aria-label="Previous month" onClick={() => setMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}>‹</button>
                <button type="button" aria-label="Next month" onClick={() => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}>›</button>
              </div>
            </div>
            <div className="cal-mini-grid">
              {WEEKDAYS_SHORT.map((d, i) => (
                <span className="cal-mini-weekday" key={i}>{d}</span>
              ))}
              {weeks.flat().map((date) => {
                const key = toDateKey(date);
                const hasEntries = (entriesByDate.get(key)?.length ?? 0) > 0;
                const inMonth = date.getMonth() === month.getMonth();
                return (
                  <button
                    type="button"
                    key={key}
                    className={
                      'cal-mini-day' +
                      (inMonth ? '' : ' cal-mini-day-outside') +
                      (key === todayKey ? ' cal-mini-day-today' : '') +
                      (selectedKey === key ? ' cal-mini-day-selected' : '')
                    }
                    onClick={() => setSelectedKey(entriesByDate.get(key)?.length ? key : null)}
                  >
                    {date.getDate()}
                    {hasEntries && <span className="cal-mini-dot" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="cal-today-agenda">
            <h2 className="cal-detail-title">Today — {new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}</h2>
            {todaysEntries.length === 0 ? (
              <p className="cal-empty">Nothing on the calendar today.</p>
            ) : (
              todaysEntries.map((entry) =>
                entry.kind === 'shoot' ? (
                  <Link to={`/proposals/${entry.proposalId}/preview`} className="cal-detail-row" key={entry.key}>
                    <span className="cal-detail-icon cal-detail-icon-shoot"><CameraIcon /></span>
                    <span className="cal-detail-info">
                      <span className="cal-detail-name">{entry.title} — {entry.subtitle}</span>
                      {entry.location && <span className="cal-detail-location">{entry.location}</span>}
                    </span>
                    <span className={`cal-status cal-status-${entry.status?.toLowerCase()}`}>
                      {entry.status === 'ACCEPTED' ? 'Confirmed' : 'Open Inquiry'}
                    </span>
                  </Link>
                ) : (
                  <div className="cal-detail-row" key={entry.key}>
                    <span className="cal-detail-icon cal-detail-icon-blocked"><BlockIcon /></span>
                    <span className="cal-detail-info">
                      <span className="cal-detail-name">Blocked</span>
                      <span className="cal-detail-location">{entry.subtitle}</span>
                    </span>
                  </div>
                ),
              )
            )}
          </div>

          {selectedKey && (
            <div className="cal-detail">
              <h2 className="cal-detail-title">
                {new Date(selectedKey).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </h2>
              {selectedEntries.map((entry) =>
                entry.kind === 'shoot' ? (
                  <Link to={`/proposals/${entry.proposalId}/preview`} className="cal-detail-row" key={entry.key}>
                    <span className="cal-detail-icon cal-detail-icon-shoot"><CameraIcon /></span>
                    <span className="cal-detail-info">
                      <span className="cal-detail-name">{entry.title} — {entry.subtitle}</span>
                      {entry.location && <span className="cal-detail-location">{entry.location}</span>}
                    </span>
                    <span className={`cal-status cal-status-${entry.status?.toLowerCase()}`}>
                      {entry.status === 'ACCEPTED' ? 'Booked' : 'Open Inquiry'}
                    </span>
                  </Link>
                ) : (
                  <div className="cal-detail-row" key={entry.key}>
                    <span className="cal-detail-icon cal-detail-icon-blocked"><BlockIcon /></span>
                    <span className="cal-detail-info">
                      <span className="cal-detail-name">Blocked</span>
                      <span className="cal-detail-location">{entry.subtitle}</span>
                    </span>
                    <button
                      type="button"
                      className="cal-icon-btn"
                      aria-label="Remove blocked date"
                      onClick={() => entry.blockedId && handleRemoveBlockDate(entry.blockedId)}
                    >
                      <TrashIcon />
                    </button>
                  </div>
                ),
              )}
            </div>
          )}

          <div className="cal-side-card">
            <div className="cal-side-head">
              <span>Upcoming Events</span>
            </div>
            {upcoming.length === 0 ? (
              <p className="cal-empty">Nothing coming up.</p>
            ) : (
              upcoming.map((entry) => (
                <Link
                  to={entry.proposalId ? `/proposals/${entry.proposalId}/preview` : '#'}
                  className="cal-upcoming-row"
                  key={entry.key}
                  onClick={(e) => !entry.proposalId && e.preventDefault()}
                >
                  <span className={'cal-detail-icon' + (entry.kind === 'blocked' ? ' cal-detail-icon-blocked' : ' cal-detail-icon-shoot')}>
                    {entry.kind === 'blocked' ? <BlockIcon /> : <CameraIcon />}
                  </span>
                  <span className="cal-upcoming-text">
                    <span className="cal-upcoming-title">{entry.title}</span>
                    <span className="cal-upcoming-sub">{entry.subtitle}</span>
                  </span>
                  <span className="cal-upcoming-date">{formatShort(entry.date)}</span>
                  {entry.proposalId && <ChevronRightIcon />}
                </Link>
              ))
            )}
          </div>

          <div className="cal-side-card">
            <div className="cal-side-head">
              <span>Quick Actions</span>
            </div>
            <div className="cal-quick-grid">
              <Link to="/proposals/new" className="cal-quick-btn">+ Add Shoot</Link>
              <button type="button" className="cal-quick-btn" onClick={() => setAddingBlock((v) => !v)}>
                Block Date
              </button>
              <Link to="/proposals" className="cal-quick-btn">View Proposals</Link>
            </div>
          </div>

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
        </aside>
      </div>
    </div>
  );
}
