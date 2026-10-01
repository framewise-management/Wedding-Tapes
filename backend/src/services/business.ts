import { eq } from 'drizzle-orm';
import type { Db } from '../db/client';
import { businesses } from '../db/schema';
import { NotFoundError } from '../lib/http-error';
import type { UpdateBusinessInput } from '../schemas/business';
import type { TermService } from './terms';

export class BusinessService {
  constructor(
    private readonly db: Db,
    private readonly terms: TermService,
  ) {}

  // Raw row, including secrets: server-side callers only. Anything sent to a client goes through get.
  async findRow(businessId: string) {
    const business = await this.db.query.businesses.findFirst({
      where: eq(businesses.id, businessId),
    });
    if (!business) throw new NotFoundError('Business not found');
    return business;
  }

  async get(businessId: string) {
    const business = await this.findRow(businessId);
    // The stored iCloud app-specific password never leaves the server, not even
    // encrypted — the client only needs to know whether a connection exists.
    const { applePasswordEnc, calendarToken: _calendarToken, ...safe } = business;
    return {
      ...safe,
      // Active clauses ride along so every proposal/PDF render path gets them
      // without a second fetch; the management page reads /api/terms directly.
      terms: await this.terms.findAll(businessId, true),
      appleConnected: Boolean(safe.appleCalendarUrl),
      appleCredentialSaved: Boolean(applePasswordEnc),
    };
  }

  async update(businessId: string, input: UpdateBusinessInput) {
    await this.get(businessId);
    await this.db.update(businesses).set(input).where(eq(businesses.id, businessId));
    return this.get(businessId);
  }
}

