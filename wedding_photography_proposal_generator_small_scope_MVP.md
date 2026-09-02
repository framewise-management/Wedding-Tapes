# Wedding Photography Proposal Generator
## Small-Scope MVP

### 1. MVP Objective

Build a lightweight web application that allows a photography business to quickly create a professional wedding quotation.

**Core workflow:**

Customer → Select Packages/Services → Calculate Price → Preview Proposal → Generate PDF

The target is to create a proposal in **2–5 minutes**.

---

## 2. MVP Scope

### 2.1 Customer

Capture basic customer information:

- Name
- Phone
- Email
- Wedding date
- Wedding location

No CRM functionality is required in the MVP.

---

### 2.2 Service Manager

The business can manage individual services.

Each service contains:

- Service name
- Category
- Description
- Price
- Active/inactive status

Example:

| Service | Price |
|---|---:|
| Candid Photography | ₹40,000 |
| Traditional Photography | ₹20,000 |
| Cinematic Video | ₹30,000 |
| Drone | ₹10,000 |
| Premium Album | ₹15,000 |

---

### 2.3 Package Manager

The business can create and manage multiple reusable packages.

Each package contains:

- Package name
- Description
- Included services
- Package price
- Active/inactive status

Example:

| Package | Price |
|---|---:|
| Silver Package | ₹75,000 |
| Gold Package | ₹1,25,000 |
| Platinum Package | ₹1,80,000 |

### Multiple Packages

A single proposal can contain multiple packages.

Example:

```text
Wedding Photography Package    ₹80,000
Wedding Videography Package    ₹60,000
Drone Add-on                   ₹10,000
--------------------------------------
Total                         ₹1,50,000
```

The proposal can also combine packages with individual services.

---

## 3. Create Proposal

The main MVP workflow is:

```text
Create Proposal
      ↓
Select Customer
      ↓
Enter Wedding Details
      ↓
Select One or More Packages
      ↓
Add Individual Services
      ↓
Add Optional Services
      ↓
Apply Discount
      ↓
Calculate Total
      ↓
Preview Proposal
      ↓
Generate PDF
```

---

## 4. Pricing

The system calculates the proposal amount automatically.

```text
Package Total
+ Individual Services
+ Add-ons
- Discount
= Final Amount
```

All final pricing calculations should be performed by the backend.

---

## 5. Proposal Preview

The proposal should display:

- Business information
- Customer information
- Wedding details
- Selected packages
- Individual services
- Optional services
- Discount
- Final price
- Terms & conditions

The user should be able to review the proposal before generating the final PDF.

---

## 6. PDF Generation

The MVP should provide one professional proposal template.

The user can:

- Generate PDF
- Download PDF
- Share the generated proposal manually

The proposal should contain the business logo and business contact information.

---

## 7. Proposal History

Provide a simple proposal list.

Example:

| Customer | Wedding Date | Amount | Status |
|---|---|---:|---|
| Rahul | 12 Dec 2026 | ₹1,20,000 | Draft |
| Priya | 18 Dec 2026 | ₹85,000 | Sent |

### Status

- Draft
- Sent
- Accepted
- Rejected

Users should be able to open and continue editing draft proposals.

---

## 8. MVP Screens

Keep the MVP to approximately six main screens:

### 1. Login

- Email
- Password
- Login

### 2. Dashboard

- New Proposal
- Recent Proposals
- Basic proposal statistics

### 3. Create Proposal

- Customer
- Wedding details
- Requirements

### 4. Package & Service Selection

- Available packages
- Multiple package selection
- Individual services
- Optional services

### 5. Proposal Preview

- Complete customer-facing proposal
- Edit
- Generate PDF

### 6. Proposal History

- Previous proposals
- Status
- Amount
- Date
- Open/edit proposal

Service and Package management can be simple sections accessible from the dashboard.

---

## 9. Basic Database

The MVP only needs these core entities:

```text
Business
User
Customer
Service
Package
PackageService
Proposal
ProposalPackage
ProposalItem
```

### Package relationship

```text
Package
   |
   +--- PackageService
            |
            +--- Service
```

### Proposal relationship

```text
Proposal
   |
   +--- ProposalPackage
   |
   +--- ProposalItem
```

This allows one proposal to contain multiple packages and individual services.

---

## 10. Important Business Rules

### Rule 1 — Multiple Packages

A proposal can contain one or multiple packages.

### Rule 2 — Mixed Proposal

A proposal can contain:

- Multiple packages
- Individual services
- Optional add-ons

at the same time.

### Rule 3 — Price Snapshot

When a package or service is added to a proposal, its name and price should be stored in the proposal.

If the business later changes the package price, old proposals must remain unchanged.

### Rule 4 — Backend Calculation

The backend is the final authority for pricing calculations.

### Rule 5 — Optional Services

Optional services should not be included in the final total unless selected.

---

## 11. AI

AI should be **optional and preferably excluded from the first development iteration**.

The first MVP should prove that the quotation workflow works.

AI can be added after the core workflow is validated.

### Future AI workflow

```text
Customer Message
      ↓
AI Requirement Extraction
      ↓
Suggested Packages/Services
      ↓
Salesperson Confirmation
      ↓
Proposal
```

Example:

> "We have a two-day wedding and need photography and video. Budget is around ₹1 lakh."

The AI could extract:

```text
Duration: 2 days
Services: Photography + Videography
Budget: ₹1,00,000
```

The salesperson then confirms the requirements before creating the proposal.

---

## 12. Out of Scope

The following should NOT be built in the small MVP:

- Customer login
- Online payments
- WhatsApp API
- Email automation
- E-signatures
- Booking management
- Contract management
- Full CRM
- Advanced analytics
- AI chatbot
- Automated follow-ups
- Multi-language support
- Complex discount rules

These can be considered for later versions.

---

## 13. Suggested Technology

### Frontend

- React / Next.js
- TypeScript
- Tailwind CSS

### Backend

- Node.js
- TypeScript
- Express or NestJS

### Database

- PostgreSQL

### PDF

- Server-side PDF generation

### Deployment

Use low-cost managed hosting suitable for an MVP.

---

## 14. MVP Success Criteria

The MVP is successful if a salesperson can:

1. Log in.
2. Select or create a customer.
3. Enter wedding details.
4. Select one or multiple packages.
5. Add individual services.
6. Add optional services.
7. Apply a discount.
8. See the calculated total.
9. Preview the proposal.
10. Generate a professional PDF.
11. Save the proposal.
12. Reopen a draft proposal.

### Primary Success Metric

A salesperson should be able to create a customer-ready proposal in **under 5 minutes**.

---

## 15. Final MVP Definition

> **A lightweight quotation tool for wedding photography businesses that allows sales staff to combine multiple packages and services, calculate the final price, and generate a professional PDF proposal quickly.**
