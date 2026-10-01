-- REVENT Task Workspace - Unified Notification System Schema
-- Compatible with Cloudflare D1 and SQLite

-- 1. User Notification Preferences
CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id INTEGER PRIMARY KEY,
  master_enabled INTEGER NOT NULL DEFAULT 1,
  in_app_enabled INTEGER NOT NULL DEFAULT 1,
  browser_enabled INTEGER NOT NULL DEFAULT 0,
  desktop_enabled INTEGER NOT NULL DEFAULT 1,
  tasks_enabled INTEGER NOT NULL DEFAULT 1,
  task_assignments INTEGER NOT NULL DEFAULT 1,
  task_status_changes INTEGER NOT NULL DEFAULT 1,
  task_deadlines INTEGER NOT NULL DEFAULT 1,
  task_discussions INTEGER NOT NULL DEFAULT 1,
  chat_messages INTEGER NOT NULL DEFAULT 1,
  finance_enabled INTEGER NOT NULL DEFAULT 1,
  mentions_enabled INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 2. Canonical Notification Events
CREATE TABLE IF NOT EXISTS notification_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  organisation_id INTEGER NOT NULL DEFAULT 1,
  recipient_user_id INTEGER NOT NULL,
  actor_user_id INTEGER,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  target_url TEXT NOT NULL,
  entity_type TEXT,
  entity_id INTEGER,
  is_read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  read_at TEXT,
  FOREIGN KEY (recipient_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (actor_user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notification_events(recipient_user_id, is_read, created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_org ON notification_events(organisation_id);

-- 3. Web Push Subscriptions
CREATE TABLE IF NOT EXISTS web_push_subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TEXT NOT NULL,
  last_used_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_web_push_user ON web_push_subscriptions(user_id);

-- 4. Desktop Device Registrations
CREATE TABLE IF NOT EXISTS desktop_devices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  device_id TEXT NOT NULL UNIQUE,
  device_name TEXT NOT NULL,
  platform TEXT NOT NULL,
  app_version TEXT NOT NULL,
  created_at TEXT NOT NULL,
  last_active_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_desktop_devices_user ON desktop_devices(user_id);
