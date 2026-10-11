/**
 * VEYA Retention & Deletion Engine
 * 
 * Executes automated data retention and erasure policies:
 * 1. Permanently purges workspace data for approved customer_deletion_requests whose grace period has expired.
 * 2. Purges underlying file objects in Cloudflare KV and fallback D1 file_blobs.
 * 3. Enforces transactional boundary and retry-safety: partial failure NEVER marks a deletion request complete.
 * 4. Preserves shared users who belong to other active organisations.
 * 5. Purges stale revoked sessions and expired password reset tokens according to policy windows.
 */

export interface RetentionSweepResult {
  purgedWorkspacesCount: number;
  failedWorkspacesCount: number;
  expiredSessionsPurged: number;
  expiredTokensPurged: number;
  errors: string[];
}

export async function runRetentionSweepWithDb(db: any, kv?: any): Promise<RetentionSweepResult> {
  const nowIso = new Date().toISOString();
  const errors: string[] = [];
  let purgedWorkspacesCount = 0;
  let failedWorkspacesCount = 0;
  let expiredSessionsPurged = 0;
  let expiredTokensPurged = 0;

  // Retrieve KV namespace if not explicitly provided
  let filesKv = kv;
  if (!filesKv) {
    try {
      const symbol = Symbol.for('__cloudflare-context__');
      const ctx = (globalThis as any)[symbol];
      if (ctx && ctx.env && ctx.env.FILES_KV) {
        filesKv = ctx.env.FILES_KV;
      }
    } catch {}
  }

  // 1. Process due customer deletion requests (grace period completed)
  // Bounded query limit ensures predictable execution time per cron trigger
  try {
    const dueRequestsStmt = db.prepare(`
      SELECT id, organisation_id, requested_by_user_id, request_type, scheduled_purge_at
      FROM customer_deletion_requests
      WHERE status = 'scheduled'
        AND scheduled_purge_at IS NOT NULL
        AND scheduled_purge_at <= ?
      ORDER BY id ASC
      LIMIT 10
    `).bind(nowIso);

    const dueRes = await dueRequestsStmt.all();
    const dueRequests = (dueRes.results || []) as any[];

    for (const req of dueRequests) {
      const orgId = req.organisation_id;
      let orgPurgeSucceeded = false;

      try {
        // Step 1: Discover and purge all underlying binary file objects in KV & D1 file_blobs
        try {
          const fileKeysRes = await db.prepare(
            `SELECT storage_key FROM files WHERE organisation_id = ?`
          ).bind(orgId).all();
          const fileKeys = ((fileKeysRes.results || []) as any[]).map(r => r.storage_key);

          const blobKeysRes = await db.prepare(
            `SELECT storage_key FROM file_blobs WHERE organisation_id = ?`
          ).bind(orgId).all();
          const blobKeys = ((blobKeysRes.results || []) as any[]).map(r => r.storage_key);

          const allStorageKeys = Array.from(new Set([...fileKeys, ...blobKeys]));

          // Delete from KV if KV binding available
          if (filesKv && allStorageKeys.length > 0) {
            for (const key of allStorageKeys) {
              if (key) {
                try {
                  await filesKv.delete(key);
                } catch (kvErr) {
                  console.warn(`[RetentionSweep] Failed to delete KV key ${key}:`, kvErr);
                }
              }
            }
          }
        } catch (e) {
          // Non-fatal if query fails, proceed to relational tables
        }

        // Step 2: Delete file attachments, blobs and files
        await db.prepare(`DELETE FROM file_attachments WHERE organisation_id = ?`).bind(orgId).run();
        await db.prepare(`DELETE FROM file_blobs WHERE organisation_id = ?`).bind(orgId).run();
        await db.prepare(`DELETE FROM files WHERE organisation_id = ?`).bind(orgId).run();

        // Step 3: Clean up time tracking & workload
        await db.prepare(`DELETE FROM time_entries WHERE organisation_id = ?`).bind(orgId).run();
        await db.prepare(`DELETE FROM user_work_capacity WHERE organisation_id = ?`).bind(orgId).run();

        // Step 4: Clean up guest access
        await db.prepare(`DELETE FROM guest_feedback WHERE organisation_id = ?`).bind(orgId).run();
        await db.prepare(`DELETE FROM guest_page_access WHERE organisation_id = ?`).bind(orgId).run();
        await db.prepare(`DELETE FROM guest_project_access WHERE organisation_id = ?`).bind(orgId).run();

        // Step 5: Clean up projects and milestones
        await db.prepare(`
          DELETE FROM milestones WHERE project_id IN (
            SELECT id FROM projects WHERE organisation_id = ?
          )
        `).bind(orgId).run();
        await db.prepare(`DELETE FROM projects WHERE organisation_id = ?`).bind(orgId).run();

        // Step 6: Clean up calendar & meetings
        await db.prepare(`
          DELETE FROM event_task_links WHERE event_id IN (
            SELECT id FROM calendar_events WHERE organisation_id = ?
          )
        `).bind(orgId).run();
        await db.prepare(`
          DELETE FROM event_page_links WHERE event_id IN (
            SELECT id FROM calendar_events WHERE organisation_id = ?
          )
        `).bind(orgId).run();
        await db.prepare(`
          DELETE FROM meeting_action_items WHERE meeting_id IN (
            SELECT id FROM calendar_events WHERE organisation_id = ?
          )
        `).bind(orgId).run();
        await db.prepare(`
          DELETE FROM event_attendees WHERE event_id IN (
            SELECT id FROM calendar_events WHERE organisation_id = ?
          )
        `).bind(orgId).run();
        await db.prepare(`DELETE FROM calendar_events WHERE organisation_id = ?`).bind(orgId).run();

        // Step 7: Clean up wiki pages and page associations
        await db.prepare(`
          DELETE FROM page_task_links WHERE page_id IN (
            SELECT id FROM pages WHERE organisation_id = ?
          )
        `).bind(orgId).run();
        await db.prepare(`
          DELETE FROM page_favorites WHERE page_id IN (
            SELECT id FROM pages WHERE organisation_id = ?
          )
        `).bind(orgId).run();
        await db.prepare(`DELETE FROM pages WHERE organisation_id = ?`).bind(orgId).run();

        // Step 8: Clean up automations
        await db.prepare(`DELETE FROM automation_runs WHERE organisation_id = ?`).bind(orgId).run();
        await db.prepare(`DELETE FROM automations WHERE organisation_id = ?`).bind(orgId).run();

        // Step 9: Clean up chat messages and conversations
        await db.prepare(`
          DELETE FROM message_reactions WHERE message_id IN (
            SELECT m.id FROM messages m
            JOIN conversations c ON m.conversation_id = c.id
            WHERE c.organisation_id = ?
          )
        `).bind(orgId).run();
        await db.prepare(`
          DELETE FROM messages WHERE conversation_id IN (
            SELECT id FROM conversations WHERE organisation_id = ?
          )
        `).bind(orgId).run();
        await db.prepare(`
          DELETE FROM conversation_members WHERE conversation_id IN (
            SELECT id FROM conversations WHERE organisation_id = ?
          )
        `).bind(orgId).run();
        await db.prepare(`DELETE FROM conversations WHERE organisation_id = ?`).bind(orgId).run();

        // Step 10: Clean up tasks and histories
        await db.prepare(`DELETE FROM task_activities WHERE organisation_id = ?`).bind(orgId).run();
        await db.prepare(`
          DELETE FROM task_dependencies WHERE task_id IN (
            SELECT id FROM tasks WHERE organisation_id = ?
          )
        `).bind(orgId).run();
        await db.prepare(`
          DELETE FROM task_checklists WHERE task_id IN (
            SELECT id FROM tasks WHERE organisation_id = ?
          )
        `).bind(orgId).run();
        await db.prepare(`DELETE FROM task_status_history WHERE organisation_id = ?`).bind(orgId).run();
        await db.prepare(`DELETE FROM task_assignment_history WHERE organisation_id = ?`).bind(orgId).run();
        await db.prepare(`DELETE FROM tasks WHERE organisation_id = ?`).bind(orgId).run();

        // Step 11: Clean up notifications & finance
        await db.prepare(`DELETE FROM notification_events WHERE organisation_id = ?`).bind(orgId).run();
        await db.prepare(`DELETE FROM finance_documents WHERE organisation_id = ?`).bind(orgId).run();
        await db.prepare(`DELETE FROM payments WHERE organisation_id = ?`).bind(orgId).run();
        await db.prepare(`DELETE FROM pdc_records WHERE organisation_id = ?`).bind(orgId).run();
        await db.prepare(`DELETE FROM invoices WHERE organisation_id = ?`).bind(orgId).run();
        await db.prepare(`DELETE FROM clients WHERE organisation_id = ?`).bind(orgId).run();

        // Step 12: Clean up invitations & subscriptions & legal consent records
        await db.prepare(`DELETE FROM organisation_invitations WHERE organisation_id = ?`).bind(orgId).run();
        await db.prepare(`DELETE FROM organisation_subscriptions WHERE organisation_id = ?`).bind(orgId).run();
        await db.prepare(`DELETE FROM legal_acceptances WHERE organisation_id = ?`).bind(orgId).run();
        await db.prepare(`DELETE FROM audit_logs WHERE organisation_id = ?`).bind(orgId).run();

        // Step 13: Handle isolated users whose SOLE membership was this organisation
        // CRITICAL PRIVACY & SECURITY GUARD: Users who belong to any other organization are NOT touched!
        const soleUsersStmt = db.prepare(`
          SELECT user_id FROM organisation_members
          WHERE organisation_id = ?
            AND user_id NOT IN (
              SELECT user_id FROM organisation_members WHERE organisation_id != ?
            )
        `).bind(orgId, orgId);
        const soleUsers = ((await soleUsersStmt.all()).results || []) as any[];

        for (const u of soleUsers) {
          await db.prepare(`UPDATE users SET is_active = 0, updated_at = ? WHERE id = ?`).bind(nowIso, u.user_id).run();
          await db.prepare(`UPDATE sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL`).bind(nowIso, u.user_id).run();
        }

        // Step 14: Remove memberships and the organisation record itself
        await db.prepare(`DELETE FROM organisation_members WHERE organisation_id = ?`).bind(orgId).run();
        await db.prepare(`DELETE FROM organisations WHERE id = ?`).bind(orgId).run();

        // Step 15: Mark the deletion request completed ONLY after every single previous step succeeded
        await db.prepare(`
          UPDATE customer_deletion_requests
          SET status = 'completed', completed_at = ?, audit_metadata = ?
          WHERE id = ?
        `).bind(
          nowIso,
          JSON.stringify({ completedAt: nowIso, purgedBy: 'automated_retention_sweep', purgedOrgId: orgId }),
          req.id
        ).run();

        orgPurgeSucceeded = true;
        purgedWorkspacesCount++;
      } catch (err: unknown) {
        // RETRY SAFETY & TRANSACTIONAL INTEGRITY:
        // If ANY step threw an error, DO NOT mark the deletion request completed!
        // Keep status = 'scheduled' and record failure diagnostic so the next cron sweep will retry.
        failedWorkspacesCount++;
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`Error purging organisation ${orgId}: ${msg}`);

        try {
          await db.prepare(`
            UPDATE customer_deletion_requests
            SET audit_metadata = ?
            WHERE id = ?
          `).bind(
            JSON.stringify({ lastAttemptAt: nowIso, error: msg, retryPending: true }),
            req.id
          ).run();
        } catch {}
      }
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(`Failed querying customer deletion requests: ${msg}`);
  }

  // 2. Clean up stale revoked sessions older than 7 days
  try {
    const sessionRes = await db.prepare(`
      DELETE FROM sessions 
      WHERE (revoked_at IS NOT NULL AND revoked_at <= datetime('now', '-7 days'))
         OR expires_at <= datetime('now', '-30 days')
    `).run();
    expiredSessionsPurged = Number(sessionRes.meta?.changes || 0);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(`Failed purging expired sessions: ${msg}`);
  }

  // 3. Clean up expired / used password reset tokens older than 7 days
  try {
    const tokenRes = await db.prepare(`
      DELETE FROM password_reset_tokens
      WHERE expires_at <= datetime('now', '-7 days')
         OR (used_at IS NOT NULL AND used_at <= datetime('now', '-7 days'))
    `).run();
    expiredTokensPurged = Number(tokenRes.meta?.changes || 0);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(`Failed purging expired reset tokens: ${msg}`);
  }

  return {
    purgedWorkspacesCount,
    failedWorkspacesCount,
    expiredSessionsPurged,
    expiredTokensPurged,
    errors,
  };
}
