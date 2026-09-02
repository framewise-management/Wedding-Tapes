# Software Requirements Specification (SRS)
# Wedding Photography Proposal Generator — Small-Scope MVP

**Document Version:** 1.0  
**Status:** MVP Specification  
**Date:** 31 August 2026

---

# 1. Introduction

## 1.1 Purpose

This Software Requirements Specification (SRS) defines the functional and non-functional requirements for a small-scope Wedding Photography Proposal Generator.

The system is intended to help wedding photography businesses create customer-ready quotations/proposals quickly by combining reusable packages, individual services, and optional add-ons.

The primary business outcome is to reduce the time and manual effort required to prepare a wedding photography quotation.

---

## 1.2 Business Problem

Wedding photography businesses commonly receive customer inquiries such as:

> "I need photography and video for my wedding. What packages do you have?"

or:

> "We have a two-day wedding and want photo and video. Our budget is around ₹1 lakh."

The salesperson may need to manually:

1. Understand customer requirements.
2. Check available services.
3. Check package prices.
4. Combine multiple packages/services.
5. Calculate the total.
6. Apply discounts.
7. Prepare a quotation.
8. Format the quotation.
9. Send it to the customer.

This creates unnecessary manual work and can lead to inconsistent quotations or calculation errors.

---

## 1.3 Product Goal

The MVP shall provide a simple workflow:

```text
Customer
   ↓
Wedding Details
   ↓
Packages / Services
   ↓
Pricing
   ↓
Proposal Preview
   ↓
PDF Proposal
```

The target is to allow a salesperson to create a professional proposal in approximately **2–5 minutes**.

---

# 2. Product Scope

## 2.1 In Scope

The MVP shall include:

- User authentication
- Business profile
- Customer creation and management
- Wedding details
- Service management
- Package management
- Multiple packages in one proposal
- Individual services in a proposal
- Optional services/add-ons
- Pricing calculation
- Fixed amount or percentage discount
- Proposal creation
- Proposal editing
- Proposal preview
- PDF generation
- Proposal history
- Proposal status

---

## 2.2 Out of Scope

The MVP shall not include:

- Online payments
- Customer accounts
- E-signatures
- Contract management
- Booking management
- Full CRM
- WhatsApp Business API
- Automated email campaigns
- Automated follow-ups
- Advanced analytics
- Complex AI chatbot
- Marketplace functionality
- Multi-language support
- Multi-currency support
- Advanced taxation rules
- Inventory management

AI requirement extraction may be added later and is not required for the core MVP.

---

# 3. Users and Roles

## 3.1 Business Owner / Admin

The business owner can:

- Manage business information.
- Manage services.
- Manage packages.
- Create proposals.
- View proposals.
- Edit proposals.
- Apply discounts.
- Generate PDFs.

---

## 3.2 Sales User

A sales user can:

- Create customers.
- Create proposals.
- Select packages.
- Add services.
- Add optional services.
- Apply allowed discounts.
- Generate proposals.
- View proposal history.

The MVP may initially use a single authenticated user role to reduce implementation complexity.

---

# 4. High-Level System Workflow

```text
                    ┌────────────────────┐
                    │       Login        │
                    └─────────┬──────────┘
                              ↓
                    ┌────────────────────┐
                    │     Dashboard      │
                    └─────────┬──────────┘
                              ↓
                    ┌────────────────────┐
                    │ Create Proposal    │
                    └─────────┬──────────┘
                              ↓
                    ┌────────────────────┐
                    │ Customer Details   │
                    └─────────┬──────────┘
                              ↓
                    ┌────────────────────┐
                    │ Wedding Details    │
                    └─────────┬──────────┘
                              ↓
              ┌───────────────┴────────────────┐
              ↓                                ↓
      ┌───────────────┐                ┌───────────────┐
      │   Packages    │                │   Services    │
      └───────┬───────┘                └───────┬───────┘
              └───────────────┬────────────────┘
                              ↓
                    ┌────────────────────┐
                    │  Pricing Engine    │
                    └─────────┬──────────┘
                              ↓
                    ┌────────────────────┐
                    │ Proposal Preview   │
                    └─────────┬──────────┘
                              ↓
                    ┌────────────────────┐
                    │   Generate PDF     │
                    └────────────────────┘
```

