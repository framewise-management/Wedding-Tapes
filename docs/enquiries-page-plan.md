# Enquiries Page Implementation Plan

## Overview
Create an enquiries page for the Wedding Photography Proposal Generator that collects client information for quotes and pre-sales inquiries, supporting both manual submissions and integration with Meta ads.

## Phase 1: Schema & Backend Setup

### Backend
- `db/schema.ts`: Create `enquiries` table with fields:
  - clientInfo (name, brideName, groomName)
  - eventDetails (date, numberOfDays, duration)
  - services (array of service IDs)
  - budget & location info
  - status field (NEW, CONTACTED, CONVERTED, etc.)
  - source tracking (utm params, referrer)

- `schemas/enquiries.ts`: Zod schema with validation:
  - Required client fields
  - Optional service selections
  - Budget/location validation
  - Email/phone validation
  - Source tracking fields

- `services/enquiries.ts`: CRUD operations:
  - Create enquiry with businessId from JWT
  - Find all enquiries for business with filtering
  - Update status and assign to staff
  - Email notifications for new enquiries

- `routes/enquiries.ts`: REST endpoints:
  - POST /api/enquiries (create new enquiry)
  - GET /api/enquiries (list with filters)
  - PUT /api/enquiries/:id (update)
  - GET /api/enquiries/:id (details)

- Email integration:
  - Send confirmation to client
  - Notify sales team
  - Auto-assignment to available staff

### Frontend
- Create `pages/Enquiries.tsx` component
- Enquiries form with sections:
  - Client Information (name, contact)
  - Event Details (date, number of days, location)
  - Services Selection (from catalog)
  - Budget & Preferences
  - Meta ads tracking fields (hidden)

## Phase 2: Form UI/UX

### Form Layout
- Multi-step wizard or single-page
- Responsive design with validation feedback
- Real-time service pricing calculations
- Smart defaults for common scenarios

### Form Fields
```
Client Information:
- Full Name (required)
- Email (required)
- Phone (optional but recommended)
- Bride's Name (optional)
- Groom's Name (optional)

Event Details:
- Event Type (dropdown from event_types catalog)
- Event Date (optional for initial enquiries)
- Duration/Number of Days (optional)
- Location (required)
- Venue type (optional)

Services:
- Wedding photography services (checkboxes from catalog)
- Package preferences
- Specific requests (optional)

Budget & Preferences:
- Budget range (optional)
- Preferred photography style
- Timeline/urgency

Marketing:
- How did you hear about us?
- Source tracking (UTM parameters from URL)
```

### UI Features
- Auto-save draft enquiries
- Progressive form disclosure
- Service preview with pricing
- Location autocomplete if available
- Mobile-optimized form

## Phase 3: Integration & Automation

### Lead Management
- Auto-tag enquiries based on services and budget
- Assign to appropriate sales representative
- Priority scoring based on budget and urgency
- Follow-up automation

### Meta Ads Integration
- Form hidden fields for UTM parameters
- Google Analytics tracking
- Facebook Pixel for conversion tracking
- Campaign-specific form URLs

### Workflow
1. Client submits enquiry
2. System validates and stores
3. Auto-email confirmation sent
4. Sales team notified (email/SMS)
5. Enquiry added to CRM system
6. Follow-up scheduled automatically

### Automation Features
- Duplicate detection (same email/phone + event)
- Auto-reminder for unresponded enquiries
- Escalation for high-value enquiries
- Task assignment and workflow tracking

## Phase 4: Analytics & Reporting

### Enquiry Management
- Dashboard with enquiry stats
- Funnel analysis (new → contacted → converted)
- Source tracking (organic, paid, referral)
- Conversion rates by service

### Filters & Search
- By date range
- By service type
- By source/medium
- By status
- By assignee

### Reporting
- Daily/Monthly enquiry reports
- Conversion by source
- Lead time analysis
- Service popularity metrics

## Success Criteria

### Functional
- ✅ Enquiry form accepts all required fields
- ✅ Service selection and pricing works
- ✅ Meta tracking integration functional
- ✅ Email notifications sent
- ✅ Admin dashboard shows enquiry stats
- ✅ Filters and search work
- ✅ Export functionality for reports
- ✅ Mobile responsive design

### UX
- ✅ Clear, intuitive form layout
- ✅ Real-time validation feedback
- ✅ Progress indicators for multi-step
- ✅ Mobile-friendly on all screen sizes
- ✅ Accessibility compliant (WCAG 2.1)

## Implementation Strategy

### Week 1: Backend Foundation
```bash
# Run tests to establish baseline
pnpm test:backend
pnpm test:frontend
```

### Week 2-3: Core Features
- Database schema and migrations
- Validation schemas
- Service endpoints
- Basic enquiry form

### Week 4: UI/UX Polish
- Form layout and styling
- Service selection UI
- Validation feedback
- Responsive design

### Week 5: Integration
- Email notifications
- Meta tracking
- Analytics dashboard
- Export functionality

### Week 6: Testing & Deployment
- Manual testing
- Automated tests
- UAT
- Production deployment

## Files to Modify

### Backend
- `db/schema.ts` - enquiries table
- `schemas/enquiries.ts` - validation
- `services/enquiries.ts` - business logic
- `routes/enquiries.ts` - API endpoints
- `services/email.ts` - notification system

### Frontend
- `pages/Enquiries.tsx` - main component
- `types/enquiries.ts` - TypeScript types
- `components/EnquiryForm.tsx` - form component
- `components/EnquiryDashboard.tsx` - admin dashboard
- `hooks/useEnquiries.ts` - custom hook

### Supporting Files
- `auth/enquiryMiddleware.ts` - rate limiting/authentication
- `scripts/enquirySeeder.ts` - sample data
- `package.json` - additional dependencies (email libraries, etc.)

## Dependencies
- Backend: Nodemailer or similar for email
- Frontend: Form libraries (React Hook Form or similar)
- Analytics: Google Analytics, Facebook Pixel
- Database: Drizzle ORM for PostgreSQL

## Testing Strategy
- Unit tests for validation schemas
- Integration tests for API endpoints
- E2E tests for form submission
- Accessibility testing
- Performance testing

## Technical Considerations

### Security
- Rate limiting on enquiry submission
- Input sanitization and validation
- Email verification for follow-ups
- GDPR compliance for data storage

### Performance
- Efficient database queries
- Caching for frequent enquiries
- Lazy loading for service catalog

### Scalability
- Database indexing for enquiries table
- Queue system for email notifications
- Load balancing for high traffic

### Monitoring
- Logging of enquiry submissions
- Error tracking
- Performance monitoring
- Uptime monitoring

## Next Steps
1. Begin with backend schema and validation
2. Create basic enquiry form
3. Implement email notifications
4. Add Meta tracking integration
5. Build admin dashboard
6. Test thoroughly before deployment

This enquiries page will serve as a crucial lead generation tool for the wedding photography business, bridging the gap between potential clients and the proposal generation system.