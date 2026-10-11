/**
 * Core recurrence sweep execution engine
 * Evaluates recurring task templates in D1 and generates due instances.
 * Callable directly by both the Scheduled Event cron handler and the HTTP sweep endpoint.
 */

export function calculateNextOccurrenceDate(currentDateStr: string, rule: string, interval: number): string {
  const baseDate = currentDateStr ? new Date(currentDateStr) : new Date();
  if (isNaN(baseDate.getTime())) return '';

  const next = new Date(baseDate);
  const step = Math.max(1, interval || 1);

  if (rule === 'daily') {
    next.setDate(next.getDate() + step);
  } else if (rule === 'weekly') {
    next.setDate(next.getDate() + 7 * step);
  } else if (rule === 'monthly') {
    next.setMonth(next.getMonth() + step);
  } else {
    next.setDate(next.getDate() + step);
  }

  return next.toISOString().split('T')[0];
}

import { runRetentionSweepWithDb, RetentionSweepResult } from './retentionSweep';

export interface SweepResult {
  success: boolean;
  sweepTimestamp: string;
  evaluatedDate: string;
  generatedCount: number;
  retention?: RetentionSweepResult;
  error?: string;
}

export async function runRecurrenceSweepWithDb(db: any): Promise<SweepResult> {
  const today = new Date().toISOString().split('T')[0];
  const now = new Date().toISOString();

  // Find recurring templates due on or before today
  const selectStmt = db.prepare(`
    SELECT * FROM tasks
    WHERE is_recurring = 1 
      AND recurrence_rule != '' 
      AND recurrence_rule != 'none'
      AND is_archived = 0
      AND recurrence_next_date != ''
      AND recurrence_next_date <= ?
    LIMIT 25
  `).bind(today);

  const queryResult = await selectStmt.all();
  const recurringTasks = (queryResult.results || []) as any[];

  let generatedCount = 0;

  for (const t of recurringTasks) {
    const nextDate = calculateNextOccurrenceDate(t.recurrence_next_date, t.recurrence_rule, t.recurrence_interval);

    // Insert new task instance (linked to master parent task)
    const insertStmt = db.prepare(`
      INSERT INTO tasks (
        organisation_id, task_name, description, assigned_to, created_by, priority, priority_rank,
        status, drive_link, due_date, notes, department, is_archived, created_at, updated_at,
        parent_task_id, recurrence_rule, recurrence_interval, recurrence_next_date, is_recurring,
        project_id, milestone_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'Not Started', ?, ?, ?, ?, 0, ?, ?, ?, '', 1, '', 0, ?, ?)
    `).bind(
      t.organisation_id,
      t.task_name,
      t.description,
      t.assigned_to,
      t.created_by,
      t.priority,
      t.priority_rank,
      t.drive_link || '',
      t.recurrence_next_date, // instance due date
      t.notes || '',
      t.department || '',
      now,
      now,
      t.id,
      t.project_id || null,
      t.milestone_id || null
    );

    const runRes = await insertStmt.run();
    const newId = Number(runRes.meta?.last_row_id);

    // Record activity
    await db.prepare(`
      INSERT INTO task_activities (organisation_id, task_id, user_id, activity_type, new_value, details, created_at)
      VALUES (?, ?, ?, 'created', ?, ?, ?)
    `).bind(
      t.organisation_id,
      newId,
      t.created_by,
      t.task_name,
      'Generated from recurring schedule (' + t.recurrence_rule + ')',
      now
    ).run();

    // Advance next recurrence date on the master task
    await db.prepare(`
      UPDATE tasks SET recurrence_next_date = ?, updated_at = ? WHERE id = ?
    `).bind(nextDate, now, t.id).run();

    generatedCount++;
  }

  // SCHEDULE-BASED AUTOMATIONS: Scan for overdue tasks requiring automation
  let automationsExecuted = 0;
  try {
    // Find active automations for task_overdue
    const autoStmt = db.prepare(`
      SELECT * FROM automations
      WHERE trigger_type = 'task_overdue' AND is_enabled = 1
      LIMIT 20
    `);
    const autoRes = await autoStmt.all();
    const overdueAutomations = (autoRes.results || []) as any[];

    if (overdueAutomations.length > 0) {
      for (const auto of overdueAutomations) {
        // Query overdue tasks for this organisation
        const overdueTasksStmt = db.prepare(`
          SELECT * FROM tasks
          WHERE organisation_id = ?
            AND status != 'Completed'
            AND is_archived = 0
            AND due_date != ''
            AND due_date < ?
          LIMIT 25
        `).bind(auto.organisation_id, today);

        const tasksRes = await overdueTasksStmt.all();
        const overdueTasks = (tasksRes.results || []) as any[];

        for (const task of overdueTasks) {
          // Idempotency key for this task becoming overdue today
          const eventRef = `task:${task.id}:overdue:${today}`;
          const idempotencyKey = `${auto.organisation_id}:${auto.id}:${eventRef}`;

          // Check if already executed
          const checkRun = await db.prepare(`
            SELECT id FROM automation_runs WHERE idempotency_key = ?
          `).bind(idempotencyKey).first();

          if (checkRun) continue;

          // Parse conditions & actions
          let conditions: any[] = [];
          let actions: any[] = [];
          try {
            conditions = auto.conditions ? JSON.parse(auto.conditions) : [];
            actions = auto.actions ? JSON.parse(auto.actions) : [];
          } catch {}

          // Evaluate conditions in memory
          let matched = true;
          for (const cond of conditions) {
            let actualValue: any = undefined;
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

          // Execute action: notify creator or assignee
          const summaries: string[] = [];
          for (const act of actions) {
            if (act.action_type === 'notify_task_creator') {
              await db.prepare(`
                INSERT INTO notification_events 
                (organisation_id, recipient_user_id, actor_user_id, type, title, body, target_url, entity_type, entity_id, is_read, created_at)
                VALUES (?, ?, ?, 'task_status_changed', ?, ?, ?, 'Task', ?, 0, ?)
              `).bind(
                auto.organisation_id,
                task.created_by,
                auto.created_by,
                `Overdue Task: ${task.task_name}`,
                `Task #${task.id} is overdue (Due date: ${task.due_date})`,
                `/all-tasks?taskId=${task.id}`,
                task.id,
                now
              ).run();
              summaries.push(`Notified creator #${task.created_by}`);
            } else if (act.action_type === 'notify_assignee') {
              await db.prepare(`
                INSERT INTO notification_events 
                (organisation_id, recipient_user_id, actor_user_id, type, title, body, target_url, entity_type, entity_id, is_read, created_at)
                VALUES (?, ?, ?, 'task_assigned', ?, ?, ?, 'Task', ?, 0, ?)
              `).bind(
                auto.organisation_id,
                task.assigned_to,
                auto.created_by,
                `Overdue Notice: ${task.task_name}`,
                `Your task is overdue (Due date: ${task.due_date})`,
                `/my-tasks?taskId=${task.id}`,
                task.id,
                now
              ).run();
              summaries.push(`Notified assignee #${task.assigned_to}`);
            }
          }

          // Record run in ledger
          await db.prepare(`
            INSERT INTO automation_runs (
              organisation_id, automation_id, event_type, event_reference, idempotency_key,
              status, details, error, created_at, completed_at
            ) VALUES (?, ?, 'task_overdue', ?, ?, 'success', ?, NULL, ?, ?)
          `).bind(
            auto.organisation_id,
            auto.id,
            eventRef,
            idempotencyKey,
            summaries.join('; ') || 'Overdue action executed',
            now,
            new Date().toISOString()
          ).run();

          await db.prepare(`
            UPDATE automations SET last_run_at = ?, success_count = success_count + 1, updated_at = ? WHERE id = ?
          `).bind(now, now, auto.id).run();

          automationsExecuted++;
        }
      }
    }
  } catch (schedErr) {
    console.error('[Scheduler] Error evaluating overdue automations:', schedErr);
  }

  // 3. Evaluate Calendar Meeting Reminders (Starting within next 20 minutes)
  try {
    const upcomingWindow = new Date(Date.now() + 20 * 60 * 1000).toISOString();
    const pastWindow = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    const dueEventsStmt = db.prepare(`
      SELECT id, organisation_id, title, start_at, location, meeting_url, created_by
      FROM calendar_events
      WHERE status = 'scheduled'
        AND reminder_sent = 0
        AND start_at <= ?
        AND start_at >= ?
      LIMIT 20
    `).bind(upcomingWindow, pastWindow);

    const dueEventsResult = await dueEventsStmt.all();
    const dueEvents = (dueEventsResult.results || []) as any[];

    for (const evt of dueEvents) {
      // Find attendees for this event
      const attStmt = db.prepare(`
        SELECT user_id, response FROM event_attendees
        WHERE event_id = ? AND response != 'declined'
      `).bind(evt.id);
      const attResult = await attStmt.all();
      const attendees = (attResult.results || []) as any[];

      for (const att of attendees) {
        await db.prepare(`
          INSERT INTO notification_events (
            organisation_id, recipient_user_id, actor_user_id, type, title, body, target_url, entity_type, entity_id, is_read, created_at
          ) VALUES (?, ?, ?, 'calendar_reminder', ?, ?, ?, 'CalendarEvent', ?, 0, ?)
        `).bind(
          evt.organisation_id,
          att.user_id,
          evt.created_by,
          `Meeting Starting Soon: ${evt.title}`,
          `"${evt.title}" starts soon${evt.location ? ` at ${evt.location}` : ''}.`,
          `/calendar?eventId=${evt.id}`,
          evt.id,
          now
        ).run();
      }

      // Mark reminder sent
      await db.prepare(`
        UPDATE calendar_events SET reminder_sent = 1, updated_at = ? WHERE id = ?
      `).bind(now, evt.id).run();
    }
  } catch (remErr) {
    console.error('[Scheduler] Error evaluating meeting reminders:', remErr);
  }

  // 4. Automated Retention & Deletion Lifecycle Sweep
  let retentionResult: RetentionSweepResult | undefined;
  try {
    retentionResult = await runRetentionSweepWithDb(db);
  } catch (retErr) {
    console.error('[Scheduler] Error executing retention sweep:', retErr);
  }

  return {
    success: true,
    sweepTimestamp: now,
    evaluatedDate: today,
    generatedCount,
    retention: retentionResult,
  };
}
