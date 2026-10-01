import { NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth';
import { getUserNotificationPreferences } from '@/lib/notifications';
import { queryRun } from '@/lib/db';

export async function POST() {
  try {
    const ctx = await getTenantContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { user, activeOrg } = ctx;

    const prefs = await getUserNotificationPreferences(user.id);
    const now = new Date().toISOString();

    // If in-app enabled, create temporary test notification
    if (prefs.in_app_enabled && prefs.master_enabled) {
      await queryRun(`
        INSERT INTO notification_events
        (organisation_id, recipient_user_id, actor_user_id, type, title, body, target_url, entity_type, entity_id, is_read, created_at)
        VALUES (?, ?, ?, 'test', 'Test Notification', 'Revent notifications are working perfectly.', '/settings', 'test', 0, 0, ?)
      `, [activeOrg.id, user.id, user.id, now]);
    }

    return NextResponse.json({
      success: true,
      message: 'Test notification sent successfully',
      channels: {
        inApp: Boolean(prefs.in_app_enabled && prefs.master_enabled),
        browser: Boolean(prefs.browser_enabled && prefs.master_enabled),
        desktop: Boolean(prefs.desktop_enabled && prefs.master_enabled),
      },
      notification: {
        title: 'Revent Task Workspace',
        body: 'Notifications are working properly.',
        targetUrl: '/settings',
      },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to send test notification: ' + errorMsg }, { status: 500 });
  }
}
