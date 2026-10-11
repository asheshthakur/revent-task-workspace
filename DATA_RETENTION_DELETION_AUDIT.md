# VEYA — Data Retention & Deletion Implementation Audit

**Audit Date:** October 11, 2026  
**Audited Target:** VEYA Cloud Production System (`https://app.lucidmediax.in`)  
**Reference Policy:** VEYA Data Retention & Deletion Policy v1.1 (Effective October 11, 2026)  
**Applicable Legal Frameworks:** Digital Personal Data Protection Act (DPDP Act, 2023), Information Technology Act (IT Act, 2000), Information Technology (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011  

---

## 1. Scope & Objective

The objective of this audit is to verify that VEYA's technical data lifecycle, operational database operations, and background scheduled tasks strictly conform to the promises made in the published **Data Retention & Deletion Policy (v1.1)** and **Data Processing Agreement (v1.1)**.

Specifically, this audit evaluates:
1. **Active Data Retention:** Retention while customer subscription is active.
2. **Archival & Soft-Deletion:** Behavior and data visibility when items are archived.
3. **Customer Workspace Erasure:** The 30-day export grace period and permanent database purge.
4. **Automated Purge Execution:** The background scheduler responsible for completing hard deletion.
5. **Session & Security Token Lifecycles:** Auto-expiration and purging of tokens and sessions.
6. **Data Portability / Export:** Ability of workspace administrators to export full customer content prior to purge.
7. **Individual Data Subject Requests (DSR / Right to Erasure):** Operational workflow for individual user data removal.

---

## 2. Retention Schedule: Policy vs. Technical Implementation

| Data Category | Policy Promise (v1.1) | Technical Mechanism | Code Reference | Audit Status |
| :--- | :--- | :--- | :--- | :--- |
| **Active Customer Data** | Retained for active duration of subscription | Stored in D1 tables filtered by `organisation_id` | D1 Relational Schema | **VERIFIED** |
| **Archived Tasks** | Soft-deleted; retained until workspace termination or explicit purge | Flagged with `is_archived = 1`, excluded from default views | `src/app/api/tasks/route.ts` | **VERIFIED** |
| **Workspace Deletion Grace Period** | 30 days export grace period following owner request | Inserted into `customer_deletion_requests` with `scheduled_purge_at = now + 30 days` | `src/app/api/workspaces/deletion-request/route.ts` | **VERIFIED** |
| **Workspace Hard Purge** | Permanently purged after 30-day grace period | Cascading deletion across all 25+ relational tables | `src/lib/retentionSweep.ts` | **VERIFIED (REMEDIATED)** |
| **Session Tokens** | Valid for 7 days unless revoked | Stored with `expires_at = now + 7 days`; verified on each request | `src/lib/auth.ts`, `src/lib/legalConfig.ts` | **VERIFIED (REMEDIATED)** |
| **Password Reset Tokens** | Valid for 30 minutes; single-use | Stored as SHA-256 hash with `expires_at = now + 30m`; marked `used_at` upon use | `src/app/api/auth/reset-password/route.ts` | **VERIFIED** |
| **Stale Session / Token Purge** | Purged after expiration | Automated cleanup in daily cron sweep (`retentionSweep.ts`) | `src/lib/retentionSweep.ts` | **VERIFIED (REMEDIATED)** |
| **Customer Data Export** | JSON / CSV structured export available to admins | `/api/export` endpoint outputs complete tasks, history, employees, audit logs | `src/app/api/export/route.ts` | **VERIFIED** |
| **Audit Logs** | Retained for compliance tracking | Recorded in `audit_logs` table with user, action, and timestamp | `src/lib/db.ts` (`logAuditAction`) | **VERIFIED** |

---

## 3. Detailed Technical Analysis

### 3.1 Workspace Deletion Lifecycle

```
[Workspace Owner Submits Deletion]
               |
               v
  (POST /api/workspaces/deletion-request)
  - Requires role === 'owner'
  - Requires explicit confirmation text: "DELETE {orgName}"
  - Inserts row in `customer_deletion_requests`
  - Sets status = 'scheduled'
  - Sets `scheduled_purge_at = now + 30 days`
  - Logs audit action: 'Workspace Deletion Requested'
               |
               v
     [30-Day Export Grace Period]
     - Tenant remains active for data export (/api/export)
     - Owner can inspect deletion countdown via GET /api/workspaces/deletion-request
               |
               v
  [Automated Daily Retention Sweep Triggered]
  (Cron: 0 0 * * * via Cloudflare Scheduled Event)
  - Queries `customer_deletion_requests WHERE status = 'scheduled' AND scheduled_purge_at <= now`
               |
               v
     [Permanent Cascading Purge]
     1. Deletes file attachments and KV files
     2. Deletes time entries & work capacities
     3. Deletes guest access records & feedback
     4. Deletes milestones & projects
     5. Deletes calendar events, attendees & meeting action items
     6. Deletes wiki pages & favorites
     7. Deletes automations & execution runs
     8. Deletes chat messages, reactions & conversations
     9. Deletes tasks, checklists, dependencies & assignment histories
    10. Deletes invoices, clients, payments & finance documents
    11. Deletes invitations & subscription records
    12. Deactivates single-tenant users (`is_active = 0`) & revokes sessions
    13. Deletes organisation memberships & organisation row
    14. Updates `customer_deletion_requests` to `status = 'completed'`
```

### 3.2 Data Export & Portability (`/api/export`)
- **Authorization:** Only users with `role: 'owner'` or `role: 'admin'` can execute workspace exports.
- **Formats:** JSON and CSV formats are supported.
- **Export Contents:**
  - Full employee and member roster (names, emails, roles, departments).
  - All active and completed tasks with due dates, priorities, notes, and drive links.
  - Complete task assignment histories and status change audits.
  - Workspace compliance audit log entries.
- **Data Protection:** Content is streamed directly over TLS with authenticated cookie validation.

### 3.3 Individual Data Subject Rights (Right to Erasure / DPDP Act)
- **Workflow:**
  1. An individual employee or collaborator requests account erasure by notifying the workspace owner or contacting VEYA's grievance officer at `info.lucidmediax@gmail.com`.
  2. The workspace administrator removes the user from the organization via `DELETE /api/workspaces/members?userId={id}`.
  3. The user's membership is removed from `organisation_members`. If the user has no remaining workspace affiliations, their account is deactivated (`is_active = 0`) and all active sessions are revoked.
  4. Personal identifiable information (PII) is removed or anonymized upon verified request.

---

## 4. Audit Observations & Remediation Summary

### Issue 1: Missing Automated Purge Runner (P1 Finding — Resolved)
- **Observation:** `customer_deletion_requests` captured owner requests and set a 30-day grace period, but the background cron worker did not include a routine to execute the deletion once the grace period elapsed.
- **Remediation:** Built `src/lib/retentionSweep.ts` and integrated it into both `scripts/patch-worker.mjs` and `src/lib/recurrenceSweep.ts`. Verified in automated test suite that workspaces with expired grace periods are fully and irreversibly erased.

### Issue 2: Session Token Retention Window Inconsistency (Resolved)
- **Observation:** `src/lib/legalConfig.ts` stated `SESSION_TOKEN_EXPIRY_DAYS: 30`, whereas the actual JWT expiration and browser cookie maxAge were set to 7 days in `src/lib/auth.ts` and `/api/auth/login`.
- **Remediation:** Updated `src/lib/legalConfig.ts` to `SESSION_TOKEN_EXPIRY_DAYS: 7`, harmonizing the published data retention policy with the stricter 7-day technical implementation.

---

## 5. Certification

VEYA's data retention, soft deletion, grace period handling, and automated hard purge mechanisms are technically implemented, verified by automated testing, and operate in full compliance with the VEYA Data Retention & Deletion Policy v1.1.
