import { NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth';
import { queryAll, queryFirst, queryRun } from '@/lib/db';

interface Context {
  params: Promise<{ id: string }>;
}

export async function GET(req: Request, context: Context) {
  try {
    const ctx = await getTenantContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { user, activeOrg } = ctx;

    const { id } = await context.params;
    const convId = parseInt(id, 10);
    if (isNaN(convId)) {
      return NextResponse.json({ error: 'Invalid conversation ID' }, { status: 400 });
    }

    // Verify conversation belongs to active organization
    const conv = await queryFirst<any>(
      'SELECT id, organisation_id FROM conversations WHERE id = ?',
      [convId]
    );

    if (!conv || conv.organisation_id !== activeOrg.id) {
      return NextResponse.json({ error: 'Forbidden: Conversation does not belong to active organization' }, { status: 403 });
    }

    // Verify membership
    const membership = await queryFirst<any>(`
      SELECT * FROM conversation_members WHERE conversation_id = ? AND user_id = ?
    `, [convId, user.id]);

    if (!membership && !activeOrg.is_admin) {
      return NextResponse.json({ error: 'Forbidden: You are not a member of this conversation' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const beforeId = searchParams.get('beforeId');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);

    let sql = `
      SELECT 
        m.id,
        m.conversation_id,
        m.sender_user_id,
        m.message,
        m.reply_to_id,
        m.reply_preview,
        m.is_deleted,
        m.created_at,
        m.edited_at,
        u.name as sender_name,
        u.email as sender_email,
        u.animal_emoji as sender_animal_emoji,
        u.selected_status as sender_selected_status
      FROM messages m
      JOIN users u ON m.sender_user_id = u.id
      WHERE m.conversation_id = ?
    `;
    const params: any[] = [convId];

    if (beforeId) {
      sql += ` AND m.id < ? `;
      params.push(parseInt(beforeId, 10));
    }

    sql += ` ORDER BY m.id DESC LIMIT ? `;
    params.push(limit);

    const rows = await queryAll<any>(sql, params);
    // Reverse so messages are delivered in chronological order (oldest to newest)
    const messages = rows.reverse();

    return NextResponse.json({ messages });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to fetch messages: ' + errorMsg }, { status: 500 });
  }
}

export async function POST(req: Request, context: Context) {
  try {
    const ctx = await getTenantContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { user, activeOrg } = ctx;

    const { id } = await context.params;
    const convId = parseInt(id, 10);
    if (isNaN(convId)) {
      return NextResponse.json({ error: 'Invalid conversation ID' }, { status: 400 });
    }

    // Verify conversation belongs to active organization
    const conv = await queryFirst<any>(
      'SELECT id, organisation_id FROM conversations WHERE id = ?',
      [convId]
    );

    if (!conv || conv.organisation_id !== activeOrg.id) {
      return NextResponse.json({ error: 'Forbidden: Conversation does not belong to active organization' }, { status: 403 });
    }

    // Verify membership
    let membership = await queryFirst<any>(`
      SELECT * FROM conversation_members WHERE conversation_id = ? AND user_id = ?
    `, [convId, user.id]);

    // If admin is not an explicit member, auto-join for task discussions or viewing
    if (!membership) {
      if (activeOrg.is_admin) {
        const now = new Date().toISOString();
        await queryRun(`
          INSERT OR IGNORE INTO conversation_members (conversation_id, user_id, joined_at, last_read_at)
          VALUES (?, ?, ?, ?)
        `, [convId, user.id, now, now]);
        membership = { conversation_id: convId, user_id: user.id };
      } else {
        return NextResponse.json({ error: 'Forbidden: You are not a member of this conversation' }, { status: 403 });
      }
    }

    const body = await req.json();
    const { message, reply_to_id } = body;

    if (!message || !message.trim()) {
      return NextResponse.json({ error: 'Message cannot be empty' }, { status: 400 });
    }

    const cleanMessage = message.trim();
    const now = new Date().toISOString();

    // Check reply preview if replying
    let replyPreview = '';
    let replyId: number | null = null;
    if (reply_to_id) {
      const parentMsg = await queryFirst<any>(`
        SELECT m.id, m.message, m.is_deleted, u.name as sender_name
        FROM messages m
        JOIN users u ON m.sender_user_id = u.id
        WHERE m.id = ? AND m.conversation_id = ?
      `, [reply_to_id, convId]);

      if (parentMsg) {
        replyId = parentMsg.id;
        const snippet = parentMsg.is_deleted ? 'Message deleted' : parentMsg.message.slice(0, 80);
        replyPreview = `${parentMsg.sender_name}: ${snippet}`;
      }
    }

    // Insert message
    const insertRes = await queryRun(`
      INSERT INTO messages (conversation_id, sender_user_id, message, reply_to_id, reply_preview, is_deleted, created_at)
      VALUES (?, ?, ?, ?, ?, 0, ?)
    `, [convId, user.id, cleanMessage, replyId, replyPreview, now]);

    const messageId = insertRes.lastInsertRowid;

    // Update conversation metadata: last_message_text, last_message_at, updated_at
    const previewText = cleanMessage.length > 60 ? cleanMessage.slice(0, 60) + '...' : cleanMessage;
    await queryRun(`
      UPDATE conversations 
      SET last_message_text = ?, last_message_at = ?, updated_at = ?
      WHERE id = ?
    `, [previewText, now, now, convId]);

    // Update sender's last_read_at
    await queryRun(`
      UPDATE conversation_members 
      SET last_read_at = ?
      WHERE conversation_id = ? AND user_id = ?
    `, [now, convId, user.id]);

    const createdMsg = {
      id: messageId,
      conversation_id: convId,
      sender_user_id: user.id,
      message: cleanMessage,
      reply_to_id: replyId,
      reply_preview: replyPreview,
      is_deleted: 0,
      created_at: now,
      edited_at: null,
      sender_name: user.name,
      sender_email: user.email,
      sender_animal_emoji: user.animal_emoji || '🦊',
      sender_selected_status: user.selected_status || 'Online',
    };

    return NextResponse.json({ message: createdMsg });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to send message: ' + errorMsg }, { status: 500 });
  }
}
