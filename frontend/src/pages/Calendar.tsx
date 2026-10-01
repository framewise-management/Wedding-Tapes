import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiGet } from '../api/client';
import BlockDateForm from '../components/BlockDateForm';
import CalendarIntegrations from '../components/CalendarIntegrations';
import { BlockIcon, CameraIcon, ChevronRightIcon, TrashIcon } from '../components/icons';
import { useBlockedDates } from '../lib/useBlockedDates';
import type { Business } from '../types/business';
import type { Proposal, ProposalStatus } from '../types/proposal';
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

export default function Calendar() {
  const [proposals, setProposals] = useState<Proposal[] | null>(null);
  const [error, setError] = useState('');
  const { blockedDates, add: addBlockedDate, remove: removeBlockedDate } = useBlockedDates(setError);
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('all');
  const [business, setBusiness] = useState<Business | null>(null);
  const [note, setNote] = useState('');
  const [addingBlock, setAddingBlock] = useState(false);

  const todayKey = toDateKey(new Date());

  useEffect(() => {
    apiGet<Proposal[]>('/api/proposals')
      .then(setProposals)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load proposals'));
    apiGet<Business>('/api/business').then(setBusiness).catch(() => setBusiness(null));
  }, []);

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
      {note && <div className="cal-sync-note">{note}</div>}

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

          {addingBlock && <BlockDateForm onSubmit={addBlockedDate} onClose={() => setAddingBlock(false)} />}

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
                      onClick={() => entry.blockedId && removeBlockedDate(entry.blockedId)}
                    >
                      <TrashIcon size={13} />
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

          <CalendarIntegrations business={business} setBusiness={setBusiness} onError={setError} onNote={setNote} />
        </aside>
      </div>
    </div>
  );
}
