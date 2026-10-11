import fs from 'fs';
import path from 'path';

const workerPath = path.resolve('.open-next/worker.js');
if (fs.existsSync(workerPath)) {
  let content = fs.readFileSync(workerPath, 'utf8');
  if (!content.includes('async scheduled(')) {
    const scheduledHandler = `
    async scheduled(event, env, ctx) {
        ctx.waitUntil((async () => {
            console.log('[Scheduler] Executing scheduled recurrence sweep at:', new Date().toISOString(), 'cron:', event.cron);
            try {
                if (!env || !env.DB) {
                    console.error('[Scheduler] D1 database binding DB not found in env');
                    return;
                }
                const today = new Date().toISOString().split('T')[0];
                const now = new Date().toISOString();

                // Sweep due recurring tasks
                const selectStmt = env.DB.prepare(\`
                    SELECT * FROM tasks
                    WHERE is_recurring = 1 
                      AND recurrence_rule != '' 
                      AND recurrence_rule != 'none'
                      AND is_archived = 0
                      AND recurrence_next_date != ''
                      AND recurrence_next_date <= ?
                    LIMIT 25
                \`).bind(today);

                const res = await selectStmt.all();
                const dueTasks = res.results || [];
                console.log('[Scheduler] Due recurring tasks count:', dueTasks.length);

                for (const t of dueTasks) {
                    const baseDate = t.recurrence_next_date ? new Date(t.recurrence_next_date) : new Date();
                    const next = new Date(baseDate);
                    const step = Math.max(1, t.recurrence_interval || 1);
                    if (t.recurrence_rule === 'daily') {
                        next.setDate(next.getDate() + step);
                    } else if (t.recurrence_rule === 'weekly') {
                        next.setDate(next.getDate() + 7 * step);
                    } else if (t.recurrence_rule === 'monthly') {
                        next.setMonth(next.getMonth() + step);
                    } else {
                        next.setDate(next.getDate() + step);
                    }
                    const nextDateStr = next.toISOString().split('T')[0];

                    const insertStmt = env.DB.prepare(\`
                        INSERT INTO tasks (
                            organisation_id, task_name, description, assigned_to, created_by, priority, priority_rank,
                            status, drive_link, due_date, notes, department, is_archived, created_at, updated_at,
                            parent_task_id, recurrence_rule, recurrence_interval, recurrence_next_date, is_recurring
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'Not Started', ?, ?, ?, ?, 0, ?, ?, ?, '', 1, '', 0)
                    \`).bind(
                        t.organisation_id,
                        t.task_name,
                        t.description,
                        t.assigned_to,
                        t.created_by,
                        t.priority,
                        t.priority_rank,
                        t.drive_link || '',
                        t.recurrence_next_date,
                        t.notes || '',
                        t.department || '',
                        now,
                        now,
                        t.id
                    );
                    const insRes = await insertStmt.run();
                    const newId = Number(insRes.meta?.last_row_id);

                    await env.DB.prepare(\`
                        INSERT INTO task_activities (organisation_id, task_id, user_id, activity_type, new_value, details, created_at)
                        VALUES (?, ?, ?, 'created', ?, ?, ?)
                    \`).bind(
                        t.organisation_id,
                        newId,
                        t.created_by,
                        t.task_name,
                        'Generated from recurring schedule (' + t.recurrence_rule + ')',
                        now
                    ).run();

                    await env.DB.prepare(\`
                        UPDATE tasks SET recurrence_next_date = ?, updated_at = ? WHERE id = ?
                    \`).bind(nextDateStr, now, t.id).run();

                    console.log('[Scheduler] Generated instance #', newId, 'for master recurring task #', t.id);
                }

                // Check overdue automations in scheduled sweep
                try {
                    const autoStmt = env.DB.prepare(\`
                        SELECT * FROM automations
                        WHERE trigger_type = 'task_overdue' AND is_enabled = 1
                        LIMIT 20
                    \`);
                    const autoRes = await autoStmt.all();
                    const overdueAutomations = autoRes.results || [];

                    for (const auto of overdueAutomations) {
                        const overdueTasksStmt = env.DB.prepare(\`
                            SELECT * FROM tasks
                            WHERE organisation_id = ?
                              AND status != 'Completed'
                              AND is_archived = 0
                              AND due_date != ''
                              AND due_date < ?
                            LIMIT 25
                        \`).bind(auto.organisation_id, today);

                        const tasksRes = await overdueTasksStmt.all();
                        const overdueTasks = tasksRes.results || [];

                        for (const task of overdueTasks) {
                            const eventRef = \`task:\${task.id}:overdue:\${today}\`;
                            const idempotencyKey = \`\${auto.organisation_id}:\${auto.id}:\${eventRef}\`;

                            const checkRun = await env.DB.prepare(\`
                                SELECT id FROM automation_runs WHERE idempotency_key = ?
                            \`).bind(idempotencyKey).first();

                            if (checkRun) continue;

                            let conditions = [];
                            let actions = [];
                            try {
                                conditions = auto.conditions ? JSON.parse(auto.conditions) : [];
                                actions = auto.actions ? JSON.parse(auto.actions) : [];
                            } catch {}

                            let matched = true;
                            for (const cond of conditions) {
                                let actualValue = undefined;
                                if (cond.field === 'priority') actualValue = task.priority;
                                else if (cond.field === 'status') actualValue = task.status;
                                else if (cond.field === 'department') actualValue = task.department;
                                else if (cond.field === 'assignee_id') actualValue = String(task.assigned_to);

                                const expectedStr = cond.value !== undefined ? String(cond.value).toLowerCase() : '';
                                const actualStr = actualValue !== undefined ? String(actualValue).toLowerCase() : '';

                                if (cond.operator === 'equals' && actualStr !== expectedStr) matched = false;
                                if (cond.operator === 'not_equals' && actualStr === expectedStr) matched = false;
                            }

                            if (!matched) continue;

                            const summaries = [];
                            for (const act of actions) {
                                if (act.action_type === 'notify_task_creator') {
                                    await env.DB.prepare(\`
                                        INSERT INTO notification_events 
                                        (organisation_id, recipient_user_id, actor_user_id, type, title, body, target_url, entity_type, entity_id, is_read, created_at)
                                        VALUES (?, ?, ?, 'task_status_changed', ?, ?, ?, 'Task', ?, 0, ?)
                                    \`).bind(
                                        auto.organisation_id,
                                        task.created_by,
                                        auto.created_by,
                                        \`Overdue Task: \${task.task_name}\`,
                                        \`Task #\${task.id} is overdue (Due date: \${task.due_date})\`,
                                        \`/all-tasks?taskId=\${task.id}\`,
                                        task.id,
                                        now
                                    ).run();
                                    summaries.push(\`Notified creator #\${task.created_by}\`);
                                } else if (act.action_type === 'notify_assignee') {
                                    await env.DB.prepare(\`
                                        INSERT INTO notification_events 
                                        (organisation_id, recipient_user_id, actor_user_id, type, title, body, target_url, entity_type, entity_id, is_read, created_at)
                                        VALUES (?, ?, ?, 'task_assigned', ?, ?, ?, 'Task', ?, 0, ?)
                                    \`).bind(
                                        auto.organisation_id,
                                        task.assigned_to,
                                        auto.created_by,
                                        \`Overdue Notice: \${task.task_name}\`,
                                        \`Your task is overdue (Due date: \${task.due_date})\`,
                                        \`/my-tasks?taskId=\${task.id}\`,
                                        task.id,
                                        now
                                    ).run();
                                    summaries.push(\`Notified assignee #\${task.assigned_to}\`);
                                }
                            }

                            await env.DB.prepare(\`
                                INSERT INTO automation_runs (
                                    organisation_id, automation_id, event_type, event_reference, idempotency_key,
                                    status, details, error, created_at, completed_at
                                ) VALUES (?, ?, 'task_overdue', ?, ?, 'success', ?, NULL, ?, ?)
                            \`).bind(
                                auto.organisation_id,
                                auto.id,
                                eventRef,
                                idempotencyKey,
                                summaries.join('; ') || 'Overdue action executed',
                                now,
                                new Date().toISOString()
                            ).run();

                            await env.DB.prepare(\`
                                UPDATE automations SET last_run_at = ?, success_count = success_count + 1, updated_at = ? WHERE id = ?
                            \`).bind(now, now, auto.id).run();

                            console.log('[Scheduler] Executed overdue automation #', auto.id, 'for task #', task.id);
                        }
                    }
                } catch (autoSchedErr) {
                    console.error('[Scheduler] Error running overdue automations in scheduled():', autoSchedErr);
                }

                // 3. Meeting Reminders
                try {
                    const upcomingWindow = new Date(Date.now() + 20 * 60 * 1000).toISOString();
                    const pastWindow = new Date(Date.now() - 5 * 60 * 1000).toISOString();
                    const dueEvents = (await env.DB.prepare(\`
                        SELECT id, organisation_id, title, start_at, location, meeting_url, created_by
                        FROM calendar_events
                        WHERE status = 'scheduled' AND reminder_sent = 0 AND start_at <= ? AND start_at >= ?
                        LIMIT 20
                    \`).bind(upcomingWindow, pastWindow).all()).results || [];

                    for (const evt of dueEvents) {
                        const attendees = (await env.DB.prepare(\`
                            SELECT user_id FROM event_attendees WHERE event_id = ? AND response != 'declined'
                        \`).bind(evt.id).all()).results || [];

                        for (const att of attendees) {
                            await env.DB.prepare(\`
                                INSERT INTO notification_events 
                                (organisation_id, recipient_user_id, actor_user_id, type, title, body, target_url, entity_type, entity_id, is_read, created_at)
                                VALUES (?, ?, ?, 'calendar_reminder', ?, ?, ?, 'CalendarEvent', ?, 0, ?)
                            \`).bind(
                                evt.organisation_id, att.user_id, evt.created_by,
                                \`Meeting Starting Soon: \${evt.title}\`,
                                \`"\${evt.title}" starts soon\${evt.location ? \` at \${evt.location}\` : ''}.\`,
                                \`/calendar?eventId=\${evt.id}\`, evt.id, now
                            ).run();
                        }
                        await env.DB.prepare(\`UPDATE calendar_events SET reminder_sent = 1, updated_at = ? WHERE id = ?\`).bind(now, evt.id).run();
                    }
                } catch (remErr) {
                    console.error('[Scheduler] Error running meeting reminders in scheduled():', remErr);
                }

                // 4. Retention & Deletion Lifecycle Sweep
                try {
                    const duePurges = (await env.DB.prepare(\`
                        SELECT id, organisation_id FROM customer_deletion_requests
                        WHERE status = 'scheduled' AND scheduled_purge_at IS NOT NULL AND scheduled_purge_at <= ?
                        LIMIT 10
                    \`).bind(now).all()).results || [];

                    for (const req of duePurges) {
                        const orgId = req.organisation_id;
                        try {
                            // Step 1: Purge underlying file blobs in KV
                            try {
                                const fileKeys = (await env.DB.prepare(\`SELECT storage_key FROM files WHERE organisation_id = ?\`).bind(orgId).all()).results || [];
                                const blobKeys = (await env.DB.prepare(\`SELECT storage_key FROM file_blobs WHERE organisation_id = ?\`).bind(orgId).all()).results || [];
                                const allKeys = Array.from(new Set([...fileKeys.map(r => r.storage_key), ...blobKeys.map(r => r.storage_key)]));
                                if (env.FILES_KV && allKeys.length > 0) {
                                    for (const k of allKeys) {
                                        if (k) try { await env.FILES_KV.delete(k); } catch (ke) {}
                                    }
                                }
                            } catch (fkErr) {}

                            const tables = [
                                'file_attachments', 'file_blobs', 'files', 'time_entries', 'user_work_capacity',
                                'guest_feedback', 'guest_page_access', 'guest_project_access',
                                'milestones', 'projects', 'event_task_links', 'event_page_links',
                                'meeting_action_items', 'event_attendees', 'calendar_events',
                                'page_task_links', 'page_favorites', 'pages', 'automation_runs', 'automations',
                                'message_reactions', 'messages', 'conversation_members', 'conversations',
                                'task_activities', 'task_dependencies', 'task_checklists',
                                'task_status_history', 'task_assignment_history', 'tasks',
                                'notification_events', 'finance_documents', 'payments', 'pdc_records',
                                'invoices', 'clients', 'organisation_invitations', 'organisation_subscriptions',
                                'legal_acceptances', 'audit_logs'
                            ];
                            for (const tbl of tables) {
                                if (tbl === 'milestones') {
                                    await env.DB.prepare(\`DELETE FROM milestones WHERE project_id IN (SELECT id FROM projects WHERE organisation_id = ?)\`).bind(orgId).run();
                                } else if (tbl === 'event_task_links' || tbl === 'event_page_links' || tbl === 'meeting_action_items' || tbl === 'event_attendees') {
                                    await env.DB.prepare(\`DELETE FROM \${tbl} WHERE event_id IN (SELECT id FROM calendar_events WHERE organisation_id = ?)\`).bind(orgId).run();
                                } else if (tbl === 'page_task_links' || tbl === 'page_favorites') {
                                    await env.DB.prepare(\`DELETE FROM \${tbl} WHERE page_id IN (SELECT id FROM pages WHERE organisation_id = ?)\`).bind(orgId).run();
                                } else if (tbl === 'message_reactions') {
                                    await env.DB.prepare(\`DELETE FROM message_reactions WHERE message_id IN (SELECT m.id FROM messages m JOIN conversations c ON m.conversation_id = c.id WHERE c.organisation_id = ?)\`).bind(orgId).run();
                                } else if (tbl === 'messages' || tbl === 'conversation_members') {
                                    await env.DB.prepare(\`DELETE FROM \${tbl} WHERE conversation_id IN (SELECT id FROM conversations WHERE organisation_id = ?)\`).bind(orgId).run();
                                } else if (tbl === 'task_dependencies' || tbl === 'task_checklists') {
                                    await env.DB.prepare(\`DELETE FROM \${tbl} WHERE task_id IN (SELECT id FROM tasks WHERE organisation_id = ?)\`).bind(orgId).run();
                                } else {
                                    await env.DB.prepare(\`DELETE FROM \${tbl} WHERE organisation_id = ?\`).bind(orgId).run();
                                }
                            }

                            // Deactivate single-tenant users
                            const soleUsers = (await env.DB.prepare(\`
                                SELECT user_id FROM organisation_members WHERE organisation_id = ? AND user_id NOT IN (SELECT user_id FROM organisation_members WHERE organisation_id != ?)
                            \`).bind(orgId, orgId).all()).results || [];
                            for (const su of soleUsers) {
                                await env.DB.prepare(\`UPDATE users SET is_active = 0, updated_at = ? WHERE id = ?\`).bind(now, su.user_id).run();
                                await env.DB.prepare(\`UPDATE sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL\`).bind(now, su.user_id).run();
                            }

                            await env.DB.prepare(\`DELETE FROM organisation_members WHERE organisation_id = ?\`).bind(orgId).run();
                            await env.DB.prepare(\`DELETE FROM organisations WHERE id = ?\`).bind(orgId).run();
                            await env.DB.prepare(\`UPDATE customer_deletion_requests SET status = 'completed', completed_at = ?, audit_metadata = ? WHERE id = ?\`).bind(
                                now, JSON.stringify({ completedAt: now, purgedBy: 'cron_retention_sweep', purgedOrgId: orgId }), req.id
                            ).run();
                            console.log('[Scheduler] Successfully purged expired organisation #', orgId);
                        } catch (pErr) {
                            console.error('[Scheduler] Error purging organisation #', orgId, pErr);
                            try {
                                await env.DB.prepare(\`UPDATE customer_deletion_requests SET audit_metadata = ? WHERE id = ?\`).bind(
                                    JSON.stringify({ lastAttemptAt: now, error: String(pErr), retryPending: true }), req.id
                                ).run();
                            } catch (diagErr) {}
                        }
                    }

                    // Stale sessions and tokens cleanup
                    await env.DB.prepare(\`DELETE FROM sessions WHERE (revoked_at IS NOT NULL AND revoked_at <= datetime('now', '-7 days')) OR expires_at <= datetime('now', '-30 days')\`).run();
                    await env.DB.prepare(\`DELETE FROM password_reset_tokens WHERE expires_at <= datetime('now', '-7 days') OR (used_at IS NOT NULL AND used_at <= datetime('now', '-7 days'))\`).run();
                } catch (retErr) {
                    console.error('[Scheduler] Error running retention sweep in scheduled():', retErr);
                }
            } catch (err) {
                console.error('[Scheduler] Error running recurrence sweep in scheduled():', err);
            }
        })());
    },
`;
    content = content.replace(/export\s+default\s*\{/, `export default {${scheduledHandler}`);
    fs.writeFileSync(workerPath, content, 'utf8');
    console.log('[Patch] Successfully injected scheduled() handler into .open-next/worker.js');
  } else {
    console.log('[Patch] scheduled() handler already present in .open-next/worker.js');
  }
} else {
  console.error('[Patch] .open-next/worker.js not found');
}
