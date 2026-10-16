-- VEYA Social Economy - Follower Growth Tracking Schema Extension
-- Adds social_follower_snapshots and current_followers to social_accounts
-- Append-only historical tracking per account

ALTER TABLE social_accounts ADD COLUMN current_followers INTEGER DEFAULT NULL;
ALTER TABLE social_accounts ADD COLUMN last_successful_check_at TEXT DEFAULT NULL;

CREATE TABLE IF NOT EXISTS social_follower_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  organisation_id INTEGER NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  social_account_id INTEGER NOT NULL REFERENCES social_accounts(id) ON DELETE CASCADE,
  follower_count INTEGER NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('manual', 'csv', 'public_crawl')),
  observation_timestamp TEXT NOT NULL,
  notes TEXT DEFAULT '',
  refresh_job_id INTEGER REFERENCES social_refresh_jobs(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_follower_snap_acc_time ON social_follower_snapshots(social_account_id, observation_timestamp);
CREATE INDEX IF NOT EXISTS idx_follower_snap_org_time ON social_follower_snapshots(organisation_id, observation_timestamp);
