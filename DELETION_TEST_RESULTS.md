# VEYA — Deletion & Retention Automated Test Results (Comprehensive)

**Test Date:** October 11, 2026  
**Test Suites:**
1. Unit & Logic Verification Suite (`scratch/test_security_audit_isolated.mjs`) — 33 Assertions
2. D1 Scheduled Purge Integration Suite (`scratch/test_d1_scheduled_purge_integration.mjs`) — 42 Assertions
**Total Test Count:** **75 Tests**  
**Passed:** **75 (100%)**  
**Failed:** **0**  
**Blocked:** **0**  

---

## 1. Executive Summary

This document consolidates the complete empirical verification records for VEYA's authentication, authorization, multi-tenant boundaries, physical storage erasure, and automated data retention workflows. All destructive tests were executed in synthetic, isolated environments with zero impact on production customer records.

---

## 2. Test Suite 1: Unit & Logic Assertions (33 Tests)

| Test ID | Category | Assertion Name | Result |
| :--- | :--- | :--- | :---: |
| **AUTH-01** | Auth | Plaintext password prevention (bcrypt salted hashing) | **PASS** |
| **AUTH-02** | Auth | Bcrypt verifies correct password | **PASS** |
| **AUTH-03** | Auth | Bcrypt rejects incorrect password | **PASS** |
| **AUTH-04** | Auth | Active unrevoked session allows authentication | **PASS** |
| **AUTH-05** | Auth | Reset token stored as SHA-256 hash in DB, not plaintext | **PASS** |
| **AUTH-06** | Auth | Reset token begins in unused state (`used_at IS NULL`) | **PASS** |
| **AUTH-07** | Auth | Single-use token enforcement prevents reuse | **PASS** |
| **AUTH-08** | Auth | Immediate session revocation upon password reset | **PASS** |
| **AUTH-09** | Auth | Expired reset token rejected | **PASS** |
| **TENANT-01** | Multi-Tenant | Org 1 task queries only return Org 1 data | **PASS** |
| **TENANT-02** | Multi-Tenant | Org 2 task queries only return Org 2 data | **PASS** |
| **TENANT-03** | Multi-Tenant | Cross-tenant task retrieval blocked by tenant boundary | **PASS** |
| **TENANT-04** | Multi-Tenant | Cross-tenant wiki page retrieval blocked by tenant boundary | **PASS** |
| **TENANT-05** | Multi-Tenant | Cross-tenant invoice retrieval blocked by tenant boundary | **PASS** |
| **RBAC-01** | RBAC | Guest prohibited from viewing full employee directory | **PASS** |
| **RBAC-02** | RBAC | Standard member permitted to view employee directory | **PASS** |
| **RBAC-03** | RBAC | Guest project access gated by explicit junction table entry | **PASS** |
| **RBAC-04** | RBAC | Guest financial access denied | **PASS** |
| **RBAC-05** | RBAC | Standard member financial access denied | **PASS** |
| **RBAC-06** | RBAC | Workspace admin financial access permitted | **PASS** |
| **RBAC-07** | RBAC | Workspace owner financial access permitted | **PASS** |
| **PURGE-01** | Retention | Grace period preserves workspace during active window | **PASS** |
| **PURGE-02** | Retention | Workspace data queryable during active grace period | **PASS** |
| **PURGE-03** | Retention | Retention sweep triggers purge when grace period expires | **PASS** |
| **PURGE-04** | Retention | `organisations` record permanently deleted | **PASS** |
| **PURGE-05** | Retention | All tasks permanently deleted | **PASS** |
| **PURGE-06** | Retention | All wiki pages permanently deleted | **PASS** |
| **PURGE-07** | Retention | All file metadata permanently deleted | **PASS** |
| **PURGE-08** | Retention | All calendar events permanently deleted | **PASS** |
| **PURGE-09** | Retention | Subscription records permanently deleted | **PASS** |
| **PURGE-10** | Retention | Single-tenant user deactivated globally | **PASS** |
| **PURGE-11** | Retention | Single-tenant user session revoked | **PASS** |
| **PURGE-12** | Retention | Customer deletion request marked `completed` with audit metadata | **PASS** |

---

## 3. Test Suite 2: D1 Scheduled Purge Integration Assertions (42 Tests)

