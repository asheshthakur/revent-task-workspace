import { NextResponse } from 'next/server';
import { getTenantContext, COOKIE_NAME, hashToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { queryAll, queryFirst, queryRun } from '@/lib/db';
import { USER_PRESENCE_STATUSES, UserPresenceStatus } from '@/lib/constants';

// Active threshold: 45 seconds (browser heartbeat sent every 20s)
const HEARTBEAT_TIMEOUT_SECONDS = 45;

export async function GET() {
  try {
    const ctx = await getTenantContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { user, activeOrg } = ctx;

    const timeoutLimitIso = new Date(Date.now() - HEARTBEAT_TIMEOUT_SECONDS * 1000).toISOString();

    // Query active members of the ACTIVE ORGANISATION with their actual valid sessions count
    const usersWithSessions = await queryAll<any>(`
      SELECT 
        u.id, 
        u.name, 
        u.email, 
        om.role as role, 
        om.department as department, 
        u.animal_emoji, 
        u.selected_status,
        COUNT(s.id) as active_sessions_count
      FROM organisation_members om
      JOIN users u ON om.user_id = u.id
      LEFT JOIN sessions s ON u.id = s.user_id 
        AND s.revoked_at IS NULL 
        AND s.expires_at > datetime('now')
        AND s.last_heartbeat_at >= ?
      WHERE om.organisation_id = ? AND om.status = 'active' AND u.is_active = 1
      GROUP BY u.id
      ORDER BY u.name ASC
    `, [timeoutLimitIso, activeOrg.id]);

    const activeUsers: any[] = [];
    const offlineUsers: any[] = [];

    for (const u of usersWithSessions) {
      const isActuallyConnected = Number(u.active_sessions_count) > 0;
      let effectiveStatus: UserPresenceStatus = 'Offline';

      if (isActuallyConnected) {
        if (u.selected_status === 'Offline') {
          effectiveStatus = 'Offline';
        } else {
          effectiveStatus = u.selected_status as UserPresenceStatus;
        }
      } else {
        effectiveStatus = 'Offline';
      }

      const userData = {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        department: u.department,
        animal_emoji: u.animal_emoji || '🦊',
        selected_status: u.selected_status,
        effective_status: effectiveStatus,
        is_online: isActuallyConnected && effectiveStatus !== 'Offline',
      };

      if (userData.is_online) {
        activeUsers.push(userData);
      } else {
        offlineUsers.push(userData);
      }
    }

    // Compute unread chat messages for current user across their conversations in THIS active organization
    let unreadChatCount = 0;
    try {
      const unreadRow = await queryFirst<{ total_unread: number }>(`
        SELECT COUNT(m.id) as total_unread
        FROM conversation_members cm
        JOIN conversations c ON cm.conversation_id = c.id
        JOIN messages m ON cm.conversation_id = m.conversation_id
        WHERE cm.user_id = ? 
          AND c.organisation_id = ?
          AND m.sender_user_id != ?
          AND m.is_deleted = 0
          AND m.created_at > cm.last_read_at
      `, [user.id, activeOrg.id, user.id]);
      unreadChatCount = Number(unreadRow?.total_unread || 0);
    } catch {
      // Table might not exist yet during migration
      unreadChatCount = 0;
    }

    return NextResponse.json({
      activeUsers,
      offlineUsers,
      currentUserId: user.id,
      unreadChatCount,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to fetch presence: ' + errorMsg }, { status: 500 });
  }
}

// POST endpoint: Heartbeat & Status change
export async function POST(req: Request) {
  try {
    const ctx = await getTenantContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { user } = ctx;

    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) {
      return NextResponse.json({ error: 'Missing token' }, { status: 401 });
    }

    const tokenHash = hashToken(token);
    const nowIso = new Date().toISOString();

    const body = await req.json().catch(() => ({}));

    // If changing user selected status (e.g. Online -> Away / DND / Holiday / Offline)
    if (body.selected_status) {
      if (USER_PRESENCE_STATUSES.includes(body.selected_status)) {
        await queryRun(
          'UPDATE users SET selected_status = ?, updated_at = ? WHERE id = ?',
          [body.selected_status, nowIso, user.id]
        );
      }
    }

    // Refresh heartbeat on the specific active session in the database
    await queryRun(
      `UPDATE sessions 
       SET last_heartbeat_at = ? 
       WHERE session_token_hash = ? AND revoked_at IS NULL`,
      [nowIso, tokenHash]
    );

    return NextResponse.json({ success: true, timestamp: nowIso });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: 'Heartbeat error: ' + errorMsg }, { status: 500 });
  }
}