---

# 5. Functional Requirements

# FR-001 Authentication

## Description

The system shall authenticate authorized users before allowing access to business data.

## Requirements

- User shall enter email and password.
- System shall validate credentials.
- Invalid credentials shall return an error.
- Authenticated users shall receive an authenticated session/token.
- User shall be able to log out.

## Validation

- Email is required.
- Password is required.
- Invalid credentials shall not reveal whether the email exists.

---

# FR-002 Business Profile

## Description

The system shall maintain business information used in proposals.

## Fields

- Business name
- Logo
- Phone
- Email
- Address
- Website
- Default proposal validity
- Default terms and conditions

## Requirements

- Admin shall be able to update business information.
- Business information shall appear on generated proposals.
- Logo shall be used in the proposal header when available.

---

# FR-003 Customer Management

## Description

The system shall allow users to create and manage customers.

## Customer Fields

```text
id
name
phone
email
address
notes
created_at
updated_at
```

## Requirements

- User shall create a customer.
- User shall edit a customer.
- User shall view customer details.
- User shall search customers.
- A customer may have multiple proposals.

## Validation

- Name is required.
- Phone is required.
- Email is optional.
- If email is provided, it must be valid.
- Duplicate customers may be allowed in MVP to avoid complex deduplication.

---

# FR-004 Wedding Details

## Description

A proposal shall contain basic wedding information.

## Fields

- Wedding date
- Wedding location
- Number of days
- Notes

## Optional Event Information

The MVP may support multiple events associated with a proposal.

Example:

```text
Haldi
Wedding
Reception
```

Each event may contain:

- Event name
- Date
- Location

If implementation needs to remain extremely small, event-level details can initially be represented through proposal notes.

---

# FR-005 Service Management

## Description

The system shall provide a service catalog.

## Service Fields

```text
id
business_id
name
category
description
price
unit
active
created_at
updated_at
```

## Example Services

```text
Candid Photography
Traditional Photography
Cinematic Videography
Drone
Premium Album
Extra Photographer
Extra Videographer
```

## Requirements

- Admin shall create services.
- Admin shall edit services.
- Admin shall deactivate services.
- Admin shall reactivate services.
- Inactive services shall not appear as new selections.
- Existing proposals containing an inactive service shall remain unchanged.

---

# FR-006 Package Management

## Description

The system shall provide a package manager for reusable packages.

A package is a predefined collection of services with a package-level price.

## Package Fields

```text
id
business_id
name
description
price
active
created_at
updated_at
```

## Package-Service Relationship

A package shall contain multiple services.

```text
Package
   |
   +---- PackageService ---- Service
   |
   +---- PackageService ---- Service
   |
   +---- PackageService ---- Service
```

Therefore:

- One package can contain many services.
- One service can belong to many packages.

This is a many-to-many relationship.

## Requirements

Admin shall be able to:

- Create package.
- Edit package.
- Add services to package.
- Remove services from package.
- Set service quantity within package.
- Set package price.
- Activate/deactivate package.

## Example

```text
Gold Package
Price: ₹1,25,000

Services:
- Candid Photography × 2
- Cinematic Videography × 2
- Premium Album × 1
- Highlight Film × 1
```

---

# FR-007 Multiple Packages Per Proposal

## Description

A proposal shall support multiple packages.

This is a critical MVP requirement.

## Example

```text
Proposal
 |
 +-- Wedding Photography Package   ₹80,000
 |
 +-- Videography Package           ₹60,000
 |
 +-- Drone Add-on                  ₹10,000
```

## Requirements

- User can add one or more packages.
- User can remove a package.
- User can change package quantity where permitted.
- Each selected package shall contribute to the proposal total.
- The same package may be selected more than once only if package quantity is supported.
- Multiple different packages can exist in the same proposal.

