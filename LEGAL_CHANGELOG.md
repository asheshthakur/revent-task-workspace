# VEYA — Legal & Commercial Changelog

## Version 1.2 (Effective Date: 2026-10-11)
### Summary of Changes: Data Retention & D1 Time Travel Recovery Window Realignment

1. **Cloudflare D1 Time Travel Recovery Window Correction**:
   - Corrected the Cloudflare D1 disaster recovery window disclosure in the Data Retention & Deletion Policy from 30 days to **7 days**, accurately reflecting the Cloudflare Workers Free plan's Time Travel window.
   - Clarified that historical database states in D1 may remain technically recoverable within this 7-day rolling window following a workspace purge.
   - Avoided making claims of immediate irreversible erasure while historical states remain recoverable in D1 transaction bookmarks.
   - Confirmed that recovery copies in D1 Time Travel naturally roll off and expire 7 days after a purge executes.

2. **Cloudflare KV Physical Object Storage Distinction**:
   - Clarified that binary file objects stored in Cloudflare KV (`FILES_KV`) and fallback database blobs (`file_blobs`) are deleted upon workspace purge via direct key deletion calls.
   - Explicitly noted that Cloudflare KV operates independently from D1, does not support Time Travel, and does not inherit D1's recovery window; KV deletions propagate across edge data centers via eventual consistency without a recovery window.

3. **Customer Export Grace Period Preserved**:
   - Confirmed that the customer export grace period remains unchanged at **30 days** before the scheduled purge runs.

---

## Version 1.1 (Effective Date: 2026-10-11)
### Summary of Changes: Indian Jurisdiction, Entity Realignment & Contact Centralization

1. **Service Provider Identity & Legal Form**:
   - Replaced all references to `Lucid Media FZ-LLC` with `LucidMediax`.
   - Identified enterprise legal status as an Indian enterprise registered under the Micro, Small and Medium Enterprises Development Act, 2006 (Udyam Registration).
   - Removed all UAE commercial license and UAE TRN placeholders.

2. **Governing Law & Forum Selection**:
   - Changed governing-law clauses across all published legal documents from the Laws of the United Arab Emirates / Dubai to the **Laws of India**.
   - Changed dispute-resolution clauses from the Competent Courts of Dubai to **Courts of competent jurisdiction in India**.
   - Removed all `[LEGAL REVIEW REQUIRED]` tags from governing-law, dispute-resolution, and company configuration entries.

3. **Public Contact Email Harmonization**:
   - Centralized all public channels (Legal, Privacy, Grievance Officer, Billing, Support, and Commercial inquiries) to: `info.lucidmediax@gmail.com`.
   - Preserved transactional email relay mechanics: welcome emails and password-reset emails continue to dispatch strictly to individual end-user accounts.

4. **Master Subscription Order Form (Contract Template)**:
   - **Withdrawn from Public Access**: Removed route `/legal/order-form` from public routing.
   - **Navigation & Footer Cleanup**: Removed all links to `/legal/order-form` from `LegalLayout.tsx`, `LandingFooter.tsx`, `page.tsx` (Homepage footer), and `CommercialWorkspaceCard.tsx`.
   - **Preserved Internally**: Archived full commercial contract template to `docs/templates/MASTER_SUBSCRIPTION_ORDER_FORM.md` for internal B2B enterprise negotiations.

5. **Statutory Framework Alignment**:
   - **Privacy Policy**: Updated to the **Digital Personal Data Protection Act, 2023**, the **Digital Personal Data Protection Rules, 2025** (phased commencement), and the **Information Technology Act, 2000**. Appointed designated Grievance Officer.
   - **Terms of Service**: Grounded electronic contract formation in **Section 10A of the Information Technology Act, 2000** and the **Indian Contract Act, 1872**. Replaced UAE VAT with Indian **Goods & Services Tax (GST)** under the CGST/IGST Acts.
   - **DPA**: Grounded processor obligations, security standards, and cross-border data transfer safeguards in Indian law.
   - **Acceptable Use Policy**: Replaced UAE legal compliance references with the laws of India.
   - **Data Retention & Deletion Policy**: Aligned data minimization with Section 8 of the DPDP Act, 2023.

6. **Catalog & Database Migration**:
   - Incremented active documents in `src/lib/legalConfig.ts` to `v1.1`.
   - Applied migration script `d1/legal_documents_v1_1_update.sql` to remote production Cloudflare D1 database `revent-production-db`.
   - Preserved historical `v1.0` records with `is_active = 0`.

---

## Version 1.0 (Effective Date: 2026-10-08)
- Initial deployment of VEYA Legal & Commercial foundation.
