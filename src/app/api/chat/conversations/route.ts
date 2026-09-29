import { NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth';
import { queryAll, queryFirst, queryRun, logAuditAction } from '@/lib/db';

export async function GET() {
  try {
    const ctx = await getTenantContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { user, activeOrg } = ctx;

    // 1. Fetch conversations current user belongs to WITHIN THE ACTIVE ORGANISATION
    const conversations = await queryAll<any>(`
      SELECT 
        c.id,
        c.type,
        c.name,
        c.task_id,
        c.avatar_emoji,
        c.created_by,
        c.created_at,
        c.updated_at,
        c.last_message_text,
        c.last_message_at,
        cm.last_read_at,
        t.task_name,
        t.status as task_status,
        t.priority as task_priority
      FROM conversations c
      JOIN conversation_members cm ON c.id = cm.conversation_id AND cm.user_id = ?
      LEFT JOIN tasks t ON c.task_id = t.id
      WHERE c.organisation_id = ?
      ORDER BY COALESCE(NULLIF(c.last_message_at, ''), c.updated_at) DESC
    `, [user.id, activeOrg.id]);

    const enriched = await Promise.all(
      conversations.map(async (conv) => {
        // Unread messages count for this conversation
        const unreadRow = await queryFirst<{ unread_count: number }>(`
          SELECT COUNT(m.id) as unread_count
          FROM messages m
          WHERE m.conversation_id = ? 
            AND m.sender_user_id != ?
            AND m.is_deleted = 0
            AND m.created_at > ?
        `, [conv.id, user.id, conv.last_read_at]);

        // Members of this conversation
        const members = await queryAll<any>(`
          SELECT 
            u.id, 
            u.name, 
            u.email, 
            om.role as role, 
            om.department as department, 
            u.animal_emoji,
            u.selected_status,
            cm.joined_at,
            cm.last_read_at
          FROM conversation_members cm
          JOIN users u ON cm.user_id = u.id
          LEFT JOIN organisation_members om ON u.id = om.user_id AND om.organisation_id = ?
          WHERE cm.conversation_id = ?
          ORDER BY u.name ASC
        `, [activeOrg.id, conv.id]);

        // For direct chats: resolve display name and avatar based on other participant
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

        return {
          id: conv.id,
          type: conv.type,
          name: displayName,
          avatar_emoji: displayAvatar,
          task_id: conv.task_id,
          task_name: conv.task_name,
          task_status: conv.task_status,
          task_priority: conv.task_priority,
          created_by: conv.created_by,
          created_at: conv.created_at,
          updated_at: conv.updated_at,
          last_message_text: conv.last_message_text,
          last_message_at: conv.last_message_at,
          last_read_at: conv.last_read_at,
          unread_count: Number(unreadRow?.unread_count || 0),
          members,
          other_user: otherUser,
        };
      })
    );

    return NextResponse.json({ conversations: enriched });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to fetch conversations: ' + errorMsg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await getTenantContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { user, activeOrg } = ctx;

    const body = await req.json();
    const { type, targetUserId, name, memberIds, avatarEmoji } = body;

    const now = new Date().toISOString();

    // 1. DIRECT 1-to-1 CONVERSATION
    if (type === 'direct') {
      if (!targetUserId) {
        return NextResponse.json({ error: 'targetUserId is required for direct conversation' }, { status: 400 });
      }

      const targetId = Number(targetUserId);
      if (targetId === user.id) {
        return NextResponse.json({ error: 'Cannot start conversation with yourself' }, { status: 400 });
      }

      // Check if target user exists and belongs to active organisation
      const targetMember = await queryFirst<any>(
        `SELECT u.id, u.name, u.is_active 
         FROM organisation_members om
         JOIN users u ON om.user_id = u.id
         WHERE om.organisation_id = ? AND om.user_id = ? AND om.status = 'active'`,
        [activeOrg.id, targetId]
      );

      if (!targetMember) {
        return NextResponse.json({ error: 'Target user not found in this organization' }, { status: 404 });
      }

      // Check if direct conversation already exists in this organisation
      const existing = await queryFirst<any>(`
        SELECT c.id
        FROM conversations c
        JOIN conversation_members cm1 ON c.id = cm1.conversation_id AND cm1.user_id = ?
        JOIN conversation_members cm2 ON c.id = cm2.conversation_id AND cm2.user_id = ?
        WHERE c.organisation_id = ? AND c.type = 'direct'
        LIMIT 1
      `, [user.id, targetId, activeOrg.id]);

      if (existing) {
        return NextResponse.json({ conversationId: existing.id, isExisting: true });
      }

      // Create new direct conversation scoped to activeOrg.id
      const insertConv = await queryRun(`
        INSERT INTO conversations (organisation_id, type, name, avatar_emoji, created_by, created_at, updated_at)
        VALUES (?, 'direct', '', '💬', ?, ?, ?)
      `, [activeOrg.id, user.id, now, now]);

      const convId = insertConv.lastInsertRowid;
      if (!convId) {
        throw new Error('Failed to create conversation');
      }

      // Add both members
      await queryRun(`
        INSERT INTO conversation_members (conversation_id, user_id, joined_at, last_read_at)
        VALUES (?, ?, ?, ?), (?, ?, ?, ?)
      `, [convId, user.id, now, now, convId, targetId, now, now]);

      await logAuditAction({
        organisationId: activeOrg.id,
        userId: user.id,
        actionType: 'Direct Chat Started',
        entityType: 'conversation',
        entityId: Number(convId),
        entityTitle: `Direct chat with ${targetMember.name}`,
      });

      return NextResponse.json({ conversationId: convId, isExisting: false });
    }

    // 2. GROUP CONVERSATION
    if (type === 'group') {
      if (!name || !name.trim()) {
        return NextResponse.json({ error: 'Group name is required' }, { status: 400 });
      }

      const groupName = name.trim();
      const emoji = avatarEmoji || '📣';

      // Member IDs must include creator
      const rawMembers = Array.isArray(memberIds) ? memberIds.map(Number) : [];
      const distinctMembers = Array.from(new Set([user.id, ...rawMembers])).filter(id => !isNaN(id) && id > 0);

      // Verify all members belong to the active organisation
      for (const mId of distinctMembers) {
        const isOrgMember = await queryFirst<any>(
          'SELECT id FROM organisation_members WHERE organisation_id = ? AND user_id = ? AND status = "active"',
          [activeOrg.id, mId]
        );
        if (!isOrgMember) {
          return NextResponse.json({ error: `User ID ${mId} is not a member of this workspace` }, { status: 400 });
        }
      }

      if (distinctMembers.length < 2) {
        return NextResponse.json({ error: 'Group must have at least 2 members' }, { status: 400 });
      }

      const insertGroup = await queryRun(`
        INSERT INTO conversations (organisation_id, type, name, avatar_emoji, created_by, created_at, updated_at)
        VALUES (?, 'group', ?, ?, ?, ?, ?)
      `, [activeOrg.id, groupName, emoji, user.id, now, now]);

      const convId = insertGroup.lastInsertRowid;
      if (!convId) {
        throw new Error('Failed to create group');
      }

      for (const mId of distinctMembers) {
        await queryRun(`
          INSERT INTO conversation_members (conversation_id, user_id, joined_at, last_read_at)
          VALUES (?, ?, ?, ?)
        `, [convId, mId, now, now]);
      }

      await logAuditAction({
        organisationId: activeOrg.id,
        userId: user.id,
        actionType: 'Group Created',
        entityType: 'conversation',
        entityId: Number(convId),
        entityTitle: `Group: ${groupName}`,
        newValue: `Members: ${distinctMembers.length}`,
      });

      return NextResponse.json({ conversationId: convId, isExisting: false });
    }

    return NextResponse.json({ error: 'Invalid conversation type' }, { status: 400 });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to create conversation: ' + errorMsg }, { status: 500 });
  }
}