---

# FR-008 Individual Services in Proposal

## Description

The user shall be able to add individual services independently of packages.

## Example

```text
Gold Package                 ₹1,25,000
Extra Photographer            ₹8,000
Drone                        ₹10,000
```

## Requirements

- User shall search/select an active service.
- User shall specify quantity.
- System shall calculate line total.
- User shall remove a service.
- Service price shall be captured as a proposal snapshot.

---

# FR-009 Optional Services

## Description

The proposal shall support optional services that are shown to the customer but are not included in the primary total.

## Example

```text
Included
Candid Photography           ₹40,000
Videography                  ₹30,000

Optional
Drone                        ₹10,000
Pre-Wedding Shoot            ₹20,000
```

## Requirements

- User can mark a proposal item as optional.
- Optional items shall not be included in the final total.
- Optional items shall appear separately in the proposal.
- User can convert an optional service into an included service.

---

# FR-010 Proposal Creation

## Description

The user shall be able to create a proposal.

## Minimum Required Information

- Customer
- Wedding date
- Wedding location
- At least one package or service

## Proposal Number

The system shall generate a unique proposal number.

Example:

```text
WP-2026-0001
WP-2026-0002
```

The exact numbering format may be configured later.

---

# FR-011 Proposal Pricing

## Description

The pricing engine shall calculate proposal totals.

## Line Calculation

```text
Line Total = Quantity × Unit Price
```

## Package Calculation

```text
Package Total = Package Quantity × Package Price
```

## Proposal Calculation

```text
Included Packages
+ Included Services
- Discount
+ Tax
= Final Total
```

Optional services are excluded from the main total.

## Example

```text
Photography Package       ₹80,000
Videography Package       ₹60,000
Drone                     ₹10,000
----------------------------------
Subtotal                ₹1,50,000

Discount                  ₹10,000
----------------------------------
Final Total              ₹1,40,000
```

---

# FR-012 Discount

The MVP shall support:

- Fixed amount discount
- Percentage discount

## Example

```text
Subtotal: ₹1,20,000
Discount: 10%
Discount Amount: ₹12,000
Final Total: ₹1,08,000
```

## Requirements

- Discount cannot make the final amount negative.
- Discount must be validated on the backend.
- Maximum discount rules may be configured later.

---

# FR-013 Tax

Tax support should be simple in the MVP.

The business may configure a tax percentage.

Example:

```text
Subtotal       ₹1,00,000
Discount         ₹5,000
Taxable Total   ₹95,000
Tax 18%         ₹17,100
Final Total    ₹1,12,100
```

If the business does not use tax, the tax rate can be set to 0%.

Complex tax rules are out of scope.

---

# FR-014 Proposal Editing

A proposal in DRAFT status shall be editable.

The user shall be able to:

- Change customer information.
- Change wedding information.
- Add/remove packages.
- Add/remove services.
- Change quantities.
- Change discount.
- Change notes.
- Recalculate the total.

Once a proposal is sent, the MVP may restrict direct editing and require creating a new version or copying the proposal.

---

# FR-015 Proposal Preview

The system shall provide a customer-facing preview before PDF generation.

Preview shall contain:

```text
Business Information

Customer Information

Wedding Information

Selected Packages

Selected Services

Optional Services

Subtotal

Discount

Tax

Final Total

Terms & Conditions
```

The preview should closely match the final PDF.

---

# FR-016 PDF Generation

The system shall generate a PDF from the proposal.

## PDF Requirements

The PDF shall contain:

- Business logo
- Business name
- Business contact details
- Proposal number
- Proposal date
- Customer details
- Wedding details
- Packages
- Services
- Optional services
- Pricing
- Discount
- Tax
- Final total
- Terms and conditions

The generated PDF shall be downloadable.

---

# FR-017 Proposal History

The system shall maintain a list of proposals.

## List Fields

- Proposal number
- Customer
- Wedding date
- Total
- Status
- Created date
- Updated date

