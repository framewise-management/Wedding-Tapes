import { randomUUID } from 'crypto';
import { and, eq, inArray } from 'drizzle-orm';
import { db } from '../db/client';
import { businesses, proposals } from '../db/schema';
import { BadRequestError, NotFoundError, UnauthorizedError } from '../lib/http-error';
import { decryptSecret, encryptSecret } from '../lib/crypto';
import { renderEventDocument, type CalendarEvent } from './calendar';

const ICLOUD_ROOT = 'https://caldav.icloud.com';
const SYNCED_STATUSES = ['SENT', 'ACCEPTED'] as const;

interface Credentials {
  appleId: string;
  password: string;
}

function authHeader(c: Credentials): string {
  return 'Basic ' + Buffer.from(`${c.appleId}:${c.password}`).toString('base64');
}

async function dav(
  creds: Credentials,
  url: string,
  method: string,
  init: { depth?: string; body?: string; contentType?: string } = {},
): Promise<{ url: string; text: string }> {
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: authHeader(creds),
      'Content-Type': init.contentType ?? 'application/xml; charset=utf-8',
      ...(init.depth ? { Depth: init.depth } : {}),
    },
    body: init.body,
  });

  if (res.status === 401 || res.status === 403) {
    throw new UnauthorizedError(
      'Apple rejected these credentials — check the Apple ID and that the app-specific password is current',
    );
  }
  if (!res.ok) {
    throw new BadRequestError(`iCloud ${method} failed (${res.status}): ${await res.text()}`);
  }
  return { url: res.url || url, text: res.status === 204 ? '' : await res.text() };
}

// ponytail: iCloud's PROPFIND output is stable and we only ever pull an href or
// a displayname out of it — swap in a real XML parser if we start reading more.
function tagText(xml: string, tag: string): string | null {
  const m = new RegExp(`<[^>]*\\b${tag}[^>]*>([\\s\\S]*?)</[^>]*\\b${tag}>`).exec(xml);
  return m ? m[1].trim() : null;
}

function hrefInside(xml: string, tag: string): string | null {
  const block = tagText(xml, tag);
  return block ? tagText(block, 'href') : null;
}

function responseBlocks(xml: string): string[] {
  return [...xml.matchAll(/<[^>]*\bresponse[^>]*>([\s\S]*?)<\/[^>]*\bresponse>/g)].map((m) => m[1]);
}

const PROPFIND_PRINCIPAL = `<?xml version="1.0" encoding="utf-8"?>
<d:propfind xmlns:d="DAV:"><d:prop><d:current-user-principal/></d:prop></d:propfind>`;

const PROPFIND_HOME = `<?xml version="1.0" encoding="utf-8"?>
<d:propfind xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav"><d:prop><c:calendar-home-set/></d:prop></d:propfind>`;

const PROPFIND_CALENDARS = `<?xml version="1.0" encoding="utf-8"?>
<d:propfind xmlns:d="DAV:"><d:prop><d:displayname/><d:resourcetype/></d:prop></d:propfind>`;

function mkcalendarBody(name: string): string {
  const safe = name.replace(/[<&>]/g, (ch) => `&#${ch.charCodeAt(0)};`);
  return `<?xml version="1.0" encoding="utf-8"?>
<c:mkcalendar xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
  <d:set><d:prop>
    <d:displayname>${safe}</d:displayname>
    <c:supported-calendar-component-set><c:comp name="VEVENT"/></c:supported-calendar-component-set>
  </d:prop></d:set>
</c:mkcalendar>`;
}

/**
 * iCloud answers the well-known root but hands back per-user hosts
 * (pNN-caldav.icloud.com) in its hrefs, so every href is resolved against the
 * URL that actually served the response rather than against ICLOUD_ROOT.
 */
async function findCalendarHome(creds: Credentials): Promise<string> {
  const principalRes = await dav(creds, `${ICLOUD_ROOT}/`, 'PROPFIND', {
    depth: '0',
    body: PROPFIND_PRINCIPAL,
  });
  const principalHref = hrefInside(principalRes.text, 'current-user-principal');
  if (!principalHref) throw new BadRequestError('iCloud did not return a calendar principal');

  const principalUrl = new URL(principalHref, principalRes.url).toString();
  const homeRes = await dav(creds, principalUrl, 'PROPFIND', {
    depth: '0',
    body: PROPFIND_HOME,
  });
  const homeHref = hrefInside(homeRes.text, 'calendar-home-set');
  if (!homeHref) throw new BadRequestError('iCloud did not return a calendar home');

  return new URL(homeHref, homeRes.url).toString();
}

async function findOrCreateCalendar(
  creds: Credentials,
  home: string,
  displayName: string,
): Promise<string> {
  const listed = await dav(creds, home, 'PROPFIND', { depth: '1', body: PROPFIND_CALENDARS });
  for (const block of responseBlocks(listed.text)) {
    if (tagText(block, 'displayname') !== displayName) continue;
    const href = tagText(block, 'href');
    if (href) return new URL(href, listed.url).toString();
  }

  const url = new URL(`${randomUUID()}/`, home).toString();
  await dav(creds, url, 'MKCALENDAR', { body: mkcalendarBody(displayName) });
  return url;
}

