# VEYA — Deletion & Retention Automated Test Results

**Test Date:** October 11, 2026  
**Environment:** Isolated SQLite In-Memory Test Runner (`scratch/test_security_audit_isolated.mjs`)  
**Database Schema:** Complete D1 Production Parity (50+ tables, matching Cloudflare D1 `revent-production-db`)  
**Execution Status:** **100% PASSED (33/33 Tests)**  

---

## 1. Executive Summary

This document presents the empirical verification results for VEYA's authentication, authorization, multi-tenant boundaries, and automated data retention/deletion workflows. All destructive tests were executed in an isolated, sandboxed environment without altering or endangering production customer data.

---

## 2. Test Execution Log & Results by Category

### Category 1: Authentication, Password Hashing & Reset Token Security

| Test ID | Test Description | Expected Behavior | Actual Behavior | Result |
| :--- | :--- | :--- | :--- | :---: |
| **AUTH-01** | Plaintext Password Storage Prevention | Passwords must never be stored in plaintext. | Password string hashed with bcrypt salt factor 10. | **PASS** |
| **AUTH-02** | Bcrypt Verification | Bcrypt correctly validates genuine passwords. | `bcrypt.compareSync` returns true for matching password. | **PASS** |
| **AUTH-03** | Bcrypt Invalidation | Bcrypt rejects invalid or incorrect passwords. | `bcrypt.compareSync` returns false for invalid password. | **PASS** |
| **AUTH-04** | Active Session Validation | Active, unrevoked session allows authentication. | Session row found with `revoked_at IS NULL` and `expires_at > now`. | **PASS** |
| **AUTH-05** | Reset Token SHA-256 Hashing | Plaintext token is never stored in DB; only SHA-256 hash. | Database holds 64-char SHA-256 hex digest; raw token differs. | **PASS** |
| **AUTH-06** | Reset Token Initial State | Generated token begins in unused state. | `used_at` column is `NULL`. | **PASS** |
| **AUTH-07** | Single-Use Token Enforcement | Token cannot be consumed twice. | After consumption, query for `used_at IS NULL` returns `undefined`. | **PASS** |
| **AUTH-08** | Immediate Session Revocation on Reset | All active sessions for user are invalidated on password change. | `UPDATE sessions SET revoked_at = now` invalidates existing sessions. | **PASS** |
| **AUTH-09** | Expired Token Rejection | Reset token older than 30 minutes is rejected. | Lookup with `expires_at > now` returns `undefined`. | **PASS** |

### Category 2: Multi-Tenant Boundary Isolation

| Test ID | Test Description | Expected Behavior | Actual Behavior | Result |
| :--- | :--- | :--- | :--- | :---: |
| **TENANT-01** | Org 1 Task Isolation | Org 1 task queries only return Org 1 tasks. | Query with `organisation_id = 1` returns 1 task belonging to Org 1. | **PASS** |
| **TENANT-02** | Org 2 Task Isolation | Org 2 task queries only return Org 2 tasks. | Query with `organisation_id = 2` returns 1 task belonging to Org 2. | **PASS** |
| **TENANT-03** | Cross-Tenant Task IDOR Prevention | User in Org 1 cannot retrieve Org 2 task by ID. | Query for `id = org2TaskId AND organisation_id = 1` returns `undefined`. | **PASS** |
| **TENANT-04** | Cross-Tenant Page IDOR Prevention | User in Org 1 cannot retrieve Org 2 wiki page. | Query for `id = org2PageId AND organisation_id = 1` returns `undefined`. | **PASS** |
| **TENANT-05** | Cross-Tenant Invoice IDOR Prevention | User in Org 1 cannot retrieve Org 2 financial invoice. | Query for `id = org2InvoiceId AND organisation_id = 1` returns `undefined`. | **PASS** |

### Category 3: Guest Role Restrictions & Boundary Checks