## Search/Filter

MVP should support basic:

- Customer search
- Status filter

---

# FR-018 Proposal Status

Supported statuses:

```text
DRAFT
SENT
ACCEPTED
REJECTED
```

## Status Rules

### DRAFT

Can be edited.

### SENT

Proposal has been generated/shared with customer.

### ACCEPTED

Customer has accepted the proposal.

### REJECTED

Customer has rejected the proposal.

Customer-facing acceptance/rejection functionality is not required in MVP; users may update the status manually.

---

# FR-019 Dashboard

The dashboard shall provide a basic overview.

## Dashboard Information

- Total proposals
- Draft proposals
- Sent proposals
- Accepted proposals
- Recent proposals

## Primary Action

```text
+ New Proposal
```

The dashboard should prioritize proposal creation rather than analytics.

---

# 6. Proposal Data Model

## 6.1 Proposal

A proposal contains the customer, wedding information, pricing, and status.

```text
Proposal
---------
id
business_id
customer_id
proposal_number
wedding_date
wedding_location
status
subtotal
discount_type
discount_value
discount_amount
tax_rate
tax_amount
total
valid_until
notes
created_at
updated_at
```

---

## 6.2 Proposal Package

A proposal package represents a package selected for a specific proposal.

```text
ProposalPackage
----------------
id
proposal_id
package_id
package_name
package_description
quantity
unit_price
total
created_at
```

The name, description, and price are stored as a snapshot.

This prevents future package changes from changing historical proposals.

---

## 6.3 Proposal Item

Individual services are stored as proposal items.

```text
ProposalItem
------------
id
proposal_id
service_id
service_name
description
quantity
unit_price
total
is_optional
created_at
```

The service name and price are stored as a snapshot.

---

# 7. Database Relationships

```text
Business
   |
   +--------------------+
   |                    |
   ↓                    ↓
Users                Customers
                         |
                         ↓
                    Proposals
                    /                          /                           ↓           ↓
        ProposalPackages   ProposalItems
               |                 |
               ↓                 ↓
            Packages          Services
               |
               ↓
        PackageServices
               |
               ↓
            Services
```

## Relationship Summary

```text
Business 1 → N Users
Business 1 → N Customers
Business 1 → N Services
Business 1 → N Packages
Customer 1 → N Proposals
Proposal 1 → N ProposalPackages
Proposal 1 → N ProposalItems
Package N → N Services
```

---

# 8. API Specification

All APIs shall use JSON.

## 8.1 Authentication

### Login

```http
POST /api/auth/login
```

Request:

```json
{
  "email": "user@example.com",
  "password": "password"
}
```

Response:

```json
{
  "token": "..."
}
```

---

## 8.2 Customers

```http
GET    /api/customers
POST   /api/customers
GET    /api/customers/:id
PUT    /api/customers/:id
DELETE /api/customers/:id
```

---

## 8.3 Services

```http
GET    /api/services
POST   /api/services
GET    /api/services/:id
PUT    /api/services/:id
DELETE /api/services/:id
```

---

## 8.4 Packages

```http
GET    /api/packages
POST   /api/packages
GET    /api/packages/:id
PUT    /api/packages/:id
DELETE /api/packages/:id
```

### Add service to package

```http
POST /api/packages/:id/services
```

### Remove service from package

```http
DELETE /api/packages/:id/services/:serviceId
```

---

## 8.5 Proposals

```http
GET    /api/proposals
POST   /api/proposals
GET    /api/proposals/:id
PUT    /api/proposals/:id
DELETE /api/proposals/:id
```

### Calculate proposal

```http
POST /api/proposals/:id/calculate
```

### Generate PDF

```http
POST /api/proposals/:id/generate-pdf
```

### Change status

```http
PATCH /api/proposals/:id/status
```

---

# 9. API Proposal Example

## Create Proposal

```http
POST /api/proposals
```

Request:

