import { NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth';
import { queryAll, queryFirst, queryRun } from '@/lib/db';

export async function GET(req: Request) {
  try {
    const ctx = await getTenantContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { user, activeOrg } = ctx;

    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50);

    const notifications = await queryAll<any>(`
      SELECT 
        ne.*,
        u_actor.name as actor_name,
        u_actor.animal_emoji as actor_animal_emoji
      FROM notification_events ne
      LEFT JOIN users u_actor ON ne.actor_user_id = u_actor.id
      WHERE ne.recipient_user_id = ? AND ne.organisation_id = ?
      ORDER BY ne.created_at DESC
      LIMIT ?
    `, [user.id, activeOrg.id, limit]);

    const unreadCountRow = await queryFirst<{ count: number }>(`
      SELECT COUNT(id) as count
      FROM notification_events
      WHERE recipient_user_id = ? AND organisation_id = ? AND is_read = 0
    `, [user.id, activeOrg.id]);

    return NextResponse.json({
      notifications,
      unreadCount: unreadCountRow?.count || 0,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to fetch notifications: ' + errorMsg }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const ctx = await getTenantContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { user, activeOrg } = ctx;

    const body = await req.json();
    const { notificationId, markAllAsRead } = body;
    const now = new Date().toISOString();

    if (markAllAsRead) {
      await queryRun(`
        UPDATE notification_events
        SET is_read = 1, read_at = ?
        WHERE recipient_user_id = ? AND organisation_id = ? AND is_read = 0
      `, [now, user.id, activeOrg.id]);

      return NextResponse.json({ success: true, message: 'All notifications marked as read' });
    }

    if (notificationId) {
      await queryRun(`
        UPDATE notification_events
        SET is_read = 1, read_at = ?
        WHERE id = ? AND recipient_user_id = ? AND organisation_id = ?
      `, [now, notificationId, user.id, activeOrg.id]);

      return NextResponse.json({ success: true, message: 'Notification marked as read' });
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to update notification: ' + errorMsg }, { status: 500 });
  }
}
