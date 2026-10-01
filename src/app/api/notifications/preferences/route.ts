import { NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth';
import { queryRun } from '@/lib/db';
import { getUserNotificationPreferences } from '@/lib/notifications';

export async function GET() {
  try {
    const ctx = await getTenantContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { user } = ctx;

    const preferences = await getUserNotificationPreferences(user.id);
    return NextResponse.json({ preferences });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to fetch preferences: ' + errorMsg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await getTenantContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { user } = ctx;

    const body = await req.json();
    const now = new Date().toISOString();

    const allowedFields = [
      'master_enabled',
      'in_app_enabled',
      'browser_enabled',
      'desktop_enabled',
      'tasks_enabled',
      'task_assignments',
      'task_status_changes',
      'task_deadlines',
      'task_discussions',
      'chat_messages',
      'finance_enabled',
      'mentions_enabled',
    ];

    // Ensure row exists
    await getUserNotificationPreferences(user.id);

    const updates: string[] = [];
    const values: any[] = [];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates.push(`${field} = ?`);
        values.push(body[field] ? 1 : 0);
      }
    }

    if (updates.length > 0) {
      updates.push('updated_at = ?');
      values.push(now);
      values.push(user.id);

      await queryRun(
        `UPDATE notification_preferences SET ${updates.join(', ')} WHERE user_id = ?`,
        values
      );
    }

    const updated = await getUserNotificationPreferences(user.id);
    return NextResponse.json({ success: true, preferences: updated });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to update preferences: ' + errorMsg }, { status: 500 });
  }
}
