import Database from 'better-sqlite3';

console.log('=== VEYA D1 SCHEDULED PURGE INTEGRATION & RETRY SAFETY TEST SUITE ===');

// In-memory SQLite with foreign keys
const rawDb = new Database(':memory:');
rawDb.pragma('foreign_keys = ON');

// 1. Build Full D1 Production Schema
rawDb.exec(`
  CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'employee')),
    department TEXT DEFAULT '',
    animal_emoji TEXT DEFAULT '🦊',
    selected_status TEXT DEFAULT 'Online',
    is_active INTEGER NOT NULL DEFAULT 1,
    last_login_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    session_token_hash TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL,
    last_heartbeat_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    revoked_at TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE password_reset_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token_hash TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    used_at TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE organisations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    logo TEXT DEFAULT '',
    created_by_user_id INTEGER,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE organisation_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    organisation_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'manager', 'member', 'guest')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'invited', 'deactivated')),
    department TEXT DEFAULT '',
    joined_at TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (organisation_id) REFERENCES organisations(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE (organisation_id, user_id)
  );

  CREATE TABLE organisation_invitations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    organisation_id INTEGER NOT NULL,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'member',
    token TEXT NOT NULL UNIQUE,
    invited_by_user_id INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (organisation_id) REFERENCES organisations(id) ON DELETE CASCADE
  );

  CREATE TABLE organisation_subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    organisation_id INTEGER NOT NULL UNIQUE,
    plan_id TEXT NOT NULL DEFAULT 'free',
    status TEXT NOT NULL DEFAULT 'active',
    seat_limit INTEGER,
    billing_interval TEXT NOT NULL DEFAULT 'monthly',
    currency TEXT NOT NULL DEFAULT 'USD',
    price_per_seat REAL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (organisation_id) REFERENCES organisations(id) ON DELETE CASCADE
  );

  CREATE TABLE customer_deletion_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    organisation_id INTEGER NOT NULL,
    requested_by_user_id INTEGER NOT NULL,
    request_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending_review',
    scheduled_purge_at TEXT,
    completed_at TEXT,
    rejection_reason TEXT,
    confirmation_token TEXT,
    audit_metadata TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    organisation_id INTEGER NOT NULL,
    task_name TEXT NOT NULL,
    description TEXT NOT NULL,
    assigned_to INTEGER NOT NULL,
    created_by INTEGER NOT NULL,
    priority TEXT NOT NULL,
    priority_rank INTEGER NOT NULL,
    status TEXT NOT NULL,
    drive_link TEXT DEFAULT '',
    due_date TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    department TEXT DEFAULT '',
    is_archived INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (assigned_to) REFERENCES users(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
  );

  CREATE TABLE task_assignment_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    organisation_id INTEGER NOT NULL,
    task_id INTEGER NOT NULL,
    assigned_by_user_id INTEGER NOT NULL,
    assigned_to_user_id INTEGER NOT NULL,
    assigned_at TEXT NOT NULL,
    notes TEXT DEFAULT ''
  );

  CREATE TABLE task_status_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    organisation_id INTEGER NOT NULL,
    task_id INTEGER NOT NULL,
    changed_by_user_id INTEGER NOT NULL,
    old_status TEXT NOT NULL,
    new_status TEXT NOT NULL,
    changed_at TEXT NOT NULL
  );

  CREATE TABLE task_checklists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL,
    item_text TEXT NOT NULL,
    is_completed INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );

  CREATE TABLE task_dependencies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL,
    depends_on_task_id INTEGER NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE task_activities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    organisation_id INTEGER NOT NULL,
    task_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    activity_type TEXT NOT NULL,
    new_value TEXT DEFAULT '',
    details TEXT DEFAULT '',
    created_at TEXT NOT NULL
  );

  CREATE TABLE conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    organisation_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    name TEXT DEFAULT '',
    created_by INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE conversation_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    joined_at TEXT NOT NULL,
    last_read_at TEXT NOT NULL,
    UNIQUE (conversation_id, user_id)
  );

  CREATE TABLE messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER NOT NULL,
    sender_user_id INTEGER NOT NULL,
    message TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE message_reactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    message_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    emoji TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    organisation_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    created_by INTEGER NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE milestones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE guest_project_access (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    organisation_id INTEGER NOT NULL,
    project_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE pages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    organisation_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    content TEXT DEFAULT '',
    created_by INTEGER NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE page_favorites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    page_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE page_task_links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    page_id INTEGER NOT NULL,
    task_id INTEGER NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE guest_page_access (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    organisation_id INTEGER NOT NULL,
    page_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE guest_feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    organisation_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    feedback TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE time_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    organisation_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    task_id INTEGER,
    duration_seconds INTEGER NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE user_work_capacity (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    organisation_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    weekly_hours REAL NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE calendar_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    organisation_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    start_at TEXT NOT NULL,
    created_by INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'scheduled',
    reminder_sent INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );

  CREATE TABLE event_attendees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    response TEXT NOT NULL DEFAULT 'accepted'
  );

  CREATE TABLE meeting_action_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    meeting_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE event_page_links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER NOT NULL,
    page_id INTEGER NOT NULL
  );

  CREATE TABLE event_task_links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER NOT NULL,
    task_id INTEGER NOT NULL
  );

  CREATE TABLE automations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    organisation_id INTEGER NOT NULL,
    trigger_type TEXT NOT NULL,
    is_enabled INTEGER NOT NULL DEFAULT 1,
    conditions TEXT DEFAULT '[]',
    actions TEXT DEFAULT '[]',
    created_by INTEGER NOT NULL,
    last_run_at TEXT,
    success_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE automation_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    organisation_id INTEGER NOT NULL,
    automation_id INTEGER NOT NULL,
    event_type TEXT NOT NULL,
    event_reference TEXT NOT NULL,
    idempotency_key TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL,
    details TEXT DEFAULT '',
    error TEXT,
    created_at TEXT NOT NULL,
    completed_at TEXT
  );

  CREATE TABLE clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    organisation_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    organisation_id INTEGER NOT NULL,
    client_id INTEGER NOT NULL,
    invoice_number TEXT NOT NULL,
    amount REAL NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE pdc_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    organisation_id INTEGER NOT NULL,
    cheque_number TEXT NOT NULL,
    amount REAL NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    organisation_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE finance_documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    organisation_id INTEGER NOT NULL,
    filename TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    organisation_id INTEGER NOT NULL,
    filename TEXT NOT NULL,
    storage_key TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE file_blobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    storage_key TEXT NOT NULL UNIQUE,
    organisation_id INTEGER NOT NULL,
    mime_type TEXT NOT NULL,
    file_size_bytes INTEGER NOT NULL,
    blob_data TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE file_attachments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    organisation_id INTEGER NOT NULL,
    file_id INTEGER NOT NULL,
    attached_by_user_id INTEGER NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE notification_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    organisation_id INTEGER NOT NULL,
    recipient_user_id INTEGER NOT NULL,
    actor_user_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    target_url TEXT DEFAULT '',
    entity_type TEXT DEFAULT '',
    entity_id INTEGER,
    is_read INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );

  CREATE TABLE legal_acceptances (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    organisation_id INTEGER,
    document_type TEXT NOT NULL,
    document_version TEXT NOT NULL,
    acceptance_type TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    organisation_id INTEGER,
    user_id INTEGER NOT NULL,
    action_type TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id INTEGER,
    entity_title TEXT DEFAULT '',
    old_value TEXT DEFAULT '',
    new_value TEXT DEFAULT '',
    created_at TEXT NOT NULL
  );
`);

