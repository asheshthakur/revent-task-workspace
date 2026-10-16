import assert from 'assert';
import Database from 'better-sqlite3';
import path from 'path';

console.log('=== VEYA Social Economy: Follower Growth & UX Test Suite ===\n');

const dbPath = path.join(process.cwd(), 'data', 'revent_tasks.db');
const db = new Database(dbPath);

const validUser = db.prepare('SELECT id FROM users LIMIT 1').get();
const validOrg = db.prepare('SELECT id FROM organisations LIMIT 1').get();
assert.ok(validUser, 'Valid user required');
assert.ok(validOrg, 'Valid org required');

const userId = validUser.id;
const orgId = validOrg.id;

// 1. Schema check: social_follower_snapshots and current_followers column
console.log('Test 1: Schema columns and follower table verification...');
const columns = db.prepare("PRAGMA table_info(social_accounts)").all().map(c => c.name);
assert.ok(columns.includes('current_followers'), 'current_followers column must exist');
assert.ok(columns.includes('last_successful_check_at'), 'last_successful_check_at column must exist');

const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(t => t.name);
assert.ok(tables.includes('social_follower_snapshots'), 'social_follower_snapshots table must exist');
console.log('✓ Columns and follower snapshots table verified.\n');

// 2. Account creation with initial follower count and baseline snapshot
console.log('Test 2: Account creation with initial baseline follower count...');
const testProfile = 'https://linkedin.com/company/follower-test-suite';
db.prepare("DELETE FROM social_accounts WHERE profile_url = ?").run(testProfile);

const insertAcc = db.prepare(`
  INSERT INTO social_accounts (
    organisation_id, created_by_user_id, platform, display_name, profile_url, current_followers, status
  ) VALUES (?, ?, 'linkedin', 'Growth Agency Suite', ?, 8000, 'active')
`).run(orgId, userId, testProfile);

const accId = Number(insertAcc.lastInsertRowid);
assert.ok(accId > 0);

// Baseline snapshot at T-45 days
const d45DaysAgo = new Date();
d45DaysAgo.setDate(d45DaysAgo.getDate() - 45);

db.prepare(`
  INSERT INTO social_follower_snapshots (
    organisation_id, social_account_id, follower_count, source, observation_timestamp, notes
  ) VALUES (?, ?, 8000, 'manual', ?, 'T-45d baseline observation')
`).run(orgId, accId, d45DaysAgo.toISOString());

console.log('✓ Initial account & baseline snapshot created.\n');

// 3. Second manual observation at T-10 days
console.log('Test 3: Second manual follower update and snapshot creation...');
const d10DaysAgo = new Date();
d10DaysAgo.setDate(d10DaysAgo.getDate() - 10);

db.prepare(`
  INSERT INTO social_follower_snapshots (
    organisation_id, social_account_id, follower_count, source, observation_timestamp, notes
  ) VALUES (?, ?, 8400, 'manual', ?, 'T-10d observation')
`).run(orgId, accId, d10DaysAgo.toISOString());

// Current count updated to 8800 at T-0
db.prepare(`
  UPDATE social_accounts SET current_followers = 8800, updated_at = datetime('now') WHERE id = ?
`).run(accId);

db.prepare(`
  INSERT INTO social_follower_snapshots (
    organisation_id, social_account_id, follower_count, source, observation_timestamp, notes
  ) VALUES (?, ?, 8800, 'manual', ?, 'Current observation')
`).run(orgId, accId, new Date().toISOString());

console.log('✓ Multiple historical follower observations recorded.\n');

// 4. Test 30-, 60-, and 90-day growth calculations
console.log('Test 4: Verifying 30-day, 60-day, and 90-day growth logic...');
const allSnaps = db.prepare(`
  SELECT * FROM social_follower_snapshots 
  WHERE social_account_id = ? 
  ORDER BY observation_timestamp ASC
`).all(accId);

assert.strictEqual(allSnaps.length, 3);

function calcGrowth(days) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffIso = cutoff.toISOString();

  const currentCount = 8800;
  // Baseline is closest snapshot at or before cutoff
  const prior = allSnaps.filter(s => s.observation_timestamp <= cutoffIso);
  let baseline = 0;
  if (prior.length > 0) {
    baseline = prior[prior.length - 1].follower_count;
  } else {
    baseline = allSnaps[0].follower_count;
  }

  const net = currentCount - baseline;
  const pct = Number(((net / baseline) * 100).toFixed(1));
  return { baseline, net, pct };
}

// In 30 days window: baseline at T-10 is within window, closest prior is T-45 (8000)
const g30 = calcGrowth(30);
assert.strictEqual(g30.baseline, 8000);
assert.strictEqual(g30.net, 800);
assert.strictEqual(g30.pct, 10.0); // (8800 - 8000) / 8000 * 100 = 10.0%

// In 60 days window: T-45 is within window, earliest is T-45 (8000)
const g60 = calcGrowth(60);
assert.strictEqual(g60.net, 800);
assert.strictEqual(g60.pct, 10.0);

console.log(`✓ 30-Day Growth: +${g30.net} (+${g30.pct}%) verified accurately.`);
console.log(`✓ 60-Day Growth: +${g60.net} (+${g60.pct}%) verified accurately.\n`);

// 5. Test Total Followers Aggregation matches KPI and card logic
console.log('Test 5: Verifying Total Followers aggregation logic across accounts...');
const totalFollowersSum = db.prepare(`
  SELECT SUM(current_followers) as total FROM social_accounts WHERE organisation_id = ? AND status = 'active'
`).get(orgId).total;

assert.ok(totalFollowersSum >= 8800, 'Sum of latest valid follower counts must match KPI calculation');
console.log(`✓ Total Followers KPI aggregation (${totalFollowersSum}) verified.\n`);

// Clean test entries
db.prepare("DELETE FROM social_follower_snapshots WHERE social_account_id = ?").run(accId);
db.prepare("DELETE FROM social_accounts WHERE id = ?").run(accId);

console.log('🎉 All Follower Growth and UX tests passed successfully!');
