import { db } from '../db/client';
import { AppleCalendarService } from './apple-calendar';
import { AuthService } from './auth';
import { BlockedDateService } from './blocked-dates';
import { BusinessService } from './business';
import { CalendarFeedService } from './calendar';
import { CalendarSyncService } from './calendar-sync';
import { ServiceCatalog } from './service-catalog';
import { CustomerService } from './customers';
import { EnquiryService } from './enquiries';
import { EventTypeService } from './event-types';
import { GoogleCalendarService } from './google-calendar';
import { PackageService } from './packages';
import { ProposalSnapshotService } from './proposal-snapshots';
import { ProposalService } from './proposals';
import { TermService } from './terms';

export const customerService = new CustomerService(db);
export const serviceCatalog = new ServiceCatalog(db);
export const packageService = new PackageService(db, serviceCatalog);
export const termService = new TermService(db);
export const blockedDateService = new BlockedDateService(db);
export const eventTypeService = new EventTypeService(db);
export const businessService = new BusinessService(db, termService);
export const authService = new AuthService(db, eventTypeService);

export const calendarFeedService = new CalendarFeedService(db, businessService);
export const googleCalendarService = new GoogleCalendarService(db, businessService);
export const appleCalendarService = new AppleCalendarService(db, businessService, calendarFeedService);
export const calendarSyncService = new CalendarSyncService(db, businessService, [
  googleCalendarService,
  appleCalendarService,
]);

export const proposalSnapshotService = new ProposalSnapshotService(
  db,
  businessService,
  serviceCatalog,
  eventTypeService,
  packageService,
);
export const proposalService = new ProposalService(
  db,
  customerService,
  proposalSnapshotService,
  calendarSyncService,
);
export const enquiryService = new EnquiryService(db, customerService, proposalService);