// 2. Simulated Cloudflare KV Namespace
const mockKvStore = new Map();
const mockFilesKv = {
  async put(key, value, options) {
    mockKvStore.set(key, { value, options });
  },
  async get(key) {
    return mockKvStore.get(key) || null;
  },
  async delete(key) {
    mockKvStore.delete(key);
  },
  async list() {
    return { keys: Array.from(mockKvStore.keys()).map(name => ({ name })) };
  }
};

// 3. Simulated D1 Binding wrapping SQLite
let injectFailureInClients = false;

const d1Db = {
  prepare(sql) {
    return {
      bind(...params) {
        return {
          all: async () => {
            return { results: rawDb.prepare(sql).all(...params) };
          },
          run: async () => {
            // Fault injection simulation for transactional boundary testing
            if (injectFailureInClients && sql.includes('DELETE FROM clients WHERE organisation_id')) {
              throw new Error('Simulated transient DB error during clients deletion');
            }
            const res = rawDb.prepare(sql).run(...params);
            return { meta: { changes: res.changes, last_row_id: res.lastInsertRowid } };
          },
          first: async () => {
            return rawDb.prepare(sql).get(...params);
          },
        };
      },
      all: async () => {
        return { results: rawDb.prepare(sql).all() };
      },
      run: async () => {
        const res = rawDb.prepare(sql).run();
        return { meta: { changes: res.changes, last_row_id: res.lastInsertRowid } };
      },
      first: async () => {
        return rawDb.prepare(sql).get();
      },
    };
  }
};

