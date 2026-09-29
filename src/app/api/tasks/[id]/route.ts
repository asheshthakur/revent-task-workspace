import { NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth';
import { queryFirst, queryAll, queryRun, logAuditAction } from '@/lib/db';
import { PRIORITY_MAP, PRIORITIES, STATUSES } from '@/lib/constants';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getTenantContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { user, activeOrg } = ctx;

    const { id } = await params;
    const taskId = parseInt(id, 10);
    if (isNaN(taskId)) {
      return NextResponse.json({ error: 'Invalid task ID' }, { status: 400 });
    }

    const task = await queryFirst<any>(`
      SELECT 
        t.*,
        u_assigned.name as assigned_to_name,
        u_assigned.email as assigned_to_email,
        u_assigned.department as assigned_to_department,
        u_assigned.is_active as assigned_to_is_active,
        u_created.name as created_by_name,
        u_created.name as assigned_by_name,
        u_created.email as assigned_by_email,
        i.invoice_number,
        i.total_amount as invoice_total_amount,
        c.name as client_name
      FROM tasks t
      LEFT JOIN users u_assigned ON t.assigned_to = u_assigned.id
      LEFT JOIN users u_created ON t.created_by = u_created.id
      LEFT JOIN invoices i ON t.invoice_id = i.id
      LEFT JOIN clients c ON i.client_id = c.id
      WHERE t.id = ?
    `, [taskId]);

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // STRICT MULTI-TENANT ISOLATION: Must belong to active organisation
    if (task.organisation_id !== activeOrg.id) {
      return NextResponse.json({ error: 'Forbidden: Task does not belong to active organization' }, { status: 403 });
    }

    // Role check: Employee can view if they are the current assignee, the assigner (created_by), or a historical assignee
    if (!activeOrg.is_admin && task.assigned_to !== user.id && task.created_by !== user.id) {
      const historicalAssignee = await queryFirst<any>(
        'SELECT id FROM task_assignment_history WHERE task_id = ? AND assigned_to_user_id = ? LIMIT 1',
        [taskId, user.id]
      );
      if (!historicalAssignee) {
        return NextResponse.json({ error: 'Forbidden: You can only view your own tasks or tasks assigned by you' }, { status: 403 });
      }
    }

    // Fetch assignment history
    const assignmentHistory = await queryAll(`
      SELECT 
        ah.*,
        u_by.name as assigned_by_name,
        u_to.name as assigned_to_name
      FROM task_assignment_history ah
      LEFT JOIN users u_by ON ah.assigned_by_user_id = u_by.id
      LEFT JOIN users u_to ON ah.assigned_to_user_id = u_to.id
      WHERE ah.task_id = ?
      ORDER BY ah.assigned_at DESC
    `, [taskId]);

    // Fetch status change history
    const statusHistory = await queryAll(`
      SELECT 
        sh.*,
        u.name as changed_by_name
      FROM task_status_history sh
      LEFT JOIN users u ON sh.changed_by_user_id = u.id
      WHERE sh.task_id = ?
      ORDER BY sh.changed_at DESC
    `, [taskId]);

    return NextResponse.json({ task, assignmentHistory, statusHistory });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to fetch task: ' + errorMsg }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getTenantContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { user, activeOrg } = ctx;

    const { id } = await params;
    const taskId = parseInt(id, 10);
    if (isNaN(taskId)) {
      return NextResponse.json({ error: 'Invalid task ID' }, { status: 400 });
    }

    const task = await queryFirst<any>(`
      SELECT t.*, u.name as current_assigned_name
      FROM tasks t
      LEFT JOIN users u ON t.assigned_to = u.id
      WHERE t.id = ?
    `, [taskId]);

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // STRICT MULTI-TENANT ISOLATION: Must belong to active organisation
    if (task.organisation_id !== activeOrg.id) {
      return NextResponse.json({ error: 'Forbidden: Task does not belong to active organization' }, { status: 403 });
    }

    // Employee authorization: allowed to update status if currently assigned to them OR if assigned by them
    if (!activeOrg.is_admin && task.assigned_to !== user.id && task.created_by !== user.id) {
      return NextResponse.json({ error: 'Forbidden: You cannot modify other users tasks' }, { status: 403 });
    }

    const body = await req.json();
    const now = new Date().toISOString();

    const updates: string[] = [];
    const values: any[] = [];

    // 1. Status update
    if (body.status !== undefined) {
      if (!STATUSES.includes(body.status)) {
        return NextResponse.json({ error: `Invalid status: ${body.status}` }, { status: 400 });
      }

      if (body.status !== task.status) {
        updates.push('status = ?');
        values.push(body.status);

        if (body.status === 'Completed') {
          updates.push('completed_at = ?');
          values.push(task.completed_at || now);
        } else {
          updates.push('completed_at = ?');
          values.push(null);
        }

        // Record in task_status_history
        await queryRun(
          `INSERT INTO task_status_history (organisation_id, task_id, changed_by_user_id, old_status, new_status, changed_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [activeOrg.id, taskId, user.id, task.status, body.status, now]
        );

        // Audit Log
        await logAuditAction({
          organisationId: activeOrg.id,
          userId: user.id,
          actionType: 'Status Changed',
          entityType: 'Task',
          entityId: taskId,
          entityTitle: task.task_name,
          oldValue: task.status,
          newValue: body.status,
        });
      }
    }

    // 2. Admin Reassignment & Full Edit
    if (activeOrg.is_admin) {
      if (body.assigned_to !== undefined && body.assigned_to !== task.assigned_to) {
        // Verify target employee belongs to active organisation
        const targetMember = await queryFirst<any>(
          `SELECT u.id, u.name, u.is_active 
           FROM organisation_members om
           JOIN users u ON om.user_id = u.id
           WHERE om.organisation_id = ? AND om.user_id = ? AND om.status = 'active'`,
          [activeOrg.id, body.assigned_to]
        );

        if (!targetMember) {
          return NextResponse.json({ error: 'Target employee does not belong to this organization' }, { status: 400 });
        }
        if (targetMember.is_active !== 1) {
          return NextResponse.json(
            { error: `Cannot assign task to ${targetMember.name} as this employee is inactive` },
            { status: 400 }
          );
        }

        updates.push('assigned_to = ?');
        values.push(body.assigned_to);

        updates.push('created_by = ?');
        values.push(user.id);

        await queryRun(
          `INSERT INTO task_assignment_history (organisation_id, task_id, assigned_by_user_id, assigned_to_user_id, assigned_at, notes)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            activeOrg.id,
            taskId,
            user.id,
            targetMember.id,
            now,
            `Reassigned from ${task.current_assigned_name || 'Previous'} to ${targetMember.name}`,
          ]
        );

        await logAuditAction({
          organisationId: activeOrg.id,
          userId: user.id,
          actionType: 'Task Reassigned',
          entityType: 'Task',
          entityId: taskId,
          entityTitle: task.task_name,
          oldValue: task.current_assigned_name,
          newValue: targetMember.name,
        });
      }

      if (body.task_name !== undefined) {
        updates.push('task_name = ?');
        values.push(body.task_name.trim());
      }

      if (body.description !== undefined) {
        updates.push('description = ?');
        values.push(body.description.trim());
      }

      if (body.priority !== undefined) {
        if (!PRIORITIES.includes(body.priority)) {
          return NextResponse.json({ error: `Invalid priority: ${body.priority}` }, { status: 400 });
        }
        if (body.priority !== task.priority) {
          updates.push('priority = ?');
          values.push(body.priority);
          updates.push('priority_rank = ?');
          values.push(PRIORITY_MAP[body.priority] || 99);

          await logAuditAction({
            organisationId: activeOrg.id,
            userId: user.id,
            actionType: 'Priority Changed',
            entityType: 'Task',
            entityId: taskId,
            entityTitle: task.task_name,
            oldValue: task.priority,
            newValue: body.priority,
          });
        }
      }

      if (body.drive_link !== undefined) {
        if (body.drive_link && body.drive_link.trim()) {
          try {
            const parsed = new URL(body.drive_link.trim());
            if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
              return NextResponse.json({ error: 'Work link must start with http:// or https://' }, { status: 400 });
            }
          } catch {
            return NextResponse.json({ error: 'Invalid URL for work link' }, { status: 400 });
          }
        }
        updates.push('drive_link = ?');
        values.push(body.drive_link ? body.drive_link.trim() : '');
      }

      if (body.due_date !== undefined) {
        updates.push('due_date = ?');
        values.push(body.due_date || '');
      }

      if (body.notes !== undefined) {
        updates.push('notes = ?');
        values.push(body.notes ? body.notes.trim() : '');
      }

      if (body.department !== undefined) {
        updates.push('department = ?');
        values.push(body.department || '');
      }
    }

    if (updates.length === 0) {
      return NextResponse.json({ success: true, task });
    }

    updates.push('updated_at = ?');
    values.push(now);
    values.push(taskId);

    const query = `UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`;
    await queryRun(query, values);

    const updatedTask = await queryFirst<any>(`
      SELECT 
        t.*, 
        u_assigned.name as assigned_to_name,
        u_assigned.email as assigned_to_email,
        u_assigned.department as assigned_to_department,
        u_created.name as created_by_name,
        u_created.name as assigned_by_name
      FROM tasks t
      LEFT JOIN users u_assigned ON t.assigned_to = u_assigned.id
      LEFT JOIN users u_created ON t.created_by = u_created.id
      WHERE t.id = ?
    `, [taskId]);

    return NextResponse.json({ success: true, task: updatedTask });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to update task: ' + errorMsg }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getTenantContext();
    if (!ctx || !ctx.activeOrg.is_admin) {
      return NextResponse.json({ error: 'Forbidden: Admin access required to archive tasks' }, { status: 403 });
    }
    const { user, activeOrg } = ctx;

    const { id } = await params;
    const taskId = parseInt(id, 10);
    if (isNaN(taskId)) {
      return NextResponse.json({ error: 'Invalid task ID' }, { status: 400 });
    }

    const task = await queryFirst<any>('SELECT task_name, organisation_id FROM tasks WHERE id = ?', [taskId]);
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    if (task.organisation_id !== activeOrg.id) {
      return NextResponse.json({ error: 'Forbidden: Task does not belong to active organization' }, { status: 403 });
    }

    const now = new Date().toISOString();
    await queryRun('UPDATE tasks SET is_archived = 1, updated_at = ? WHERE id = ?', [now, taskId]);

    await logAuditAction({
      organisationId: activeOrg.id,
      userId: user.id,
      actionType: 'Task Archived',
      entityType: 'Task',
      entityId: taskId,
      entityTitle: task?.task_name || 'Task',
      newValue: 'Archived / Soft-deleted',
    });

    return NextResponse.json({ success: true, message: 'Task archived successfully' });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to archive task: ' + errorMsg }, { status: 500 });
  }
}
