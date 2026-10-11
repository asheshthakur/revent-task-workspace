# VEYA — Security Remediation Log (Comprehensive)

**Audit & Remediation Cycle:** Full Production Security, Physical Storage & Retention Follow-Up  
**Date:** October 11, 2026  
**Auditor / Engineer:** Automated Security Remediation Engine  
**Release Target:** VEYA Cloud Production (`https://app.lucidmediax.in`)  
**Deployment Infrastructure:** Cloudflare Workers, Cloudflare D1, Cloudflare KV  
**Deployment Version:** `ffe960f7-be4d-49fc-86b1-6a5982100aa6`  

---

## 1. Remediation Overview

During the security and data-retention follow-up, four high-risk areas were investigated:
1. Physical data storage and underlying file deletion in Cloudflare KV and D1 `file_blobs`.
2. Cloudflare D1 Time Travel point-in-time recovery copies versus active database erasure.
3. Scheduled purge worker execution, error bubbling, retry safety, and shared user preservation.
4. D1-compatible integration testing verifying 42 deterministic assertions.

All verified issues have been resolved, tested, built, deployed, and verified against production.

---

## 2. Itemized Remediation Log

### Remediation Entry 1: Underlying Physical File Object Purge in Cloudflare KV & D1
- **Finding ID:** SEC-FIND-05
- **Severity:** High / P1 (Data Erasure Incompleteness)
- **Component:** `src/lib/retentionSweep.ts`, `scripts/patch-worker.mjs`
- **Issue Description:**
  The retention purge routine previously only deleted metadata records from `files` and `file_attachments`. It did not retrieve the `storage_key` identifiers to delete the actual underlying binary file objects stored in Cloudflare KV (`FILES_KV`) or fallback D1 `file_blobs`.
- **Root Cause:**
  File storage helper library stores binary blobs in `FILES_KV` (or `file_blobs`), decoupled from the relational metadata table.
- **Remediation Implemented:**
  1. Updated `runRetentionSweepWithDb()` in `src/lib/retentionSweep.ts` and `scripts/patch-worker.mjs` to query all storage keys:
     `SELECT storage_key FROM files WHERE organisation_id = ?` and `SELECT storage_key FROM file_blobs WHERE organisation_id = ?`.
  2. For every key, calls `await filesKv.delete(key)` to delete the physical binary object from Cloudflare KV.
  3. Deletes fallback records from `file_blobs WHERE organisation_id = ?`.
  4. Deletes relational records from `files` and `file_attachments`.
- **Verification:**
  Integration test INT-16 proved that physical file objects stored in `FILES_KV` are permanently deleted upon workspace purge.

---

### Remediation Entry 2: Strict Error Bubbling & Retry Safety (No Premature Completion)
- **Finding ID:** SEC-FIND-06
- **Severity:** High / P1 (False Compliance / Premature Completion)
- **Component:** `src/lib/retentionSweep.ts`, `scripts/patch-worker.mjs`
- **Issue Description:**
  Previously, individual try/catch blocks wrapped each table deletion step. If an error occurred midway (e.g. on table 6 of 15), the error was caught silently, and the code proceeded to Step N, marking `customer_deletion_requests` as `completed`.
- **Root Cause:**
  Defensive coding in individual loops without an atomic error bubble guard.
- **Remediation Implemented:**
  1. Removed silent swallowing of errors in table deletion steps.
  2. If any table deletion fails, execution aborts for that organization and jumps to the error catch block.
  3. The request is **NOT** marked completed; its status remains `'scheduled'`, and `audit_metadata` records `{ lastAttemptAt: now, error: msg, retryPending: true }`.
  4. The request remains discoverable for retry in the next daily cron sweep (`0 0 * * *`).
  5. Only when all deletion steps finish cleanly is `status = 'completed'` written.
- **Verification:**
  Integration test INT-10 verified that injecting a transient error during table deletion leaves `status = 'scheduled'` and `completed_at = null`. Subsequent retry (INT-14) cleanly completes the purge.

---