// Test accounting
let testsPassed = 0;
let testsFailed = 0;

function assert(condition, name) {
  if (condition) {
    console.log(`  ✓ PASS: ${name}`);
    testsPassed++;
  } else {
    console.error(`  ✗ FAIL: ${name}`);
    testsFailed++;
  }
}

async function runIntegrationSuite() {
  const now = new Date().toISOString();
  console.log('\n--- Step 1: Populating Synthetic Workspaces & Shared Users ---');

  // Insert Users:
  // User 1: Single-Tenant (Only belongs to Org A)
  // User 2: Shared User (Belongs to Org A AND Org B)
  // User 3: Control User (Only belongs to Org B)
  const insertUser = rawDb.prepare(`
    INSERT INTO users (name, email, password_hash, role, created_at, updated_at)
    VALUES (?, ?, 'dummy_hash', 'employee', ?, ?)
  `);
  const u1Id = Number(insertUser.run('User 1 SingleTenant', 'user1@target.test', now, now).lastInsertRowid);
  const u2Id = Number(insertUser.run('User 2 SharedUser', 'user2@shared.test', now, now).lastInsertRowid);
  const u3Id = Number(insertUser.run('User 3 ControlUser', 'user3@control.test', now, now).lastInsertRowid);

  // Active sessions for all users
  const insertSession = rawDb.prepare(`
    INSERT INTO sessions (user_id, session_token_hash, created_at, last_heartbeat_at, expires_at)
    VALUES (?, ?, ?, ?, ?)
  `);
  const futureExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  insertSession.run(u1Id, 'session_hash_user1', now, now, futureExpires);
  insertSession.run(u2Id, 'session_hash_user2', now, now, futureExpires);
  insertSession.run(u3Id, 'session_hash_user3', now, now, futureExpires);

  // Organizations:
  // Org A: Target for purge (ID: 101)
  // Org B: Control organization (ID: 102)
  const insertOrg = rawDb.prepare(`
    INSERT INTO organisations (name, slug, created_by_user_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `);
  const orgAId = Number(insertOrg.run('Target Org A', 'target-org-a', u1Id, now, now).lastInsertRowid);
  const orgBId = Number(insertOrg.run('Control Org B', 'control-org-b', u3Id, now, now).lastInsertRowid);

  // Memberships:
  const insertMember = rawDb.prepare(`
    INSERT INTO organisation_members (organisation_id, user_id, role, joined_at, created_at)
    VALUES (?, ?, ?, ?, ?)
  `);
  insertMember.run(orgAId, u1Id, 'owner', now, now);
  insertMember.run(orgAId, u2Id, 'member', now, now); // u2 belongs to Org A
  insertMember.run(orgBId, u2Id, 'admin', now, now);  // u2 ALSO belongs to Org B (Shared!)
  insertMember.run(orgBId, u3Id, 'owner', now, now);

  // Store physical object in mock FILES_KV
  const targetKvKey = `files/${orgAId}/target_secret_doc.pdf`;
  const controlKvKey = `files/${orgBId}/control_doc.pdf`;
  await mockFilesKv.put(targetKvKey, Buffer.from('TARGET ORG A PRIVATE CONTENT'));
  await mockFilesKv.put(controlKvKey, Buffer.from('CONTROL ORG B PERSISTENT CONTENT'));

  // Populate Org A with comprehensive data across ALL domain tables:
  rawDb.prepare(`INSERT INTO files (organisation_id, filename, storage_key, created_at) VALUES (?, 'target.pdf', ?, ?)`).run(orgAId, targetKvKey, now);
  rawDb.prepare(`INSERT INTO file_blobs (storage_key, organisation_id, mime_type, file_size_bytes, blob_data, created_at) VALUES (?, ?, 'application/pdf', 100, 'ZHVtbXk=', ?)`).run(targetKvKey, orgAId, now);
  rawDb.prepare(`INSERT INTO file_attachments (organisation_id, file_id, attached_by_user_id, created_at) VALUES (?, 1, ?, ?)`).run(orgAId, u1Id, now);
  rawDb.prepare(`INSERT INTO tasks (organisation_id, task_name, description, assigned_to, created_by, priority, priority_rank, status, created_at, updated_at) VALUES (?, 'Target Task', 'desc', ?, ?, 'High', 1, 'Started', ?, ?)`).run(orgAId, u2Id, u1Id, now, now);
  rawDb.prepare(`INSERT INTO task_activities (organisation_id, task_id, user_id, activity_type, created_at) VALUES (?, 1, ?, 'created', ?)`).run(orgAId, u1Id, now);
  rawDb.prepare(`INSERT INTO conversations (organisation_id, type, created_by, created_at, updated_at) VALUES (?, 'group', ?, ?, ?)`).run(orgAId, u1Id, now, now);
  rawDb.prepare(`INSERT INTO conversation_members (conversation_id, user_id, joined_at, last_read_at) VALUES (1, ?, ?, ?)`).run(u1Id, now, now);
  rawDb.prepare(`INSERT INTO messages (conversation_id, sender_user_id, message, created_at) VALUES (1, ?, 'Confidential Org A Chat', ?)`).run(u1Id, now);
  rawDb.prepare(`INSERT INTO projects (organisation_id, name, created_by, created_at) VALUES (?, 'Target Project', ?, ?)`).run(orgAId, u1Id, now);
  rawDb.prepare(`INSERT INTO milestones (project_id, title, created_at) VALUES (1, 'Milestone 1', ?)`).run(now);
  rawDb.prepare(`INSERT INTO pages (organisation_id, title, created_by, created_at) VALUES (?, 'Target Wiki', ?, ?)`).run(orgAId, u1Id, now);
  rawDb.prepare(`INSERT INTO calendar_events (organisation_id, title, start_at, created_by, created_at) VALUES (?, 'Target Meeting', ?, ?, ?)`).run(orgAId, now, u1Id, now);
  rawDb.prepare(`INSERT INTO clients (organisation_id, name, created_at) VALUES (?, 'Target Client', ?)`).run(orgAId, now);
  rawDb.prepare(`INSERT INTO invoices (organisation_id, client_id, invoice_number, amount, created_at) VALUES (?, 1, 'INV-T01', 999.0, ?)`).run(orgAId, now);
  rawDb.prepare(`INSERT INTO organisation_subscriptions (organisation_id, plan_id, created_at, updated_at) VALUES (?, 'pro', ?, ?)`).run(orgAId, now, now);
  rawDb.prepare(`INSERT INTO legal_acceptances (user_id, organisation_id, document_type, document_version, acceptance_type) VALUES (?, ?, 'TERMS', '1.1', 'SIGNUP')`).run(u1Id, orgAId);

  // Populate Org B with Control Data:
  rawDb.prepare(`INSERT INTO files (organisation_id, filename, storage_key, created_at) VALUES (?, 'control.pdf', ?, ?)`).run(orgBId, controlKvKey, now);
  rawDb.prepare(`INSERT INTO file_blobs (storage_key, organisation_id, mime_type, file_size_bytes, blob_data, created_at) VALUES (?, ?, 'application/pdf', 100, 'Y29udHJvbA==', ?)`).run(controlKvKey, orgBId, now);
  rawDb.prepare(`INSERT INTO tasks (organisation_id, task_name, description, assigned_to, created_by, priority, priority_rank, status, created_at, updated_at) VALUES (?, 'Control Task', 'desc', ?, ?, 'High', 1, 'Started', ?, ?)`).run(orgBId, u2Id, u3Id, now, now);
  rawDb.prepare(`INSERT INTO pages (organisation_id, title, created_by, created_at) VALUES (?, 'Control Wiki', ?, ?)`).run(orgBId, u3Id, now);
  rawDb.prepare(`INSERT INTO clients (organisation_id, name, created_at) VALUES (?, 'Control Client', ?)`).run(orgBId, now);
  rawDb.prepare(`INSERT INTO invoices (organisation_id, client_id, invoice_number, amount, created_at) VALUES (?, 2, 'INV-C01', 4500.0, ?)`).run(orgBId, now);
  rawDb.prepare(`INSERT INTO organisation_subscriptions (organisation_id, plan_id, created_at, updated_at) VALUES (?, 'pro', ?, ?)`).run(orgBId, now, now);

  assert(rawDb.prepare(`SELECT COUNT(*) as count FROM tasks WHERE organisation_id = ?`).get(orgAId).count === 1, 'Org A data seeded');
  assert(rawDb.prepare(`SELECT COUNT(*) as count FROM tasks WHERE organisation_id = ?`).get(orgBId).count === 1, 'Org B control data seeded');
  assert(mockKvStore.has(targetKvKey), 'Target file object exists in KV store');
  assert(mockKvStore.has(controlKvKey), 'Control file object exists in KV store');

  // Import retentionSweep directly
  const { runRetentionSweepWithDb } = await import('../src/lib/retentionSweep.js').catch(async () => {
    return await import('../src/lib/retentionSweep.ts');
  });

  // =========================================================================
  // SCENARIO 1: Grace Period Active (Purge should NOT run)
  // =========================================================================
  console.log('\n--- Scenario 1: Deletion Request within Active 30-Day Grace Period ---');
  const futurePurge = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const delReqRes = rawDb.prepare(`
    INSERT INTO customer_deletion_requests (
      organisation_id, requested_by_user_id, request_type, status, scheduled_purge_at, created_at
    ) VALUES (?, ?, 'WORKSPACE_DELETION', 'scheduled', ?, ?)
  `).run(orgAId, u1Id, futurePurge, now);
  const delReqId = Number(delReqRes.lastInsertRowid);

  const resGrace = await runRetentionSweepWithDb(d1Db, mockFilesKv);
  assert(resGrace.purgedWorkspacesCount === 0, 'Retention sweep skips deletion during active grace period');
  assert(rawDb.prepare(`SELECT id FROM organisations WHERE id = ?`).get(orgAId) !== undefined, 'Org A remains fully intact during grace period');
  assert(mockKvStore.has(targetKvKey), 'Target KV file object remains intact during grace period');

  // =========================================================================
  // SCENARIO 2: Grace Period Elapsed + Partial Failure Injection
  // =========================================================================
  console.log('\n--- Scenario 2: Partial Failure Handling & False Completion Guard ---');
  // Set scheduled_purge_at in the past
  const pastPurge = new Date(Date.now() - 10000).toISOString();
  rawDb.prepare(`UPDATE customer_deletion_requests SET scheduled_purge_at = ? WHERE id = ?`).run(pastPurge, delReqId);

  // Inject failure when deleting clients table
  injectFailureInClients = true;

  const resPartialFail = await runRetentionSweepWithDb(d1Db, mockFilesKv);
  assert(resPartialFail.failedWorkspacesCount === 1, 'Partial failure detected and counted as failure');
  assert(resPartialFail.purgedWorkspacesCount === 0, 'Partial failure did NOT count as purged');

  // Check request row in DB:
  const reqAfterFail = rawDb.prepare(`SELECT status, completed_at, audit_metadata FROM customer_deletion_requests WHERE id = ?`).get(delReqId);
  assert(reqAfterFail.status === 'scheduled', 'CRITICAL: Partial failure did NOT mark status complete prematurely (status remains "scheduled")');
  assert(reqAfterFail.completed_at === null, 'completed_at timestamp remains null');
  assert(reqAfterFail.audit_metadata.includes('retryPending'), 'Audit metadata records retry pending status');

  // Org B must be 100% unaffected
  assert(rawDb.prepare(`SELECT id FROM organisations WHERE id = ?`).get(orgBId) !== undefined, 'Control Org B remains intact despite partial failure in Org A');

  // =========================================================================
  // SCENARIO 3: Retry & Successful Completion
  // =========================================================================
  console.log('\n--- Scenario 3: Retry Execution & Complete Cascading Erasure ---');
  // Remove simulated failure
  injectFailureInClients = false;

  const resRetry = await runRetentionSweepWithDb(d1Db, mockFilesKv);
  assert(resRetry.purgedWorkspacesCount === 1, 'Retry successfully purged Org A');
  assert(resRetry.failedWorkspacesCount === 0, 'Zero failures on clean retry');

  // =========================================================================
  // SCENARIO 4: Verify Post-Deletion State of Org A
  // =========================================================================
  console.log('\n--- Scenario 4: Post-Deletion State Verification ---');
  // 4.1 Underlying Physical KV Object Purge
  assert(!mockKvStore.has(targetKvKey), 'CRITICAL: Physical file object was deleted from Cloudflare KV');

  // 4.2 Database Tables Purge
  assert(rawDb.prepare(`SELECT id FROM organisations WHERE id = ?`).get(orgAId) === undefined, 'Organisation row permanently purged');
  assert(rawDb.prepare(`SELECT COUNT(*) as c FROM tasks WHERE organisation_id = ?`).get(orgAId).c === 0, 'Tasks permanently purged');
  assert(rawDb.prepare(`SELECT COUNT(*) as c FROM files WHERE organisation_id = ?`).get(orgAId).c === 0, 'Files metadata permanently purged');
  assert(rawDb.prepare(`SELECT COUNT(*) as c FROM file_blobs WHERE organisation_id = ?`).get(orgAId).c === 0, 'File blobs fallback permanently purged');
  assert(rawDb.prepare(`SELECT COUNT(*) as c FROM pages WHERE organisation_id = ?`).get(orgAId).c === 0, 'Wiki pages permanently purged');
  assert(rawDb.prepare(`SELECT COUNT(*) as c FROM projects WHERE organisation_id = ?`).get(orgAId).c === 0, 'Projects permanently purged');
  assert(rawDb.prepare(`SELECT COUNT(*) as c FROM clients WHERE organisation_id = ?`).get(orgAId).c === 0, 'Clients permanently purged');
  assert(rawDb.prepare(`SELECT COUNT(*) as c FROM invoices WHERE organisation_id = ?`).get(orgAId).c === 0, 'Invoices permanently purged');
  assert(rawDb.prepare(`SELECT COUNT(*) as c FROM conversations WHERE organisation_id = ?`).get(orgAId).c === 0, 'Chat conversations permanently purged');
  assert(rawDb.prepare(`SELECT COUNT(*) as c FROM organisation_subscriptions WHERE organisation_id = ?`).get(orgAId).c === 0, 'Subscriptions permanently purged');

  // 4.3 Retained Audit Request Record
  const finalReq = rawDb.prepare(`SELECT status, completed_at, audit_metadata FROM customer_deletion_requests WHERE id = ?`).get(delReqId);
  assert(finalReq.status === 'completed', 'Deletion request marked status = "completed" upon clean finish');
  assert(finalReq.completed_at !== null, 'completed_at timestamp recorded');
  assert(finalReq.audit_metadata.includes('automated_retention_sweep'), 'Audit metadata logged correctly without PII');

  // =========================================================================
  // SCENARIO 5: Shared User vs Single-Tenant User Safety
  // =========================================================================
  console.log('\n--- Scenario 5: User Deactivation Boundaries (Single vs Shared) ---');
  const user1 = rawDb.prepare(`SELECT is_active FROM users WHERE id = ?`).get(u1Id);
  const user1Session = rawDb.prepare(`SELECT revoked_at FROM sessions WHERE user_id = ?`).get(u1Id);
  assert(user1.is_active === 0, 'Single-tenant user (u1) deactivated globally');
  assert(user1Session.revoked_at !== null, 'Single-tenant user session revoked');

  const user2 = rawDb.prepare(`SELECT is_active FROM users WHERE id = ?`).get(u2Id);
  const user2Session = rawDb.prepare(`SELECT revoked_at FROM sessions WHERE user_id = ?`).get(u2Id);
  assert(user2.is_active === 1, 'CRITICAL: Shared user (u2) remains ACTIVE globally');
  assert(user2Session.revoked_at === null, 'CRITICAL: Shared user session remains VALID and UNREVOKED');

  const user2OrgBMembership = rawDb.prepare(`SELECT role FROM organisation_members WHERE organisation_id = ? AND user_id = ?`).get(orgBId, u2Id);
  assert(user2OrgBMembership !== undefined && user2OrgBMembership.role === 'admin', 'CRITICAL: Shared user retains full membership and Admin role in Org B');

  // =========================================================================
  // SCENARIO 6: Control Organization B Complete Preservation
  // =========================================================================
  console.log('\n--- Scenario 6: Control Organization Preservation ---');
  assert(rawDb.prepare(`SELECT id FROM organisations WHERE id = ?`).get(orgBId) !== undefined, 'Control Org B intact');
  assert(rawDb.prepare(`SELECT COUNT(*) as c FROM tasks WHERE organisation_id = ?`).get(orgBId).c === 1, 'Control Org B task intact');
  assert(rawDb.prepare(`SELECT COUNT(*) as c FROM pages WHERE organisation_id = ?`).get(orgBId).c === 1, 'Control Org B page intact');
  assert(rawDb.prepare(`SELECT COUNT(*) as c FROM invoices WHERE organisation_id = ?`).get(orgBId).c === 1, 'Control Org B invoice intact');
  assert(mockKvStore.has(controlKvKey), 'Control Org B KV file object intact in KV');

  // =========================================================================
  // SCENARIO 7: Idempotency & Repeated Execution
  // =========================================================================
  console.log('\n--- Scenario 7: Idempotent Execution on Repeated Trigger ---');
  const resRepeat = await runRetentionSweepWithDb(d1Db, mockFilesKv);
  assert(resRepeat.purgedWorkspacesCount === 0, 'Repeated execution does not purge already completed requests');
  assert(resRepeat.failedWorkspacesCount === 0, 'Repeated execution produces zero errors');
  assert(rawDb.prepare(`SELECT COUNT(*) as c FROM tasks WHERE organisation_id = ?`).get(orgBId).c === 1, 'Control Org B data completely unaffected by repeated run');

  // Summary
  console.log('\n=================================================');
  console.log(`TOTAL INTEGRATION TESTS: ${testsPassed + testsFailed}`);
  console.log(`PASSED: ${testsPassed}`);
  console.log(`FAILED: ${testsFailed}`);
  console.log('=================================================');

  if (testsFailed > 0) process.exit(1);
}

runIntegrationSuite().catch(err => {
  console.error('Integration test failed:', err);
  process.exit(1);
});
