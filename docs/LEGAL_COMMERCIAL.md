# VEYA — Legal & Commercial Architecture Documentation

This document describes the production Legal and Commercial layer implemented for VEYA, detailing configuration sources, database schemas, consent auditing, document versioning, and items flagged for human legal counsel review.

---

## 1. Centralized Legal Configuration

All legal entity metadata, document versions, contact endpoints, retention intervals, subprocessors, and commercial pricing tiers are maintained in a single authoritative source:

- **Source File**: `src/lib/legalConfig.ts`
- **Exposed Public API**: `GET /api/legal/documents`

### Key Legal Parameters:
- **Trading / Product Name**: `VEYA`
- **Operating Brand**: `Lucid Media`
- **Applicable Legal Regime**: United Arab Emirates Federal Laws, specifically:
  - UAE Federal Decree-Law No. 45 of 2021 on Personal Data Protection (PDPL)
  - UAE Federal Decree-Law No. 46 of 2021 on Electronic Transactions and Trust Services
- **Governing Law**: Laws of the United Arab Emirates as applied in the Emirate of Dubai `[LEGAL REVIEW REQUIRED]`
- **Dispute Jurisdiction**: Competent Courts of Dubai, United Arab Emirates `[LEGAL REVIEW REQUIRED]`

---

## 2. Customer-Facing Legal & Commercial Routes

The following dedicated routes are live in production:

| Route | Title | Description | Version |
| :--- | :--- | :--- | :--- |
| `/legal/terms` | **Terms of Service** | Core B2B contract governing workspace access, content ownership, licensing, fees, and liabilities. | 1.0 |
| `/legal/privacy` | **Privacy Policy** | Controller vs Processor roles, lawful bases under UAE PDPL, technical safeguards, and data subject rights. | 1.0 |
| `/legal/dpa` | **Data Processing Agreement** | B2B DPA with Appendices for technical measures, processing categories, and approved subprocessors. | 1.0 |
| `/legal/sla` | **Service Level Agreement** | Realistic availability targets (99.5% standard / 99.9% enterprise), maintenance windows, and severity response tiers. | 1.0 |
| `/legal/acceptable-use` | **Acceptable Use Policy** | Security boundaries, anti-abuse, credential protection, and prohibited activities. | 1.0 |
| `/legal/data-retention` | **Data Retention & Deletion** | Clear schedules for active, archived, and customer-requested hard purges. | 1.0 |
| `/legal/security` | **Security Architecture** | Fact-based technical overview of edge compute, tenant isolation, session auth, and HMAC relay. | 1.0 |
| `/legal/order-form` | **Master Order Form** | Standard B2B contractual order form template for enterprise and custom invoicing. | 1.0 |
| `/pricing` | **Commercial Pricing** | Transparent pricing tiers (Free, Team Pro, Business Operations, Enterprise Custom). | 1.0 |

---

## 3. Database Schema & Migration

All legal tables were provisioned in Cloudflare D1 (`revent-production-db`) via `d1/legal_commercial_schema.sql`:

1. **`legal_documents`**: Stores legal document versions, effective dates, changelogs, and active flags.
2. **`legal_acceptances`**: Immutable audit records storing `user_id`, `organisation_id`, `document_type`, `document_version`, `acceptance_type`, `ip_address`, `user_agent`, and `accepted_at`.
3. **`organisation_subscriptions`**: Tracks tenant commercial plan tiers, seat limits, billing intervals, VAT/tax IDs, and DPA execution status.
4. **`customer_deletion_requests`**: Auditable workflow for organizational erasure requests with a 30-day export grace period.

---

## 4. User Consent & Workspace Administration

1. **Signup Affirmative Consent**:
   - `src/app/signup/page.tsx` requires users to check an affirmative consent box agreeing to the Terms of Service and acknowledging the Privacy Policy before account creation.
   - `src/app/api/auth/register/route.ts` enforces `termsAccepted === true` on the server (rejects with `400 Bad Request` if omitted) and automatically inserts immutable acceptance records into `legal_acceptances`.

2. **Workspace Compliance Card**:
   - `src/components/legal/CommercialWorkspaceCard.tsx` renders in Workspace Settings for Owners and Admins.
   - Displays real-time compliance status (Terms, Privacy, DPA execution).
   - Allows Workspace Admins to execute the B2B DPA for their organization with one click.
   - Allows Workspace Owners to schedule organizational erasure with explicit confirmation safeguards (`DELETE <WorkspaceName>`).

---

## 5. Subprocessors Discovered & Reflected

Strictly matching the actual production architecture:
1. **Cloudflare, Inc.**: Edge compute (Workers), edge routing, distributed D1 database, and FILES_KV blob storage.
2. **Google Workspace (Google LLC)**: Outbound transactional email delivery via Google Apps Script and MailApp relay.
