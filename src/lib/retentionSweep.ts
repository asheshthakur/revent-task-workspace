/**
 * VEYA Retention & Deletion Engine
 * 
 * Executes automated data retention and erasure policies:
 * 1. Permanently purges workspace data for approved customer_deletion_requests whose grace period has expired.
 * 2. Purges stale revoked sessions and expired password reset tokens according to policy windows.
 */

export interface RetentionSweepResult {
  purgedWorkspacesCount: number;
  expiredSessionsPurged: number;
  expiredTokensPurged: number;
  errors: string[];
}

export async function runRetentionSweepWithDb(db: any): Promise<RetentionSweepResult> {
  const nowIso = new Date().toISOString();
  const errors: string[] = [];
  let purgedWorkspacesCount = 0;
  let expiredSessionsPurged = 0;
  let expiredTokensPurged = 0;

  // 1. Process due customer deletion requests (grace period completed)
  try {
    const dueRequestsStmt = db.prepare(`
      SELECT id, organisation_id, requested_by_user_id, request_type, scheduled_purge_at
      FROM customer_deletion_requests
      WHERE status = 'scheduled'
        AND scheduled_purge_at IS NOT NULL
        AND scheduled_purge_at <= ?
      LIMIT 10
    `).bind(nowIso);

    const dueRes = await dueRequestsStmt.all();
    const dueRequests = (dueRes.results || []) as any[];

    for (const req of dueRequests) {
      const orgId = req.organisation_id;
      try {
        // Step A: Clean up files and attachments
        try {
          await db.prepare(`DELETE FROM file_attachments WHERE organisation_id = ?`).bind(orgId).run();
          await db.prepare(`DELETE FROM files WHERE organisation_id = ?`).bind(orgId).run();
        } catch {}

        // Step B: Clean up time tracking & workload
        try {
          await db.prepare(`DELETE FROM time_entries WHERE organisation_id = ?`).bind(orgId).run();
          await db.prepare(`DELETE FROM user_work_capacity WHERE organisation_id = ?`).bind(orgId).run();
        } catch {}

        // Step C: Clean up guest access
        try {
          await db.prepare(`DELETE FROM guest_feedback WHERE organisation_id = ?`).bind(orgId).run();
          await db.prepare(`DELETE FROM guest_page_access WHERE organisation_id = ?`).bind(orgId).run();
          await db.prepare(`DELETE FROM guest_project_access WHERE organisation_id = ?`).bind(orgId).run();
        } catch {}

        // Step D: Clean up projects and milestones
        try {
          await db.prepare(`
            DELETE FROM milestones WHERE project_id IN (
              SELECT id FROM projects WHERE organisation_id = ?
            )
          `).bind(orgId).run();
          await db.prepare(`DELETE FROM projects WHERE organisation_id = ?`).bind(orgId).run();
        } catch {}

        // Step E: Clean up calendar & meetings
        try {
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
        } catch {}

        // Step F: Clean up pages
        try {
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
        } catch {}

        // Step G: Clean up automations
        try {
          await db.prepare(`DELETE FROM automation_runs WHERE organisation_id = ?`).bind(orgId).run();
          await db.prepare(`DELETE FROM automations WHERE organisation_id = ?`).bind(orgId).run();
        } catch {}

        // Step H: Clean up chat messages and conversations
        try {
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
        } catch {}

        // Step I: Clean up tasks and histories
        try {
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
        } catch {}

        // Step J: Clean up notifications & finance
        try {
          await db.prepare(`DELETE FROM notification_events WHERE organisation_id = ?`).bind(orgId).run();
          await db.prepare(`DELETE FROM finance_documents WHERE organisation_id = ?`).bind(orgId).run();
          await db.prepare(`DELETE FROM payments WHERE organisation_id = ?`).bind(orgId).run();
          await db.prepare(`DELETE FROM pdc_records WHERE organisation_id = ?`).bind(orgId).run();
          await db.prepare(`DELETE FROM invoices WHERE organisation_id = ?`).bind(orgId).run();
          await db.prepare(`DELETE FROM clients WHERE organisation_id = ?`).bind(orgId).run();
        } catch {}

        // Step K: Clean up invitations & subscriptions & audit
        try {
          await db.prepare(`DELETE FROM organisation_invitations WHERE organisation_id = ?`).bind(orgId).run();
          await db.prepare(`DELETE FROM organisation_subscriptions WHERE organisation_id = ?`).bind(orgId).run();
          await db.prepare(`DELETE FROM legal_acceptances WHERE organisation_id = ?`).bind(orgId).run();
          await db.prepare(`DELETE FROM audit_logs WHERE organisation_id = ?`).bind(orgId).run();
        } catch {}

        // Step L: Handle isolated users whose sole membership was this organisation
        try {
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
        } catch {}

        // Step M: Remove memberships and the organisation record itself
        await db.prepare(`DELETE FROM organisation_members WHERE organisation_id = ?`).bind(orgId).run();
        await db.prepare(`DELETE FROM organisations WHERE id = ?`).bind(orgId).run();

        // Step N: Mark the deletion request completed
        await db.prepare(`
          UPDATE customer_deletion_requests
          SET status = 'completed', completed_at = ?, audit_metadata = ?
          WHERE id = ?
        `).bind(
          nowIso,
          JSON.stringify({ completedAt: nowIso, purgedBy: 'automated_retention_sweep' }),
          req.id
        ).run();

        purgedWorkspacesCount++;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`Error purging organisation ${orgId}: ${msg}`);
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
    expiredSessionsPurged,
    expiredTokensPurged,
    errors,
  };
}
