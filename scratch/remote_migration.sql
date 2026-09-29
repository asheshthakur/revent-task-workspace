-- 1. Create organisations table
CREATE TABLE IF NOT EXISTS organisations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  logo TEXT DEFAULT '',
  created_by_user_id INTEGER,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 2. Create organisation_members table
CREATE TABLE IF NOT EXISTS organisation_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  organisation_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'invited', 'deactivated')),
  department TEXT DEFAULT '',
  joined_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (organisation_id) REFERENCES organisations(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE (organisation_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_org_members_user ON organisation_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org ON organisation_members(organisation_id);

-- 3. Create organisation_invitations table
CREATE TABLE IF NOT EXISTS organisation_invitations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  organisation_id INTEGER NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  token TEXT NOT NULL UNIQUE,
  invited_by_user_id INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'revoked', 'expired')),
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (organisation_id) REFERENCES organisations(id) ON DELETE CASCADE,
  FOREIGN KEY (invited_by_user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_org_invitations_token ON organisation_invitations(token);
CREATE INDEX IF NOT EXISTS idx_org_invitations_email ON organisation_invitations(email);

-- 4. Alter tables to add organisation_id
ALTER TABLE tasks ADD COLUMN organisation_id INTEGER DEFAULT 1;
ALTER TABLE task_assignment_history ADD COLUMN organisation_id INTEGER DEFAULT 1;
ALTER TABLE task_status_history ADD COLUMN organisation_id INTEGER DEFAULT 1;
ALTER TABLE conversations ADD COLUMN organisation_id INTEGER DEFAULT 1;
ALTER TABLE audit_logs ADD COLUMN organisation_id INTEGER DEFAULT 1;

-- 5. Add indexes
CREATE INDEX IF NOT EXISTS idx_tasks_org ON tasks(organisation_id);
CREATE INDEX IF NOT EXISTS idx_assign_history_org ON task_assignment_history(organisation_id);
CREATE INDEX IF NOT EXISTS idx_status_history_org ON task_status_history(organisation_id);
CREATE INDEX IF NOT EXISTS idx_conversations_org ON conversations(organisation_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_org ON audit_logs(organisation_id);

-- 6. Insert initial Revent organisation
INSERT OR IGNORE INTO organisations (id, name, slug, logo, created_by_user_id, is_active, created_at, updated_at)
VALUES (1, 'Revent', 'revent', '', 7, 1, '2026-09-20T00:00:00.000Z', '2026-09-20T00:00:00.000Z');

-- 7. Populate organisation_members for all existing users
INSERT OR IGNORE INTO organisation_members (organisation_id, user_id, role, status, department, joined_at, created_at)
SELECT 
  1, 
  id, 
  CASE WHEN role = 'admin' THEN 'admin' ELSE 'member' END, 
  'active', 
  COALESCE(department, ''), 
  COALESCE(created_at, '2026-09-20T00:00:00.000Z'), 
  COALESCE(created_at, '2026-09-20T00:00:00.000Z')
FROM users;

-- Ensure Admin (id 7) is marked as owner
UPDATE organisation_members SET role = 'owner' WHERE organisation_id = 1 AND user_id = 7;
