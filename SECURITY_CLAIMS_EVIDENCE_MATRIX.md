# VEYA — Security Claims Evidence Matrix

**Evaluation Date:** October 11, 2026  
**Applicable Legal Version:** v1.1 (Effective October 11, 2026)  
**Audited Target:** VEYA Cloud Production Infrastructure (`https://app.lucidmediax.in`)  

---

## 1. Overview

This matrix maps every substantive security, privacy, and architectural commitment published in VEYA's customer-facing legal documents to the concrete codebase implementation, database schemas, and infrastructure configurations.

---

## 2. Evidence Matrix

| # | Policy Claim | Document & Section | Implementation Mechanism | Evidence & Verification Path | Status |
| :- | :--- | :--- | :--- | :--- | :-: |
| **1** | **Multi-Tenant Logical Isolation:** Customer data is strictly segregated so tenants cannot view or manipulate other tenants' data. | `SECURITY_OVERVIEW` §2.1, `DPA` Appendix 2 | All database tables have `organisation_id` foreign key. Central `getTenantContext()` checks user's active org membership before routing any queries. | `src/lib/auth.ts`, `src/lib/permissions.ts`. Isolated multi-tenant tests verified cross-tenant tasks, pages, and invoices return 403 or empty sets. | **VERIFIED** |
| **2** | **Encryption in Transit (TLS 1.3):** All traffic between client and VEYA is encrypted using modern TLS (1.2/1.3) with HSTS. | `SECURITY_OVERVIEW` §1.2 | Terminated at Cloudflare Edge with modern cipher suites and automatic HTTPS enforcement. | Cloudflare Edge Worker config, `https://app.lucidmediax.in` SSL Labs A+ rating equivalent. | **VERIFIED** |
| **3** | **No Plaintext Passwords / Strong Hashing:** Passwords are never stored in plaintext and use cryptographic salted algorithms. | `SECURITY_OVERVIEW` §3.1, `TERMS` §2.2 | `bcryptjs` with salt rounds = 10 (`bcrypt.hashSync(password, 10)`). Verified in signup and reset password endpoints. | `src/app/api/auth/login/route.ts`, `src/app/api/auth/reset-password/route.ts`. Verified in `test_security_audit_isolated.mjs`. | **VERIFIED** |
| **4** | **Server-Side Session Validation & Revocation:** Session tokens are validated on every request and can be instantly revoked. | `SECURITY_OVERVIEW` §3.2 | `sessions` table tracks `session_token_hash`, `expires_at`, and `revoked_at`. Auth middleware rejects revoked or expired tokens. | `src/lib/auth.ts` (`verifySession`). Test 1.4 confirms sessions revoked immediately on password reset. | **VERIFIED** |
| **5** | **Password Reset Token Security:** Reset tokens are high entropy, single-use, 30-min valid, and stored as SHA-256 hashes. | `SECURITY_OVERVIEW` §3.3, `DATA_RETENTION` §3 | `crypto.randomBytes(32)` token generation; SHA-256 hash stored in DB; single-use check (`used_at IS NULL`); 30-min expiration check. | `src/app/api/auth/reset-password/route.ts`. Isolated test verified single-use and expiration enforcement. | **VERIFIED** |
| **6** | **Role-Based Access Control (RBAC):** Access to workspace actions is restricted based on user role (Owner, Admin, Manager, Member, Guest). | `SECURITY_OVERVIEW` §4.1, `TERMS` §3.1 | Central `can(ctx, action, resource)` permission function evaluates hierarchical roles and resource ownership. | `src/lib/permissions.ts`. Tested role constraints across all 5 tiers. | **VERIFIED** |
| **7** | **Guest / External Collaborator Isolation:** Guests cannot browse employee directory or view financial records. | `SECURITY_OVERVIEW` §4.2 | `member.view` returns false for `guest`. Finance routes reject non-admin/owner. Project & page access requires explicit junction table entry. | `src/lib/permissions.ts`, `src/app/api/finance/overview/route.ts`. Tested in `test_security_audit_isolated.mjs`. | **VERIFIED** |
| **8** | **30-Day Workspace Erasure Grace Period:** Organization deletion requests provide a 30-day export grace period before permanent purge. | `DATA_RETENTION` §4.1, `TERMS` §9.2 | `customer_deletion_requests` stores owner request with `scheduled_purge_at = datetime('now', '+30 days')`. | `src/app/api/workspaces/deletion-request/route.ts`. Verified in `test_security_audit_isolated.mjs`. | **VERIFIED** |
| **9** | **Automated Workspace Purge Execution:** Data is permanently and irreversibly purged from databases once grace period expires. | `DATA_RETENTION` §4.2, `DPA` §8.2 | Automated scheduled sweep worker queries due deletion requests and executes cascading deletes across 25+ tables. | `src/lib/retentionSweep.ts`, `scripts/patch-worker.mjs`. Automated test verified complete cascading purge. | **VERIFIED (REMEDIATED)** |
| **10** | **Customer Data Export / Portability:** Workspace administrators can export customer content in structured JSON or CSV format. | `DATA_RETENTION` §4.3, `PRIVACY` §7 | Dedicated `/api/export` endpoint outputs JSON or CSV including members, tasks, status histories, and audit logs. | `src/app/api/export/route.ts`. Verified export structure and admin role gate. | **VERIFIED** |
| **11** | **Audit Logging:** System security and workspace changes are logged with actor, timestamp, and details. | `SECURITY_OVERVIEW` §5.1, `DPA` Appendix 2 | Central `logAuditAction()` records entries in `audit_logs` table with user, action type, entity, and timestamp. | `src/lib/db.ts` (`logAuditAction`), `d1/schema.sql`. | **VERIFIED** |
| **12** | **Subprocessor Transparency:** Only approved subprocessors (Cloudflare, Google Workspace) process customer personal data. | `DPA` §5, `SECURITY_OVERVIEW` §6 | Cloudflare provides edge compute, KV and D1. Google Apps Script / MailApp provides transactional email relay. | `src/lib/legalConfig.ts` (`SUBPROCESSORS`). Worker bindings in `wrangler.toml`. | **VERIFIED** |
| **13** | **Zero Public Contract Disclosure:** Commercial contract templates and master order forms are private, not exposed publicly. | `TERMS` §1.1 | `/legal/order-form` route removed from public navigation and returns HTTP 404. Private template kept in `docs/templates/`. | Verified `https://app.lucidmediax.in/legal/order-form` returns 404. | **VERIFIED** |
| **14** | **Transactional Email Relay HMAC Authentication:** Outbound email relay requests are cryptographically verified before dispatch. | `SECURITY_OVERVIEW` §6.2 | Cloudflare Worker signs payloads using HMAC-SHA256 with timestamp headers; Google Apps Script verifies before calling MailApp. | `src/lib/email.ts`, Google Apps Script `Code.gs`. | **VERIFIED** |

---

## 3. Compliance Summary

Every public legal and security commitment has been inspected and mapped to working code or verified configuration. There are no unsupported or aspirational claims remaining in production.
