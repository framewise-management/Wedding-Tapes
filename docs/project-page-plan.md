# Project Page Implementation Plan

## Overview
Create a comprehensive project page for the Wedding Photography Proposal Generator web app that supports multi-event (multi-day) proposals with proper event organization, display, and management.

## Phase 1: Foundation Verification

### Backend
- Verify `/api/proposals/:id` endpoint returns complete proposal with all relations (customer, packages, items, events)
- Test that snapshot data (price, name, description) is preserved from catalog
- Ensure event assignment works correctly with nullable event assignments
- Validate pricing calculation for multi-event proposals

### Frontend
- Verify `ProposalPreview` loads all required data (proposal + business)
- Test event grouping in `ProposalSheet` 
- Confirm PDF generation respects event assignments
- Validate that all actions work (edit, share, download, status change)

## Phase 2: Enhanced Project Page Features

### Core UI/UX Improvements
- Add event timeline at top (show date, name, location for each event)
- Group services by event under clear headings
- Show "All events" section for unassigned items
- Add event badges/labels to proposal cards in history list

### Navigation & Context
- Add "Events" tab to main navigation
- Show proposal date range in breadcrumbs
- Display summary stats (e.g., "3 events, 5 packages, 2 services")
- Add export options per event (PDF for specific events)

### Share & Collaboration
- Enable per-event sharing (link to specific event section)
- Add event selection in share menu
- Track views per event
- Add event-level access controls

## Phase 3: Advanced Features

### Multi-event specific functionality
- Calendar sync that shows all events
- Timeline view (day-by-day breakdown)
- Event-specific notes/comments
- Per-event discount application
- Event-based pricing variations

### Data Management
- Bulk event operations (add/remove multiple events)
- Event reordering (drag & drop)
- Event duplication
- Template events for common event types

## Implementation Strategy

### 1. Immediate Validation (Day 1)
```bash
pnpm test:frontend
pnpm test:backend
```

### 2. UI Polish (Day 2-3)
- Update `ProposalPreview.css` with event styling
- Add event timeline component
- Improve `ProposalSheet` event grouping

### 3. Backend Enhancements (Day 3-4)
- Add `/api/proposals/:id/events` endpoint
- Update event grouping in services
- Add event snapshotting

### 4. Frontend Integration (Day 5-6)
- Integrate new event data
- Update routing (add `/proposals/:id/events` route)
- Add event selector components

### 5. Testing & Validation (Day 7)
- Comprehensive test suite for multi-event
- Manual testing of end-to-end flow
- Performance testing for large proposals

## Success Criteria

### Functional
- ✅ Proposals with multiple events display correctly
- ✅ Events render in chronological order
- ✅ All CRUD operations work per event
- ✅ PDF generation respects event grouping
- ✅ Calendar sync shows all events
- ✅ Share functionality works per event

### UX
- ✅ Clear visual distinction between events
- ✅ Easy navigation between events
- ✅ Responsive design for mobile
- ✅ Accessibility compliant

## Files to Modify

### Backend
- `db/schema.ts` - Add eventTypeId to proposalPackages and proposalItems
- `schemas/proposals.ts` - Add proposalEventId to schemas
- `services/proposals.ts` - Add event validation and grouping
- `routes/proposals.ts` - Add event endpoints
- `pdf.ts` - Update rendering to handle events
- `services/calendar.ts` - Update calendar event generation

### Frontend
- `types/proposal.ts` - Add ProposalEvent type and update Proposal
- `pages/CreateProposal.tsx` - Add event assignment UI
- `pages/ProposalPreview.tsx` - Update project page with events
- `pages/ProposalHistory.tsx` - Add event display in table
- `pages/Calendar.tsx` - Update to show multiple events
- `components/ProposalSheet.tsx` - Add event grouping

## Dependencies
- React, TypeScript, Tailwind CSS
- Hono (backend framework)
- Drizzle ORM (Supabase Postgres)
- Zod (validation)
- pdfkit (PDF generation)

## Testing
- Unit tests for event validation and grouping
- Integration tests for end-to-end multi-event flow
- Manual testing of UI components
- Performance testing for large proposals

## Next Steps
1. Run existing tests to establish baseline
2. Begin Phase 1 validation
3. Implement changes incrementally
4. Test after each phase
5. Final integration and UAT