```json
{
  "customer_id": "customer-123",
  "wedding_date": "2026-12-12",
  "wedding_location": "Nagpur",
  "packages": [
    {
      "package_id": "package-1",
      "quantity": 1
    },
    {
      "package_id": "package-2",
      "quantity": 1
    }
  ],
  "items": [
    {
      "service_id": "service-10",
      "quantity": 1,
      "is_optional": false
    },
    {
      "service_id": "service-20",
      "quantity": 1,
      "is_optional": true
    }
  ],
  "discount": {
    "type": "PERCENTAGE",
    "value": 10
  }
}
```

---

# 10. UI Requirements

## 10.1 Dashboard

The dashboard should have:

```text
Wedding Proposal Generator

[ + New Proposal ]

Proposals
--------------------------------
Draft       5
Sent        8
Accepted    3
Rejected    1

Recent Proposals
--------------------------------
WP-2026-001
Rahul & Priya
₹1,20,000
Sent
```

---

## 10.2 Create Proposal

The proposal creation page should use a simple step-based or section-based workflow.

### Section 1 — Customer

```text
Select Customer
[ + New Customer ]
```

### Section 2 — Wedding

```text
Wedding Date
Location
Number of Days
```

### Section 3 — Packages

```text
Available Packages

[Silver]     ₹75,000     [Add]
[Gold]       ₹1,25,000   [Add]
[Platinum]   ₹1,80,000   [Add]

Selected Packages

Gold Package              ₹1,25,000
Videography Package         ₹60,000

[+ Add Package]
```

### Section 4 — Services

```text
Individual Services

Candid Photography
Traditional Photography
Drone
Premium Album

[+ Add Service]
```

### Section 5 — Optional Services

```text
Drone                       ₹10,000
Pre-Wedding Shoot           ₹20,000
Extra Photographer           ₹8,000
```

### Section 6 — Pricing

```text
Subtotal                   ₹1,50,000
Discount                    ₹10,000
Tax                         ₹0
--------------------------------
Total                     ₹1,40,000
```

### Section 7 — Actions

```text
[Save Draft]
[Preview Proposal]
```

---

# 11. Validation Requirements

## Customer

- Name required.
- Phone required.
- Email format validated when supplied.

## Wedding

- Wedding date required.
- Location required.

## Package

- Package must be active when newly selected.
- Quantity must be greater than zero.

## Service

- Service must be active when newly selected.
- Quantity must be greater than zero.

## Pricing

- Price cannot be negative.
- Discount cannot produce a negative subtotal.
- Tax rate cannot be negative.
- Final total cannot be negative.

---

# 12. Error Handling

The API shall return consistent errors.

Example:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Wedding date is required"
  }
}
```

Common error types:

```text
VALIDATION_ERROR
UNAUTHORIZED
FORBIDDEN
NOT_FOUND
CONFLICT
INTERNAL_ERROR
```

The frontend shall display user-friendly messages rather than raw server errors.

---

# 13. Security Requirements

## Authentication

- Passwords must be securely hashed.
- Authentication tokens/sessions must be protected.
- Logout must invalidate the session where applicable.

## Authorization

Users must only access data belonging to their business.

Example:

```text
Business A
   ↓
