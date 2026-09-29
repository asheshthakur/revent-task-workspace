import { NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth';
import { queryFirst, queryRun, logAuditAction } from '@/lib/db';

interface Context {
  params: Promise<{ taskId: string }>;
}

export async function GET(req: Request, context: Context) {
  try {
    const ctx = await getTenantContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { user, activeOrg } = ctx;

    const { taskId } = await context.params;
    const tId = parseInt(taskId, 10);
    if (isNaN(tId)) {
      return NextResponse.json({ error: 'Invalid task ID' }, { status: 400 });
    }

    // 1. Verify task exists and belongs to active organization
    const task = await queryFirst<any>(`
      SELECT id, organisation_id, task_name, assigned_to, created_by, status, priority
      FROM tasks 
      WHERE id = ?
    `, [tId]);

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    if (task.organisation_id !== activeOrg.id) {
      return NextResponse.json({ error: 'Forbidden: Task does not belong to active organization' }, { status: 403 });
    }

    // 2. Verify user has authorized access to this task
    // Assigned user, assigner/creator, or admin
    const isAssigned = task.assigned_to === user.id;
    const isCreator = task.created_by === user.id;
    const isAdmin = activeOrg.is_admin;

    if (!isAssigned && !isCreator && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden: You do not have permission to access this task discussion' }, { status: 403 });
    }

    const now = new Date().toISOString();

    // 3. Find existing task conversation or create one
    let conv = await queryFirst<any>(`
      SELECT * FROM conversations WHERE organisation_id = ? AND type = 'task' AND task_id = ?
    `, [activeOrg.id, tId]);

    if (!conv) {
      const insertConv = await queryRun(`
        INSERT INTO conversations (organisation_id, type, name, task_id, avatar_emoji, created_by, created_at, updated_at)
        VALUES (?, 'task', ?, ?, '📋', ?, ?, ?)
      `, [activeOrg.id, `Task: ${task.task_name}`, tId, user.id, now, now]);

      const convId = insertConv.lastInsertRowid;
      if (!convId) {
        throw new Error('Failed to create task conversation');
      }

      // Add members: assigned_to, created_by, and current user
      const memberIds = Array.from(new Set([task.assigned_to, task.created_by, user.id])).filter(id => id > 0);
      for (const mId of memberIds) {
        await queryRun(`
          INSERT OR IGNORE INTO conversation_members (conversation_id, user_id, joined_at, last_read_at)
          VALUES (?, ?, ?, ?)
        `, [convId, mId, now, now]);
      }

      conv = await queryFirst<any>('SELECT * FROM conversations WHERE id = ?', [convId]);

      await logAuditAction({
        userId: user.id,
        actionType: 'Task Discussion Started',
        entityType: 'task',
        entityId: tId,
        entityTitle: task.task_name,
      });
    } else {
      // Ensure current user is in conversation_members
      await queryRun(`
        INSERT OR IGNORE INTO conversation_members (conversation_id, user_id, joined_at, last_read_at)
        VALUES (?, ?, ?, ?)
      `, [conv.id, user.id, now, now]);
    }

    // Calculate unread count for current user
    const memberRow = await queryFirst<any>(`
      SELECT last_read_at FROM conversation_members WHERE conversation_id = ? AND user_id = ?
    `, [conv.id, user.id]);

    const lastReadAt = memberRow?.last_read_at || '';
    const unreadRow = await queryFirst<{ unread_count: number }>(`
      SELECT COUNT(id) as unread_count
      FROM messages
      WHERE conversation_id = ? AND sender_user_id != ? AND is_deleted = 0 AND created_at > ?
    `, [conv.id, user.id, lastReadAt]);

    return NextResponse.json({
      conversationId: conv.id,
      task: {
        id: task.id,
        task_name: task.task_name,
        assigned_to: task.assigned_to,
        created_by: task.created_by,
        status: task.status,
        priority: task.priority,
      },
      unreadCount: Number(unreadRow?.unread_count || 0),
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to access task discussion: ' + errorMsg }, { status: 500 });
  }
}