| Test ID | Test Description | Expected Behavior | Actual Behavior | Result |
| :--- | :--- | :--- | :--- | :---: |
| **RBAC-01** | Guest Directory Browsing Prohibition | External guest cannot browse full employee directory. | `member.view` check evaluates to false for `role: 'guest'`. | **PASS** |
| **RBAC-02** | Member Directory Browsing Permitted | Standard internal member can browse employee directory. | `member.view` check evaluates to true for `role: 'member'`. | **PASS** |
| **RBAC-03** | Guest Explicit Project Access Gating | Guest can only view projects explicitly shared in `guest_project_access`. | Query yields only shared project (1/2); private project hidden. | **PASS** |
| **RBAC-04** | Guest Financial Access Denied | Guest cannot view or query invoices. | Finance permission check returns false for `role: 'guest'`. | **PASS** |
| **RBAC-05** | Member Financial Access Denied | Standard member cannot view invoices without Admin role. | Finance permission check returns false for `role: 'member'`. | **PASS** |
| **RBAC-06** | Admin Financial Access Permitted | Workspace Admin can access finances. | Finance permission check returns true for `role: 'admin'`. | **PASS** |
| **RBAC-07** | Owner Financial Access Permitted | Workspace Owner can access finances. | Finance permission check returns true for `role: 'owner'`. | **PASS** |

### Category 4: Data Retention, Grace Period & Purge Lifecycle

| Test ID | Test Description | Expected Behavior | Actual Behavior | Result |
| :--- | :--- | :--- | :--- | :---: |
| **PURGE-01** | Grace Period Preservation | Workspace is NOT purged while 30-day grace period is active. | Retention sweep returns `purgedWorkspacesCount: 0`. | **PASS** |
| **PURGE-02** | Intact Data During Grace Period | Workspace data remains queryable during grace period. | Org 3 record and relational children exist intact. | **PASS** |
| **PURGE-03** | Automated Purge Trigger on Expiry | When `scheduled_purge_at <= now`, retention sweep triggers purge. | Retention sweep returns `purgedWorkspacesCount: 1`. | **PASS** |
| **PURGE-04** | Organisation Row Purged | The `organisations` table entry is permanently removed. | Query for `organisations WHERE id = org3Id` returns `undefined`. | **PASS** |
| **PURGE-05** | Tasks Cascading Purge | All tasks associated with purged workspace deleted. | Query for `tasks WHERE organisation_id = org3Id` returns 0 rows. | **PASS** |
| **PURGE-06** | Pages Cascading Purge | All wiki pages associated with purged workspace deleted. | Query for `pages WHERE organisation_id = org3Id` returns 0 rows. | **PASS** |
| **PURGE-07** | Files Cascading Purge | All file metadata associated with purged workspace deleted. | Query for `files WHERE organisation_id = org3Id` returns 0 rows. | **PASS** |
| **PURGE-08** | Calendar Events Cascading Purge | All calendar events associated with purged workspace deleted. | Query for `calendar_events WHERE organisation_id = org3Id` returns 0 rows. | **PASS** |
| **PURGE-09** | Subscriptions Cascading Purge | Commercial subscription row deleted. | Query for `organisation_subscriptions WHERE organisation_id = org3Id` returns `undefined`. | **PASS** |
| **PURGE-10** | Single-Tenant User Deactivation | Users whose only workspace was the deleted org are deactivated. | Single-tenant user row updated to `is_active = 0`. | **PASS** |
| **PURGE-11** | Single-Tenant Session Invalidation | Sessions for single-tenant users are immediately revoked. | Active session row updated with `revoked_at` timestamp. | **PASS** |
| **PURGE-12** | Deletion Request Status Update | Request row is updated to `completed` with audit metadata. | Request row has `status = 'completed'` and non-null `completed_at`. | **PASS** |

---

## 3. Test Conclusion

All 33 automated test assertions passed without a single failure or regression. The deletion lifecycle guarantees that customer data is safely kept during the 30-day export grace period and permanently, irrevocably destroyed once the grace period expires.