| Test ID | Scenario | Assertion Name | Result |
| :--- | :--- | :--- | :---: |
| **INT-01** | Seeding | Org A synthetic data seeded across all tables | **PASS** |
| **INT-02** | Seeding | Control Org B synthetic data seeded across all tables | **PASS** |
| **INT-03** | Seeding | Target file object stored in mock `FILES_KV` | **PASS** |
| **INT-04** | Seeding | Control file object stored in mock `FILES_KV` | **PASS** |
| **INT-05** | Scenario 1 | Retention sweep skips deletion during active 30-day grace period | **PASS** |
| **INT-06** | Scenario 1 | Org A remains fully intact during grace period | **PASS** |
| **INT-07** | Scenario 1 | Target KV file object remains intact during grace period | **PASS** |
| **INT-08** | Scenario 2 | Partial failure detected and counted as failure | **PASS** |
| **INT-09** | Scenario 2 | Partial failure does NOT increment purged count | **PASS** |
| **INT-10** | Scenario 2 | **CRITICAL:** Partial failure does NOT mark deletion request complete (status remains `'scheduled'`) | **PASS** |
| **INT-11** | Scenario 2 | `completed_at` timestamp remains `null` on partial failure | **PASS** |
| **INT-12** | Scenario 2 | Audit metadata records `{ retryPending: true }` on failure | **PASS** |
| **INT-13** | Scenario 2 | Control Org B remains 100% intact despite failure in Org A | **PASS** |
| **INT-14** | Scenario 3 | Retry successfully purges Org A upon resolving transient error | **PASS** |
| **INT-15** | Scenario 3 | Zero failures on clean retry | **PASS** |
| **INT-16** | Scenario 4 | **CRITICAL:** Physical file object permanently deleted from Cloudflare KV | **PASS** |
| **INT-17** | Scenario 4 | `organisations` row permanently deleted from D1 | **PASS** |
| **INT-18** | Scenario 4 | Tasks permanently deleted from D1 | **PASS** |
| **INT-19** | Scenario 4 | Files metadata permanently deleted from D1 | **PASS** |
| **INT-20** | Scenario 4 | File blobs fallback permanently deleted from D1 | **PASS** |
| **INT-21** | Scenario 4 | Wiki pages permanently deleted from D1 | **PASS** |
| **INT-22** | Scenario 4 | Projects permanently deleted from D1 | **PASS** |
| **INT-23** | Scenario 4 | Clients permanently deleted from D1 | **PASS** |
| **INT-24** | Scenario 4 | Invoices permanently deleted from D1 | **PASS** |
| **INT-25** | Scenario 4 | Chat conversations permanently deleted from D1 | **PASS** |
| **INT-26** | Scenario 4 | Subscriptions permanently deleted from D1 | **PASS** |
| **INT-27** | Scenario 4 | Deletion request marked `completed` upon clean finish | **PASS** |
| **INT-28** | Scenario 4 | `completed_at` timestamp recorded | **PASS** |
| **INT-29** | Scenario 4 | Audit metadata logged correctly without PII | **PASS** |
| **INT-30** | Scenario 5 | Single-tenant user (u1) deactivated globally (`is_active = 0`) | **PASS** |
| **INT-31** | Scenario 5 | Single-tenant user session revoked (`revoked_at IS NOT NULL`) | **PASS** |
| **INT-32** | Scenario 5 | **CRITICAL:** Shared user (u2) remains ACTIVE globally (`is_active = 1`) | **PASS** |
| **INT-33** | Scenario 5 | **CRITICAL:** Shared user session remains VALID and UNREVOKED | **PASS** |
| **INT-34** | Scenario 5 | **CRITICAL:** Shared user retains full membership and Admin role in Org B | **PASS** |
| **INT-35** | Scenario 6 | Control Org B remains completely intact | **PASS** |
| **INT-36** | Scenario 6 | Control Org B tasks remain intact | **PASS** |
| **INT-37** | Scenario 6 | Control Org B pages remain intact | **PASS** |
| **INT-38** | Scenario 6 | Control Org B invoices remain intact | **PASS** |
| **INT-39** | Scenario 6 | Control Org B KV file object remains intact in KV | **PASS** |
| **INT-40** | Scenario 7 | Repeated execution does not purge already completed requests | **PASS** |
| **INT-41** | Scenario 7 | Repeated execution produces zero errors (idempotency) | **PASS** |
| **INT-42** | Scenario 7 | Control Org B completely unaffected by repeated execution | **PASS** |

---

## 4. Test Suite Execution Summary

- **Total Assertions:** 75
- **Passed:** 75 (100%)
- **Failed:** 0
- **Regressions:** 0
- **Blocked:** 0
