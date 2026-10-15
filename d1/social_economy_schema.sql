-- VEYA Marketing -> Social Economy Schema
-- Supports social accounts, posts, metric snapshots, CSV import records, and refresh jobs
-- Compatible with Cloudflare D1 and SQLite

CREATE TABLE IF NOT EXISTS social_accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  organisation_id INTEGER NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
  created_by_user_id INTEGER NOT NULL REFERENCES users(id),
  platform TEXT NOT NULL CHECK (platform IN ('x', 'facebook', 'instagram', 'linkedin', 'reddit')),
  display_name TEXT NOT NULL,
  profile_url TEXT NOT NULL,
  collection_mode TEXT NOT NULL DEFAULT 'manual' CHECK (collection_mode IN ('public_crawl', 'manual', 'csv')),
  inspect_post_urls TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  tags TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  last_refreshed_at TEXT,
  last_refresh_status TEXT DEFAULT 'idle',
  last_refresh_message TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(organisation_id, platform, profile_url)
);

CREATE INDEX IF NOT EXISTS idx_social_acc_org ON social_accounts(organisation_id);
CREATE INDEX IF NOT EXISTS idx_social_acc_platform ON social_accounts(organisation_id, platform);
CREATE INDEX IF NOT EXISTS idx_social_acc_client ON social_accounts(client_id);

CREATE TABLE IF NOT EXISTS social_posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  organisation_id INTEGER NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  social_account_id INTEGER REFERENCES social_accounts(id) ON DELETE SET NULL,
  client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
  created_by_user_id INTEGER NOT NULL REFERENCES users(id),
  platform TEXT NOT NULL CHECK (platform IN ('x', 'facebook', 'instagram', 'linkedin', 'reddit')),
  title TEXT NOT NULL,
  caption TEXT NOT NULL DEFAULT '',
  post_url TEXT,
  scheduled_at TEXT,
  published_at TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'planned', 'reminder_due', 'published', 'archived')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_social_posts_org_status ON social_posts(organisation_id, status);
CREATE INDEX IF NOT EXISTS idx_social_posts_account ON social_posts(social_account_id);
CREATE INDEX IF NOT EXISTS idx_social_posts_published ON social_posts(organisation_id, published_at);

CREATE TABLE IF NOT EXISTS social_metric_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  organisation_id INTEGER NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  social_post_id INTEGER NOT NULL REFERENCES social_posts(id) ON DELETE CASCADE,
  social_account_id INTEGER REFERENCES social_accounts(id) ON DELETE SET NULL,
  recorded_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  source TEXT NOT NULL CHECK (source IN ('manual', 'csv', 'public_crawl')),
  snapshot_date TEXT NOT NULL,
  impressions INTEGER,
  reach INTEGER,
  likes INTEGER,
  comments INTEGER,
  shares INTEGER,
  clicks INTEGER,
  saves INTEGER,
  profile_visits INTEGER,
  followers_count INTEGER,
  engagement_rate REAL,
  notes TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_social_metrics_post ON social_metric_snapshots(social_post_id, snapshot_date);
CREATE INDEX IF NOT EXISTS idx_social_metrics_org ON social_metric_snapshots(organisation_id, snapshot_date);

CREATE TABLE IF NOT EXISTS social_import_jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  organisation_id INTEGER NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  created_by_user_id INTEGER NOT NULL REFERENCES users(id),
  filename TEXT NOT NULL,
  total_rows INTEGER NOT NULL DEFAULT 0,
  imported_rows INTEGER NOT NULL DEFAULT 0,
  updated_rows INTEGER NOT NULL DEFAULT 0,
  failed_rows INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_log TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_social_import_org ON social_import_jobs(organisation_id);

CREATE TABLE IF NOT EXISTS social_refresh_jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  organisation_id INTEGER NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  social_account_id INTEGER REFERENCES social_accounts(id) ON DELETE CASCADE,
  triggered_by_user_id INTEGER REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'restricted')),
  source TEXT NOT NULL,
  records_inspected INTEGER NOT NULL DEFAULT 0,
  records_updated INTEGER NOT NULL DEFAULT 0,
  error_message TEXT DEFAULT '',
  started_at TEXT,
  completed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_social_refresh_org ON social_refresh_jobs(organisation_id, status);
CREATE INDEX IF NOT EXISTS idx_social_refresh_account ON social_refresh_jobs(social_account_id);