function eventUrl(calendarUrl: string, proposalId: string): string {
  return new URL(`${proposalId}.ics`, calendarUrl).toString();
}

async function putEvent(creds: Credentials, calendarUrl: string, p: CalendarEvent): Promise<void> {
  await dav(creds, eventUrl(calendarUrl, p.id), 'PUT', {
    contentType: 'text/calendar; charset=utf-8',
    body: renderEventDocument(p),
  });
}

async function deleteEvent(
  creds: Credentials,
  calendarUrl: string,
  proposalId: string,
): Promise<void> {
  const res = await fetch(eventUrl(calendarUrl, proposalId), {
    method: 'DELETE',
    headers: { Authorization: authHeader(creds) },
  });
  // A already-absent event is the state we wanted; only real failures matter.
  if (!res.ok && res.status !== 404) {
    throw new BadRequestError(`iCloud DELETE failed (${res.status})`);
  }
}

async function storedCredentials(
  businessId: string,
): Promise<{ creds: Credentials; calendarUrl: string } | null> {
  const business = await db.query.businesses.findFirst({ where: eq(businesses.id, businessId) });
  if (!business?.appleId || !business.applePasswordEnc || !business.appleCalendarUrl) return null;
  return {
    creds: { appleId: business.appleId, password: decryptSecret(business.applePasswordEnc) },
    calendarUrl: business.appleCalendarUrl,
  };
}

function openProposals(businessId: string) {
  return db.query.proposals.findMany({
    where: and(
      eq(proposals.businessId, businessId),
      inArray(proposals.status, [...SYNCED_STATUSES]),
    ),
    with: { customer: true },
  });
}

/**
 * Reconnecting reuses the saved password when the caller sends none, so the
 * user only ever types an app-specific password once per Apple ID.
 */
export async function connectAppleCalendar(
  businessId: string,
  input: { appleId?: string; appPassword?: string },
) {
  const business = await db.query.businesses.findFirst({ where: eq(businesses.id, businessId) });
  if (!business) throw new NotFoundError('Business not found');

  let creds: Credentials;
  if (input.appPassword) {
    const appleId = input.appleId ?? business.appleId;
    if (!appleId) throw new BadRequestError('appleId is required');
    // Apple prints app-specific passwords in xxxx-xxxx-xxxx-xxxx groups; users
    // paste them with the hyphens, which iCloud rejects.
    creds = { appleId, password: input.appPassword.replace(/[\s-]/g, '') };
  } else {
    if (!business.appleId || !business.applePasswordEnc) {
      throw new BadRequestError(
        'No saved Apple password — enter your Apple ID and an app-specific password',
      );
    }
    creds = { appleId: business.appleId, password: decryptSecret(business.applePasswordEnc) };
  }

  const home = await findCalendarHome(creds);
  const calendarUrl = await findOrCreateCalendar(creds, home, `${business.name} — Weddings`);

  const open = await openProposals(businessId);
  for (const proposal of open) await putEvent(creds, calendarUrl, proposal);

  await db
    .update(businesses)
    .set({
      appleId: creds.appleId,
      applePasswordEnc: encryptSecret(creds.password),
      appleCalendarUrl: calendarUrl,
    })
    .where(eq(businesses.id, businessId));

  return { appleId: creds.appleId, syncedEvents: open.length };
}

/**
 * Stops syncing without discarding the saved password, so reconnecting is one
 * click. Clearing appleCalendarUrl is what storedCredentials() checks, so no
 * further writes reach iCloud. The calendar itself stays in the user's account
 * — deleting it would destroy dates they may still be relying on.
 */
export async function disconnectAppleCalendar(businessId: string) {
  await db
    .update(businesses)
    .set({ appleCalendarUrl: null })
    .where(eq(businesses.id, businessId));
  return { disconnected: true };
}

/** Best-effort, exactly like the Google path: never fail the proposal write. */
export async function syncProposalToApple(proposalId: string): Promise<void> {
  try {
    const proposal = await db.query.proposals.findFirst({
      where: eq(proposals.id, proposalId),
      with: { customer: true },
    });
    if (!proposal) return;

    const stored = await storedCredentials(proposal.businessId);
    if (!stored) return;

    const shouldExist = SYNCED_STATUSES.includes(
      proposal.status as (typeof SYNCED_STATUSES)[number],
    );
    if (shouldExist) {
      await putEvent(stored.creds, stored.calendarUrl, proposal);
    } else {
      await deleteEvent(stored.creds, stored.calendarUrl, proposal.id);
    }
  } catch (err) {
    console.error('Apple Calendar sync failed:', err);
  }
}

export async function removeAppleEvent(businessId: string, proposalId: string): Promise<void> {
  try {
    const stored = await storedCredentials(businessId);
    if (!stored) return;
    await deleteEvent(stored.creds, stored.calendarUrl, proposalId);
  } catch (err) {
    console.error('Apple Calendar delete failed:', err);
  }
}

/** Manual re-push of every open/booked date, for the Sync button. */
export async function resyncAppleCalendar(businessId: string) {
  const stored = await storedCredentials(businessId);
  if (!stored) throw new BadRequestError('Apple Calendar is not connected');

  const open = await openProposals(businessId);
  for (const proposal of open) await putEvent(stored.creds, stored.calendarUrl, proposal);
  return { syncedEvents: open.length };
}
