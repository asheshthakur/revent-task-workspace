// Unified Database Client supporting Cloudflare D1 in production & SQLite locally
import { getCloudflareContext } from '@opennextjs/cloudflare';

export interface DbResult<T = any> {
  results: T[];
  success: boolean;
  meta?: any;
}

export interface RunResult {
  success: boolean;
  lastInsertRowid?: number | bigint;
  changes?: number;
}

// Check if running in a Cloudflare Worker environment (workerd)
function isCloudflareRuntime(): boolean {
  return (
    (typeof navigator !== 'undefined' &&
    navigator.userAgent === 'CloudFlare-Workers') ||
    typeof (globalThis as any).WebSocketPair !== 'undefined' ||
    !!(globalThis as any)[Symbol.for('__cloudflare-context__')]
  );
}

// Retrieve the D1 Database binding from the Cloudflare request context
function getD1Database(): any {
  try {
    const symbol = Symbol.for('__cloudflare-context__');
    const ctx = (globalThis as any)[symbol] || getCloudflareContext();
    if (ctx && ctx.env && ctx.env.DB) {
      return ctx.env.DB;
    }
  } catch (err) {
    // Context may not be available outside a request
  }
  return null;
}

// Fallback local SQLite instance (lazy-loaded ONLY in Node.js environments)
let localSqliteDb: any = null;
function getLocalSqlite() {
  if (localSqliteDb) return localSqliteDb;
  if (isCloudflareRuntime()) return null;

  try {
    const Database = require('better-sqlite3');
    const path = require('path');
    const fs = require('fs');

    const DB_DIR = path.join(process.cwd(), 'data');
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    const DB_PATH = path.join(DB_DIR, 'revent_tasks.db');
    localSqliteDb = new Database(DB_PATH);
    localSqliteDb.pragma('journal_mode = WAL');
    localSqliteDb.pragma('foreign_keys = ON');
    return localSqliteDb;
  } catch (err) {
    return null;
  }
}

/**
 * Universal async query helper
 * Executes SQL with parameters against Cloudflare D1 in production, or SQLite in local Node.js.
 */
export async function queryAll<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const d1 = getD1Database();
  if (d1) {
    const stmt = d1.prepare(sql).bind(...params);
    const res = await stmt.all();
    return (res.results || []) as T[];
  }

  const sqlite = getLocalSqlite();
  if (sqlite) {
    return sqlite.prepare(sql).all(...params) as T[];
  }

  throw new Error('Database connection not available (neither Cloudflare D1 nor SQLite found).');
}

/**
 * Universal async query for a single row
 */
export async function queryFirst<T = any>(sql: string, params: any[] = []): Promise<T | null> {
  const d1 = getD1Database();
  if (d1) {
    const stmt = d1.prepare(sql).bind(...params);
    const res = await stmt.first();
    return (res ?? null) as T | null;
  }

  const sqlite = getLocalSqlite();
  if (sqlite) {
    const res = sqlite.prepare(sql).get(...params);
    return (res ?? null) as T | null;
  }

  throw new Error('Database connection not available (neither Cloudflare D1 nor SQLite found).');
}

/**
 * Universal async run helper (INSERT, UPDATE, DELETE)
 */
export async function queryRun(sql: string, params: any[] = []): Promise<RunResult> {
  const d1 = getD1Database();
  if (d1) {
    const stmt = d1.prepare(sql).bind(...params);
    const res = await stmt.run();
    return {
      success: res.success,
      lastInsertRowid: res.meta?.last_row_id,
      changes: res.meta?.changes,
    };
  }

  const sqlite = getLocalSqlite();
  if (sqlite) {
    const res = sqlite.prepare(sql).run(...params);
    return {
      success: true,
      lastInsertRowid: Number(res.lastInsertRowid),
      changes: res.changes,
    };
  }

  throw new Error('Database connection not available (neither Cloudflare D1 nor SQLite found).');
}

/**
 * Central audit logging helper (async)
 */
export async function logAuditAction(params: {
  userId: number;
  organisationId?: number;
  actionType: string;
  entityType: string;
  entityId?: number;
  entityTitle?: string;
  oldValue?: string;
  newValue?: string;
}) {
  try {
    const now = new Date().toISOString();
    await queryRun(
      `INSERT INTO audit_logs (organisation_id, user_id, action_type, entity_type, entity_id, entity_title, old_value, new_value, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        params.organisationId || 1,
        params.userId,
        params.actionType,
        params.entityType,
        params.entityId || null,
        params.entityTitle || '',
        params.oldValue || '',
        params.newValue || '',
        now,
      ]
    );
  } catch (err) {
    console.error('Failed to log audit action:', err);
  }
}
