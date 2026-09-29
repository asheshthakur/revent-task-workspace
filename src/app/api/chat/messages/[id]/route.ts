import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { queryFirst, queryRun, logAuditAction } from '@/lib/db';

interface Context {
  params: Promise<{ id: string }>;
}

export async function PUT(req: Request, context: Context) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const msgId = parseInt(id, 10);
    if (isNaN(msgId)) {
      return NextResponse.json({ error: 'Invalid message ID' }, { status: 400 });
    }

    const msg = await queryFirst<any>('SELECT * FROM messages WHERE id = ?', [msgId]);
    if (!msg) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    if (msg.is_deleted === 1) {
      return NextResponse.json({ error: 'Cannot edit a deleted message' }, { status: 400 });
    }

    // Only original author can edit message
    if (msg.sender_user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden: You can only edit your own messages' }, { status: 403 });
    }

    const body = await req.json();
    const { message } = body;
    if (!message || !message.trim()) {
      return NextResponse.json({ error: 'Message text cannot be empty' }, { status: 400 });
    }

    const cleanMessage = message.trim();
    const now = new Date().toISOString();

    await queryRun(`
      UPDATE messages 
      SET message = ?, edited_at = ?
      WHERE id = ?
    `, [cleanMessage, now, msgId]);

    await logAuditAction({
      userId: user.id,
      actionType: 'Message Edited',
      entityType: 'message',
      entityId: msgId,
      oldValue: msg.message.slice(0, 50),
      newValue: cleanMessage.slice(0, 50),
    });

    return NextResponse.json({ success: true, message: cleanMessage, edited_at: now });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to edit message: ' + errorMsg }, { status: 500 });
  }
}

export async function DELETE(req: Request, context: Context) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const msgId = parseInt(id, 10);
    if (isNaN(msgId)) {
      return NextResponse.json({ error: 'Invalid message ID' }, { status: 400 });
    }

    const msg = await queryFirst<any>('SELECT * FROM messages WHERE id = ?', [msgId]);
    if (!msg) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    // Permission: original sender or admin moderation
    if (msg.sender_user_id !== user.id && user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: You can only delete your own messages' }, { status: 403 });
    }

    // Soft delete: keep row for audit integrity, display "Message deleted"
    await queryRun(`
      UPDATE messages 
      SET is_deleted = 1, message = 'This message was deleted'
      WHERE id = ?
    `, [msgId]);

    await logAuditAction({
      userId: user.id,
      actionType: user.role === 'admin' && msg.sender_user_id !== user.id ? 'Message Moderated' : 'Message Deleted',
      entityType: 'message',
      entityId: msgId,
      oldValue: msg.message.slice(0, 50),
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to delete message: ' + errorMsg }, { status: 500 });
  }
}
