import jwt from 'jsonwebtoken';
import { and, eq, inArray } from 'drizzle-orm';
import { db } from '../db/client';
import { businesses, proposals } from '../db/schema';
import { BadRequestError, NotFoundError } from '../lib/http-error';

const API = 'https://www.googleapis.com/calendar/v3';
const SCOPE = 'https://www.googleapis.com/auth/calendar';
const SYNCED_STATUSES = ['SENT', 'ACCEPTED'] as const;

interface ServiceAccountKey {
  client_email: string;
  private_key: string;
}

function serviceAccount(): ServiceAccountKey | null {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;
  const key = JSON.parse(raw) as ServiceAccountKey;
  // Env vars can't hold real newlines, so the PEM usually arrives escaped.
  return { ...key, private_key: key.private_key.replace(/\\n/g, '\n') };
}

let cachedToken: { value: string; expiresAt: number } | null = null;

async function accessToken(key: ServiceAccountKey): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;

  const now = Math.floor(Date.now() / 1000);
  const assertion = jwt.sign(
    {
      iss: key.client_email,
      scope: SCOPE,
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    },
    key.private_key,
    { algorithm: 'RS256' },
  );

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });
  if (!res.ok) {
    throw new BadRequestError(`Google token request failed: ${await res.text()}`);
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { value: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return data.access_token;
}

async function googleFetch(
  key: ServiceAccountKey,
  path: string,
  init: { method: string; body?: unknown },
): Promise<Record<string, unknown>> {
  const res = await fetch(`${API}${path}`, {
    method: init.method,
    headers: {
      Authorization: `Bearer ${await accessToken(key)}`,
      'Content-Type': 'application/json',
    },
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
  if (!res.ok) {
    throw new BadRequestError(`Google Calendar ${init.method} ${path} failed: ${await res.text()}`);
  }
  return res.status === 204 ? {} : ((await res.json()) as Record<string, unknown>);
}

function nextDay(value: string): string {
  const d = new Date(`${value.slice(0, 10)}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

/**
 * Creates the business's own Google calendar (owned by the service account) and
 * shares it with the user's email, so it shows up in their Google Calendar
 * without any per-user OAuth. Backfills every already-open/booked date.
 */
export async function connectGoogleCalendar(businessId: string, email: string) {
  const key = serviceAccount();
  if (!key) {
    throw new BadRequestError('Google Calendar is not configured on this server');
  }

  const business = await db.query.businesses.findFirst({ where: eq(businesses.id, businessId) });
  if (!business) throw new NotFoundError('Business not found');

  let calendarId = business.googleCalendarId;
  if (!calendarId) {
    const created = await googleFetch(key, '/calendars', {
      method: 'POST',
      body: { summary: `${business.name} — Weddings`, timeZone: 'Asia/Kolkata' },
    });
    calendarId = created.id as string;
    await db
      .update(businesses)
      .set({ googleCalendarId: calendarId })
      .where(eq(businesses.id, businessId));
  }

  await googleFetch(key, `/calendars/${encodeURIComponent(calendarId)}/acl`, {
    method: 'POST',
    body: { role: 'writer', scope: { type: 'user', value: email } },
  });

  const open = await db.query.proposals.findMany({
    where: and(
      eq(proposals.businessId, businessId),
      inArray(proposals.status, [...SYNCED_STATUSES]),
    ),
    with: { customer: true },
  });
  for (const proposal of open) {
    await pushEvent(key, calendarId, proposal);
  }

  return { calendarId, sharedWith: email, syncedEvents: open.length };
}

type SyncableProposal = typeof proposals.$inferSelect & {
  customer: { name: string; phone: string | null };
};

async function pushEvent(key: ServiceAccountKey, calendarId: string, p: SyncableProposal) {
  const body = {
    summary: `${p.customer.name} — ${p.status === 'ACCEPTED' ? 'Booked' : 'Open inquiry'}`,
    location: p.weddingLocation,
    description: [
      `Proposal ${p.proposalNumber}`,
      `Total: ₹${p.total.toLocaleString('en-IN')}`,
      p.customer.phone ? `Phone: ${p.customer.phone}` : '',
    ]
      .filter(Boolean)
      .join('\n'),
    start: { date: p.weddingDate.slice(0, 10) },
    end: { date: nextDay(p.weddingDate) },
    status: p.status === 'ACCEPTED' ? 'confirmed' : 'tentative',
  };

  const base = `/calendars/${encodeURIComponent(calendarId)}/events`;
  if (p.googleEventId) {
    await googleFetch(key, `${base}/${p.googleEventId}`, { method: 'PATCH', body });
    return;
  }

  const created = await googleFetch(key, base, { method: 'POST', body });
  await db
    .update(proposals)
    .set({ googleEventId: created.id as string })
    .where(eq(proposals.id, p.id));
}

/**
 * Best-effort: a Google outage or a revoked calendar must never fail the
 * proposal write that triggered the sync.
 */
export async function syncProposalToGoogle(proposalId: string): Promise<void> {
  const key = serviceAccount();
  if (!key) return;

  try {
    const proposal = await db.query.proposals.findFirst({
      where: eq(proposals.id, proposalId),
      with: { customer: true },
    });
    if (!proposal) return;

    const business = await db.query.businesses.findFirst({
      where: eq(businesses.id, proposal.businessId),
    });
    if (!business?.googleCalendarId) return;

    const shouldExist = SYNCED_STATUSES.includes(
      proposal.status as (typeof SYNCED_STATUSES)[number],
    );
    if (shouldExist) {
      await pushEvent(key, business.googleCalendarId, proposal);
    } else if (proposal.googleEventId) {
      await removeEvent(key, business.googleCalendarId, proposal.googleEventId);
      await db
        .update(proposals)
        .set({ googleEventId: null })
        .where(eq(proposals.id, proposal.id));
    }
  } catch (err) {
    console.error('Google Calendar sync failed:', err);
  }
}

async function removeEvent(key: ServiceAccountKey, calendarId: string, eventId: string) {
  await googleFetch(key, `/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`, {
    method: 'DELETE',
  });
}

export async function removeGoogleEvent(businessId: string, eventId: string | null): Promise<void> {
  const key = serviceAccount();
  if (!key || !eventId) return;
  try {
    const business = await db.query.businesses.findFirst({ where: eq(businesses.id, businessId) });
    if (!business?.googleCalendarId) return;
    await removeEvent(key, business.googleCalendarId, eventId);
  } catch (err) {
    console.error('Google Calendar delete failed:', err);
  }
}