Customers A
Services A
Packages A
Proposals A
```

Business A must never access Business B's data.

## Pricing Security

The frontend shall not be trusted for final pricing.

The backend shall retrieve and validate:

- Service prices
- Package prices
- Quantities
- Discounts
- Tax

before calculating the final proposal.

---

# 14. Historical Data / Price Snapshot Rule

This is a critical requirement.

Suppose:

```text
Gold Package
Current Price = ₹1,25,000
```

A proposal is created with the package.

Later:

```text
Gold Package
New Price = ₹1,40,000
```

The old proposal must continue to show:

```text
Gold Package
₹1,25,000
```

Therefore proposal records must store snapshots of:

- Package name
- Package description
- Package price
- Service name
- Service description
- Service price

---

# 15. Non-Functional Requirements

## Performance

- Dashboard should load within approximately 2 seconds under normal MVP conditions.
- Proposal calculation should return within approximately 1 second under normal conditions.
- PDF generation should normally complete within a few seconds.

## Availability

The MVP should be deployed on reliable managed infrastructure.

## Scalability

The architecture should allow additional businesses, users, services, packages, and proposals without redesigning the core data model.

## Usability

- Proposal creation should require minimal navigation.
- Primary actions should be clearly visible.
- Pricing totals should always be visible during proposal creation.
- Forms should provide clear validation messages.

## Maintainability

- Use modular backend services.
- Separate pricing logic from controllers/routes.
- Keep PDF generation separate from proposal calculation.
- Use database migrations.
- Use environment variables for secrets/configuration.

---

# 16. Recommended Architecture

```text
┌───────────────────────────────┐
│           Frontend            │
│      React / Next.js          │
└───────────────┬───────────────┘
                │
                │ HTTPS / JSON
                ↓
┌───────────────────────────────┐
│          Backend API          │
│       Node.js / TypeScript    │
├───────────────────────────────┤
│ Auth Service                  │
│ Customer Service              │
│ Service Catalog               │
│ Package Service               │
│ Proposal Service              │
│ Pricing Engine                │
│ PDF Service                   │
└───────────────┬───────────────┘
                │
                ↓
┌───────────────────────────────┐
│          PostgreSQL           │
└───────────────────────────────┘
```

---

# 17. Pricing Engine Design

The pricing engine should be isolated as a dedicated backend module.

Example:

```text
Proposal
   ↓
Load Packages
   ↓
Load Services
   ↓
Validate Prices
   ↓
Calculate Package Totals
   ↓
Calculate Service Totals
   ↓
Exclude Optional Items
   ↓
Calculate Subtotal
   ↓
Apply Discount
   ↓
Calculate Tax
   ↓
Calculate Final Total
```

### Example pseudocode

```text
packageTotal = sum(package.quantity * package.unitPrice)

serviceTotal = sum(
    item.quantity * item.unitPrice
    where item.isOptional = false
)

subtotal = packageTotal + serviceTotal

discountAmount = calculateDiscount(
    subtotal,
    discountType,
    discountValue
)

taxableAmount = subtotal - discountAmount

taxAmount = taxableAmount * taxRate

total = taxableAmount + taxAmount
```

The pricing engine should have automated unit tests because pricing is business-critical.

---

# 18. Proposal PDF Requirements

The PDF should use a consistent template.

## Page Structure

```text
Header
Business Logo
Business Name
Contact Details

Customer Details

Wedding Details

Selected Packages

Individual Services

Optional Services

Pricing Summary

Terms & Conditions

