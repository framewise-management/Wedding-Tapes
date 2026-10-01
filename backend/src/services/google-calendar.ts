import jwt from 'jsonwebtoken';
import { and, eq, inArray } from 'drizzle-orm';
import { db } from '../db/client';
import { businesses, proposals } from '../db/schema';
import { BadGatewayError, BadRequestError } from '../lib/http-error';
import { calendarEventFor, shouldSync, SYNCED_STATUSES } from './calendar-events';
import { businessService } from './business';

const API = 'https://www.googleapis.com/calendar/v3';
const SCOPE = 'https://www.googleapis.com/auth/calendar';

interface ServiceAccountKey {
  client_email: string;
  private_key: string;
}

function serviceAccount(): ServiceAccountKey | null {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();
  if (!raw) return null;

  // A .env file needs the JSON single-quoted; a value pasted from there into a
  // dashboard keeps those quotes, since nothing strips them outside dotenv.
  const json = raw.replace(/^'|'$/g, '');
  let key: ServiceAccountKey;
  try {
    key = JSON.parse(json) as ServiceAccountKey;
  } catch {
    throw new BadRequestError(
      'GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON — paste the whole service-account key on one line',
    );
  }
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
    throw new BadGatewayError(`Google token request failed: ${await res.text()}`);
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
    throw new BadGatewayError(`Google Calendar ${init.method} ${path} failed: ${await res.text()}`);
  }
  return res.status === 204 ? {} : ((await res.json()) as Record<string, unknown>);
}

type SyncableProposal = typeof proposals.$inferSelect & {
  customer: { name: string; phone: string | null };
};

type GoogleCalendarTarget = Pick<typeof businesses.$inferSelect, 'googleCalendarId'>;

export class GoogleCalendarService {
  /**
   * Creates the business's own Google calendar (owned by the service account) and
   * shares it with the user's email, so it shows up in their Google Calendar
   * without any per-user OAuth. Backfills every already-open/booked date.
   */
  async connect(businessId: string, email: string) {
    const key = serviceAccount();
    if (!key) {
      throw new BadRequestError('Google Calendar is not configured on this server');
    }

    const business = await businessService.findRow(businessId);

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
      await this.pushEvent(key, calendarId, proposal);
    }

    return { calendarId, sharedWith: email, syncedEvents: open.length };
  }

  async syncProposal(proposal: SyncableProposal, business: GoogleCalendarTarget): Promise<void> {
    const key = serviceAccount();
    if (!key || !business.googleCalendarId) return;

    if (shouldSync(proposal.status)) {
      await this.pushEvent(key, business.googleCalendarId, proposal);
    } else if (proposal.googleEventId) {
      await this.removeEvent(key, business.googleCalendarId, proposal.googleEventId);
      await db.update(proposals).set({ googleEventId: null }).where(eq(proposals.id, proposal.id));
    }
  }

  async removeProposalEvent(
    proposal: Pick<typeof proposals.$inferSelect, 'googleEventId'>,
    business: GoogleCalendarTarget,
  ): Promise<void> {
    const key = serviceAccount();
    if (!key || !proposal.googleEventId || !business.googleCalendarId) return;
    await this.removeEvent(key, business.googleCalendarId, proposal.googleEventId);
  }

  private async pushEvent(key: ServiceAccountKey, calendarId: string, p: SyncableProposal) {
    const e = calendarEventFor(p);
    const body = {
      summary: e.summary,
      location: e.location,
      description: e.description,
      start: { date: e.startDate },
      end: { date: e.endDateExclusive },
      status: e.confirmed ? 'confirmed' : 'tentative',
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

  private async removeEvent(key: ServiceAccountKey, calendarId: string, eventId: string) {
    await googleFetch(key, `/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`, {
      method: 'DELETE',
    });
  }
}

export const googleCalendarService = new GoogleCalendarService();
