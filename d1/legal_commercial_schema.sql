-- ==============================================================================
-- VEYA — LEGAL & COMMERCIAL FOUNDATION MIGRATION (D1 PRODUCTION SAFE)
-- ==============================================================================

-- 1. Legal Documents Catalog (Versioning and Active Status)
CREATE TABLE IF NOT EXISTS legal_documents (
  id TEXT PRIMARY KEY,
  document_type TEXT NOT NULL, -- 'TERMS_OF_SERVICE', 'PRIVACY_POLICY', 'DPA', 'SLA', 'ACCEPTABLE_USE', 'DATA_RETENTION', 'SECURITY_OVERVIEW', 'ORDER_FORM'
  version TEXT NOT NULL, -- e.g. '1.0'
  title TEXT NOT NULL,
  summary TEXT,
  effective_date TEXT NOT NULL,
  published_date TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  changelog_notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_legal_docs_type_version ON legal_documents(document_type, version);
CREATE INDEX IF NOT EXISTS idx_legal_docs_active ON legal_documents(document_type, is_active);

-- 2. Legal Acceptances (Immutable audit log of user & organization consent)
CREATE TABLE IF NOT EXISTS legal_acceptances (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  organisation_id INTEGER, -- Nullable for initial user signup before workspace selection/creation
  document_type TEXT NOT NULL,
  document_version TEXT NOT NULL,
  acceptance_type TEXT NOT NULL, -- 'SIGNUP_CHECKBOX', 'ONBOARDING_MODAL', 'WORKSPACE_ADMIN_EXECUTION', 'CONTRACT_ORDER_FORM'
  ip_address TEXT, -- Recorded lawfully for compliance proof without superfluous logging
  user_agent TEXT,
  accepted_at TEXT NOT NULL DEFAULT (datetime('now')),
  metadata TEXT, -- JSON string for supplementary contractual context
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (organisation_id) REFERENCES organisations(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_legal_acceptances_user ON legal_acceptances(user_id);
CREATE INDEX IF NOT EXISTS idx_legal_acceptances_org ON legal_acceptances(organisation_id);
CREATE INDEX IF NOT EXISTS idx_legal_acceptances_lookup ON legal_acceptances(user_id, document_type, document_version);

-- 3. Commercial Organization Subscriptions & Contracts
CREATE TABLE IF NOT EXISTS organisation_subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  organisation_id INTEGER NOT NULL UNIQUE,
  plan_id TEXT NOT NULL DEFAULT 'free', -- 'free', 'pro', 'business', 'enterprise'
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'trialing', 'past_due', 'canceled', 'expired'
  seat_limit INTEGER, -- Null for custom/unlimited
  billing_interval TEXT NOT NULL DEFAULT 'monthly', -- 'monthly', 'annually', 'custom'
  currency TEXT NOT NULL DEFAULT 'USD',
  price_per_seat REAL,
  dpa_accepted_at TEXT,
  dpa_accepted_by_user_id INTEGER,
  current_period_start TEXT,
  current_period_end TEXT,
  trial_ends_at TEXT,
  canceled_at TEXT,
  billing_legal_name TEXT,
  billing_address TEXT,
  billing_tax_id TEXT, -- TRN / VAT registration number
  billing_contact_email TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (organisation_id) REFERENCES organisations(id) ON DELETE CASCADE,
  FOREIGN KEY (dpa_accepted_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_org_subs_org ON organisation_subscriptions(organisation_id);
CREATE INDEX IF NOT EXISTS idx_org_subs_status ON organisation_subscriptions(status);

-- 4. Customer Data Deletion & Export Requests Audit
CREATE TABLE IF NOT EXISTS customer_deletion_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  organisation_id INTEGER NOT NULL,
  requested_by_user_id INTEGER NOT NULL,
  request_type TEXT NOT NULL, -- 'WORKSPACE_DELETION', 'USER_DATA_ERASURE', 'ACCOUNT_TERMINATION'
  status TEXT NOT NULL DEFAULT 'pending_review', -- 'pending_review', 'scheduled', 'completed', 'rejected', 'canceled'
  scheduled_purge_at TEXT, -- Grace period date (30 days default)
  completed_at TEXT,
  rejection_reason TEXT,
  confirmation_token TEXT,
  audit_metadata TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (organisation_id) REFERENCES organisations(id) ON DELETE CASCADE,
  FOREIGN KEY (requested_by_user_id) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_deletion_requests_org ON customer_deletion_requests(organisation_id);

-- 5. Seed Initial Legal Documents Catalog (Version 1.0)
INSERT OR REPLACE INTO legal_documents (id, document_type, version, title, summary, effective_date, published_date, is_active, changelog_notes)
VALUES 
('tos_v1', 'TERMS_OF_SERVICE', '1.0', 'VEYA Terms of Service', 'Governs access to VEYA workspaces, user accounts, customer content ownership, and operational acceptable use.', '2026-10-08', '2026-10-08', 1, 'Initial commercial release for UAE & global B2B operations.'),
('privacy_v1', 'PRIVACY_POLICY', '1.0', 'VEYA Privacy Policy', 'Details data processing activities, lawful basis under UAE PDPL, retention periods, and data subject rights.', '2026-10-08', '2026-10-08', 1, 'Initial commercial release matching Cloudflare and Google Workspace infrastructure.'),
('dpa_v1', 'DPA', '1.0', 'VEYA Data Processing Agreement', 'Defines B2B Customer Controller vs VEYA Processor obligations, security measures, and subprocessor authorizations.', '2026-10-08', '2026-10-08', 1, 'Standard B2B DPA with Appendices covering technical and organizational security measures.'),
('sla_v1', 'SLA', '1.0', 'VEYA Service Level Agreement', 'Outlines service target availability, support response time tiers, and maintenance communication windows.', '2026-10-08', '2026-10-08', 1, 'Initial commercial SLA with 99.5% availability target for edge architecture.'),
('aup_v1', 'ACCEPTABLE_USE', '1.0', 'VEYA Acceptable Use Policy', 'Specifies prohibited security actions, unauthorized access attempts, abusive content, and API boundaries.', '2026-10-08', '2026-10-08', 1, 'Initial operational acceptable use policy.'),
('retention_v1', 'DATA_RETENTION', '1.0', 'VEYA Data Retention & Deletion Policy', 'Details lifecycle timelines for active, archived, soft-deleted, and customer-requested hard deletion.', '2026-10-08', '2026-10-08', 1, 'Initial data retention and deletion schedule.'),
('security_v1', 'SECURITY_OVERVIEW', '1.0', 'VEYA Security & Privacy Architecture', 'Technical overview of tenant isolation, edge encryption in transit, session auth, and access control model.', '2026-10-08', '2026-10-08', 1, 'Initial customer-facing security architecture overview.'),
('order_form_v1', 'ORDER_FORM', '1.0', 'VEYA Master Subscription Order Form', 'Standard contractual order form template for B2B commercial agreements, plan tiers, and seat commitments.', '2026-10-08', '2026-10-08', 1, 'Initial enterprise customer order form template.');

-- 6. Initialize Existing Production Organisations with Default Active Subscriptions
INSERT OR IGNORE INTO organisation_subscriptions (organisation_id, plan_id, status, seat_limit, billing_interval, currency, price_per_seat, created_at, updated_at)
SELECT id, 'pro', 'active', 25, 'monthly', 'USD', 12.0, datetime('now'), datetime('now')
FROM organisations;
