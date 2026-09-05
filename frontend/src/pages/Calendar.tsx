import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiGet, apiPost } from '../api/client';
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

export default function Calendar() {
  const [proposals, setProposals] = useState<Proposal[] | null>(null);
  const [error, setError] = useState('');
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [googleStatus, setGoogleStatus] = useState('');

  function connectGoogle() {
    setConnecting(true);
    setError('');
    apiPost<{ sharedWith: string; syncedEvents: number }>('/api/business/google-calendar')
      .then((r) =>
        setGoogleStatus(
          `Shared with ${r.sharedWith} — open Google Calendar and accept the invite. ${r.syncedEvents} date${r.syncedEvents === 1 ? '' : 's'} synced.`,
        ),
      )
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to connect'))
      .finally(() => setConnecting(false));
  }

  useEffect(() => {
    apiGet<Proposal[]>('/api/proposals')
      .then(setProposals)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load proposals'));
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
          <button type="button" className="cal-sync-btn" onClick={connectGoogle} disabled={connecting}>
            {connecting ? 'Connecting…' : 'Connect Google Calendar'}
          </button>
        </div>
      </div>

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
