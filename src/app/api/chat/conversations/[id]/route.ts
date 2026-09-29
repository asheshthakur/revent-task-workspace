import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { queryAll, queryFirst, queryRun, logAuditAction } from '@/lib/db';

interface Context {
  params: Promise<{ id: string }>;
}

export async function GET(req: Request, context: Context) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const convId = parseInt(id, 10);
    if (isNaN(convId)) {
      return NextResponse.json({ error: 'Invalid conversation ID' }, { status: 400 });
    }

    // Verify membership
    const membership = await queryFirst<any>(`
      SELECT * FROM conversation_members WHERE conversation_id = ? AND user_id = ?
    `, [convId, user.id]);

    if (!membership && user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: You are not a member of this conversation' }, { status: 403 });
    }

    const conv = await queryFirst<any>(`
      SELECT 
        c.*, 
        t.task_name,
        t.status as task_status,
        t.priority as task_priority,
        t.assigned_to as task_assigned_to,
        t.created_by as task_created_by,
        u.name as creator_name
      FROM conversations c
      LEFT JOIN tasks t ON c.task_id = t.id
      LEFT JOIN users u ON c.created_by = u.id
      WHERE c.id = ?
    `, [convId]);

    if (!conv) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const members = await queryAll<any>(`
      SELECT 
        u.id, 
        u.name, 
        u.email, 
        u.role, 
        u.department, 
        u.animal_emoji,
        u.selected_status,
        cm.joined_at,
        cm.last_read_at
      FROM conversation_members cm
      JOIN users u ON cm.user_id = u.id
      WHERE cm.conversation_id = ?
      ORDER BY u.name ASC
    `, [convId]);

    let displayName = conv.name;
    let displayAvatar = conv.avatar_emoji;
    let otherUser = null;

    if (conv.type === 'direct') {
      otherUser = members.find((m) => m.id !== user.id) || members[0];
      if (otherUser) {
        displayName = otherUser.name;
        displayAvatar = otherUser.animal_emoji || '🦊';
      }
    } else if (conv.type === 'task') {
      displayName = conv.task_name ? `Task: ${conv.task_name}` : conv.name || 'Task Discussion';
      displayAvatar = '📋';
    }

    return NextResponse.json({
      conversation: {
        ...conv,
        name: displayName,
        avatar_emoji: displayAvatar,
        members,
        other_user: otherUser,
      },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to fetch conversation: ' + errorMsg }, { status: 500 });
  }
}

export async function PUT(req: Request, context: Context) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const convId = parseInt(id, 10);
    if (isNaN(convId)) {
      return NextResponse.json({ error: 'Invalid conversation ID' }, { status: 400 });
    }

    const conv = await queryFirst<any>('SELECT * FROM conversations WHERE id = ?', [convId]);
    if (!conv) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    if (conv.type !== 'group') {
      return NextResponse.json({ error: 'Only group conversations can be modified' }, { status: 400 });
    }

    // Permission: Creator or Admin
    if (conv.created_by !== user.id && user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Only group creator or admin can update group settings' }, { status: 403 });
    }

    const body = await req.json();
    const { name, avatar_emoji, addMemberIds, removeMemberIds } = body;
    const now = new Date().toISOString();

    if (name && name.trim()) {
      await queryRun('UPDATE conversations SET name = ?, updated_at = ? WHERE id = ?', [name.trim(), now, convId]);
    }

    if (avatar_emoji) {
      await queryRun('UPDATE conversations SET avatar_emoji = ?, updated_at = ? WHERE id = ?', [avatar_emoji, now, convId]);
    }

    // Add members
    if (Array.isArray(addMemberIds) && addMemberIds.length > 0) {
      for (const mId of addMemberIds) {
        await queryRun(`
          INSERT OR IGNORE INTO conversation_members (conversation_id, user_id, joined_at, last_read_at)
          VALUES (?, ?, ?, ?)
        `, [convId, Number(mId), now, now]);
      }
    }

    // Remove members (prevent removing creator unless admin)
    if (Array.isArray(removeMemberIds) && removeMemberIds.length > 0) {
      for (const mId of removeMemberIds) {
        const targetId = Number(mId);
        if (targetId === conv.created_by && user.role !== 'admin') {
          continue; // Cannot remove creator unless admin
        }
        await queryRun(`
          DELETE FROM conversation_members WHERE conversation_id = ? AND user_id = ?
        `, [convId, targetId]);
      }
    }

    await logAuditAction({
      userId: user.id,
      actionType: 'Group Updated',
      entityType: 'conversation',
      entityId: convId,
      entityTitle: name || conv.name,
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to update conversation: ' + errorMsg }, { status: 500 });
  }
}