Footer
```

The template should be designed so long service descriptions do not break the layout.

---

# 19. MVP User Stories

## Authentication

**US-001**

As a business user, I want to log in so that only authorized users can access proposals.

---

## Customer

**US-002**

As a salesperson, I want to create a customer so that I can prepare a proposal.

**US-003**

As a salesperson, I want to search existing customers so that I don't have to recreate customer information.

---

## Services

**US-004**

As an admin, I want to create services so that they can be used in proposals.

**US-005**

As an admin, I want to update service prices so that quotations use current pricing.

---

## Packages

**US-006**

As an admin, I want to create packages containing multiple services.

**US-007**

As an admin, I want to update package prices.

**US-008**

As a salesperson, I want to select multiple packages for a proposal.

---

## Proposal

**US-009**

As a salesperson, I want to create a proposal for a customer.

**US-010**

As a salesperson, I want to add individual services to a proposal.

**US-011**

As a salesperson, I want to add optional services so customers can see additional options.

**US-012**

As a salesperson, I want the system to calculate the total automatically.

**US-013**

As a salesperson, I want to apply a discount.

**US-014**

As a salesperson, I want to preview the proposal before sending it.

**US-015**

As a salesperson, I want to generate a PDF proposal.

**US-016**

As a salesperson, I want to see proposal history.

---

# 20. Acceptance Criteria

The MVP shall be considered functionally complete when the following scenario works end-to-end.

## Scenario

A salesperson receives:

```text
Customer: Rahul & Priya
Wedding Date: 12 December 2026
Location: Nagpur
```

The salesperson:

1. Logs in.
2. Selects/creates Rahul & Priya.
3. Enters wedding details.
4. Selects Wedding Photography Package.
5. Selects Videography Package.
6. Adds Drone as an individual service.
7. Adds Pre-Wedding Shoot as an optional service.
8. Applies a discount.
9. Reviews the calculated price.
10. Previews the proposal.
11. Generates the PDF.
12. Saves the proposal as SENT.
13. Finds the proposal later in Proposal History.

The generated PDF must contain the correct customer, package, service, optional service, discount, and final pricing information.

---

# 21. MVP Definition of Done

The MVP is ready for pilot use when:

- Authentication works.
- Business profile can be configured.
- Services can be created and managed.
- Multiple packages can be created and managed.
- Packages can contain multiple services.
- A proposal can contain multiple packages.
- A proposal can contain individual services.
- Optional services work correctly.
- Pricing is calculated on the backend.
- Discounts work correctly.
- Historical proposal prices remain unchanged after catalog price changes.
- Proposals can be saved and edited.
- Proposal status can be updated.
- PDF generation works.
- Proposal history works.
- Core validation and authorization are implemented.
- End-to-end acceptance scenario passes.

---

# 22. MVP Development Priority

## P0 — Must Have

```text
Authentication
Business Profile
Customer
Service Manager
Package Manager
Multiple Packages per Proposal
Individual Services
Pricing Engine
Proposal Creation
Proposal Preview
PDF Generation
Proposal History
```

## P1 — Useful but Secondary

```text
Optional Services
Discount
Tax
Search/filter
Proposal status
```

## P2 — Future

```text
AI requirement extraction
WhatsApp integration
Email integration
Online payment
Customer portal
Proposal acceptance
Analytics
CRM
Automated follow-up
```

---

# 23. Recommended MVP Delivery Plan

## Sprint 1 — Foundation

- Project setup
- Database
- Authentication
- Business profile
- Basic UI layout

## Sprint 2 — Catalog

- Service manager
- Package manager
- Package-service relationship
- Basic CRUD APIs

## Sprint 3 — Proposal

- Customer management
- Wedding details
- Multiple package selection
- Individual services
- Optional services
- Pricing engine

## Sprint 4 — Output

- Proposal preview
- PDF generation
- Proposal history
- Status
- Validation
- Testing

---

# 24. Future AI Extension

AI should be added after the core MVP is validated.

Future workflow:

```text
Customer Message
        ↓
AI Requirement Extraction
        ↓
Structured Requirements
        ↓
Service / Package Matching
        ↓
Salesperson Confirmation
        ↓
Pricing Engine
        ↓
Proposal
```

Example input:

> "We have a two-day wedding. We need photo and video and our budget is around ₹1 lakh."

AI output:

```json
{
  "duration_days": 2,
  "services": [
    "Photography",
    "Videography"
  ],
  "budget": 100000
}
```

The salesperson must confirm extracted requirements before the proposal is finalized.

AI must not be the authority for financial calculations.

---

# 25. Key Product Principle

The MVP should optimize for one business outcome:

> **Turn a customer inquiry into a professional quotation as quickly as possible.**

The system should therefore prioritize:

```text
Speed
+
Simple Service/Package Selection
+
Accurate Pricing
+
Professional Proposal
```

rather than adding CRM, payment, communication, or advanced AI features too early.

---

# 26. Final MVP Scope Statement

The Wedding Photography Proposal Generator MVP is a lightweight internal sales tool that enables a photography business to manage services and reusable packages, create proposals containing multiple packages and individual services, calculate accurate pricing, and generate professional PDF quotations.

The MVP intentionally excludes advanced CRM, payment, communication automation, and AI features so that the core quotation workflow can be validated quickly and economically.