### Remediation Entry 3: Active Database Purge vs. 7-Day Free Plan D1 Time Travel Disclosure
- **Finding ID:** SEC-FIND-07
- **Severity:** Medium (Legal Accuracy & Recovery Transparency)
- **Component:** `src/app/legal/data-retention/page.tsx`, `src/lib/legalConfig.ts`
- **Issue Description:**
  The public policy disclosure previously stated 30 days for database snapshot recovery, whereas Cloudflare Workers Free plan D1 Time Travel provides a rolling 7-day point-in-time recovery window. Furthermore, Cloudflare KV object deletion operates independently without Time Travel recovery.
- **Remediation Implemented:**
  1. Updated `/legal/data-retention` Section 4 to disclose the accurate **7-day** D1 Time Travel recovery window for the Cloudflare Workers Free plan.
  2. Clarified that historical database states in D1 remain recoverable for up to 7 days post-purge, after which they expire and roll off irreversibly.
  3. Distinguished Cloudflare KV file object deletion: KV keys are deleted immediately and propagated via eventual consistency without a recovery window.
  4. Incremented Data Retention Policy version to **1.2** with effective date 2026-10-11 in `src/lib/legalConfig.ts` and `LEGAL_CHANGELOG.md`.
  5. Corrected `BACKUP_RETENTION_DAYS: 7` and added `D1_TIME_TRAVEL_RECOVERY_DAYS: 7` in `legalConfig.ts`.
  6. Preserved the unchanged 30-day customer export grace period (`ORGANISATION_TERMINATION_GRACE_PERIOD_DAYS: 30`).
- **Verification:**
  Verified on live production URL `https://app.lucidmediax.in/legal/data-retention`.

---

### Remediation Entry 4: Shared User Preservation Boundary
- **Finding ID:** SEC-FIND-08
- **Severity:** High / P1 (Cross-Tenant Account Collateral Damage Prevention)
- **Component:** `src/lib/retentionSweep.ts`, `scripts/patch-worker.mjs`
- **Issue Description:**
  Ensured that deactivating users whose workspace is purged does NOT deactivate shared users who belong to other active organizations.
- **Remediation Implemented:**
  Strict SQL query:
  `SELECT user_id FROM organisation_members WHERE organisation_id = ? AND user_id NOT IN (SELECT user_id FROM organisation_members WHERE organisation_id != ?)`
  Only single-tenant users are deactivated. Shared users retain `is_active = 1`, keep active sessions, and preserve full access to their other workspaces.
- **Verification:**
  Integration tests INT-32, INT-33, and INT-34 verified that when Org A is purged, a shared user who also belongs to Org B remains active, has their session unrevoked, and maintains Admin access in Org B.

---

## 3. Files Modified & Added

| Action | Path | Purpose |
| :--- | :--- | :--- |
| **MODIFY** | `src/lib/retentionSweep.ts` | Underlying KV blob deletion, strict error bubbling, retry-safety |
| **MODIFY** | `scripts/patch-worker.mjs` | Injected KV blob deletion and retry-safety in scheduled worker |
| **MODIFY** | `src/app/legal/data-retention/page.tsx` | Disclosed active purge vs 30-day disaster recovery backup lifecycle |
| **NEW** | `scratch/test_d1_scheduled_purge_integration.mjs` | 42-assertion D1 & KV scheduled purge integration test suite |
| **MODIFY** | `DATA_RETENTION_DELETION_AUDIT.md` | Comprehensive physical storage and backup audit |
| **MODIFY** | `DELETION_TEST_RESULTS.md` | Full 75-test empirical verification results |
| **MODIFY** | `SECURITY_REMEDIATION_LOG.md` | This updated remediation log |

---

## 4. Rollback & Fail-Safe Strategy

- Cloudflare Worker deployment ID: `ffe960f7-be4d-49fc-86b1-6a5982100aa6`.
- Rollback target deployment ID: `9478ba10-d606-4bb9-82c7-eb0f7287ccc7`.
- All database deletions require explicit owner confirmation and a mandatory 30-day grace period.
