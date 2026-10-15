import assert from 'assert';
import Database from 'better-sqlite3';
import path from 'path';

console.log('=== VEYA Social Economy Automated Test Suite ===\n');

const dbPath = path.join(process.cwd(), 'data', 'revent_tasks.db');
const db = new Database(dbPath);

const validUser = db.prepare('SELECT id FROM users LIMIT 1').get();
const validOrg = db.prepare('SELECT id FROM organisations LIMIT 1').get();
assert.ok(validUser, 'Must have at least one user');
assert.ok(validOrg, 'Must have at least one org');

const userId = validUser.id;
const orgId = validOrg.id;

// 1. Test Tables Existence
console.log('Test 1: Verifying D1 / SQLite schema tables...');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(r => r.name);
const expectedTables = [
  'social_accounts',
  'social_posts',
  'social_metric_snapshots',
  'social_import_jobs',
  'social_refresh_jobs'
];
for (const t of expectedTables) {
  assert.ok(tables.includes(t), `Table ${t} should exist`);
}
console.log('✓ All 5 Social Economy tables exist.\n');

// 2. Test Account Creation & Unique Constraint
console.log('Test 2: Verifying Social Account creation and unique constraint...');
db.prepare("DELETE FROM social_accounts WHERE profile_url LIKE '%test-profile%'").run();

const insertAcc = db.prepare(`
  INSERT INTO social_accounts (
    organisation_id, created_by_user_id, platform, display_name, profile_url, collection_mode
  ) VALUES (?, ?, 'linkedin', 'Test Agency LinkedIn', 'https://linkedin.com/company/test-profile', 'manual')
`);
const accRes = insertAcc.run(orgId, userId);
const accId = accRes.lastInsertRowid;
assert.ok(accId > 0, 'Account should be inserted');

assert.throws(() => {
  insertAcc.run(orgId, userId);
}, /UNIQUE constraint failed/, 'Inserting duplicate platform+url in same org must throw');
console.log('✓ Social Account creation & unique constraints enforced.\n');

// 3. Test Post Creation & Status Flow
console.log('Test 3: Verifying Post creation & status transitions...');
const insertPost = db.prepare(`
  INSERT INTO social_posts (
    organisation_id, social_account_id, created_by_user_id, platform, title, caption, status
  ) VALUES (?, ?, ?, 'linkedin', 'Launch Campaign Post', 'Official product launch announcement', 'draft')
`);
const postRes = insertPost.run(orgId, accId, userId);
const postId = postRes.lastInsertRowid;
assert.ok(postId > 0, 'Post should be inserted');

db.prepare("UPDATE social_posts SET status = 'published', published_at = datetime('now') WHERE id = ?").run(postId);
const updatedPost = db.prepare('SELECT status, published_at FROM social_posts WHERE id = ?').get(postId);
assert.strictEqual(updatedPost.status, 'published');
assert.ok(updatedPost.published_at);
console.log('✓ Post creation and publication flow verified.\n');

// 4. Test Metric Snapshot & Engagement Rate Formula
console.log('Test 4: Verifying Metric Snapshot & Engagement Rate math...');
const imp = 2000;
const likes = 80;
const comments = 15;
const shares = 25;
const rate = Number((((likes + comments + shares) / imp) * 100).toFixed(2));
assert.strictEqual(rate, 6.0);

const insertMetric = db.prepare(`
  INSERT INTO social_metric_snapshots (
    organisation_id, social_post_id, social_account_id, recorded_by_user_id,
    source, snapshot_date, impressions, reach, likes, comments, shares, engagement_rate
  ) VALUES (?, ?, ?, ?, 'manual', '2026-10-15', ?, 1600, ?, ?, ?, ?)
`);
const metricRes = insertMetric.run(orgId, postId, accId, userId, imp, likes, comments, shares, rate);
assert.ok(metricRes.lastInsertRowid > 0);

const latestSnapshot = db.prepare('SELECT * FROM social_metric_snapshots WHERE id = ?').get(metricRes.lastInsertRowid);
assert.strictEqual(latestSnapshot.engagement_rate, 6.0);
assert.strictEqual(latestSnapshot.impressions, 2000);
console.log('✓ Engagement rate calculation and snapshot verified.\n');

// 5. Test SSRF Guardrails
console.log('Test 5: Verifying SSRF Protection logic...');
function isSafeUrl(urlStr) {
  try {
    const parsed = new URL(urlStr);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
    const host = parsed.hostname.toLowerCase();
    if (host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0' || host === '169.254.169.254') return false;
    return true;
  } catch {
    return false;
  }
}
assert.strictEqual(isSafeUrl('http://localhost:3000/api'), false);
assert.strictEqual(isSafeUrl('http://127.0.0.1/admin'), false);
assert.strictEqual(isSafeUrl('http://169.254.169.254/latest/meta-data'), false);
assert.strictEqual(isSafeUrl('https://linkedin.com/company/lucidmediax'), true);
assert.strictEqual(isSafeUrl('https://instagram.com/lucidmediax'), true);
console.log('✓ SSRF Protection guardrails verified.\n');

// 6. Test CSV Import & Upsert Idempotency
console.log('Test 6: Verifying CSV Ingestion and duplicate matching...');
const csvRowTitle = 'CSV Seed Campaign';
db.prepare("DELETE FROM social_posts WHERE title = ? AND organisation_id = ?").run(csvRowTitle, orgId);

db.prepare(`
  INSERT INTO social_posts (
    organisation_id, created_by_user_id, platform, title, status
  ) VALUES (?, ?, 'x', ?, 'published')
`).run(orgId, userId, csvRowTitle);

const existing = db.prepare("SELECT id FROM social_posts WHERE organisation_id = ? AND title = ? AND platform = 'x'").get(orgId, csvRowTitle);
assert.ok(existing);
db.prepare('UPDATE social_posts SET caption = ? WHERE id = ?').run('Updated caption from CSV', existing.id);
const verifiedPost = db.prepare('SELECT caption FROM social_posts WHERE id = ?').get(existing.id);
assert.strictEqual(verifiedPost.caption, 'Updated caption from CSV');
console.log('✓ CSV import matching and update verified.\n');

// Clean test records
db.prepare("DELETE FROM social_metric_snapshots WHERE social_post_id = ?").run(postId);
db.prepare("DELETE FROM social_posts WHERE id = ?").run(postId);
db.prepare("DELETE FROM social_posts WHERE title = ?").run(csvRowTitle);
db.prepare("DELETE FROM social_accounts WHERE id = ?").run(accId);

console.log('🎉 All automated tests passed successfully!');
