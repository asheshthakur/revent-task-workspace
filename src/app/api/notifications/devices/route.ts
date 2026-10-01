import { NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth';
import { queryAll, queryRun } from '@/lib/db';

export async function GET() {
  try {
    const ctx = await getTenantContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { user } = ctx;

    const devices = await queryAll<any>(`
      SELECT id, device_id, device_name, platform, app_version, created_at, last_active_at
      FROM desktop_devices
      WHERE user_id = ?
      ORDER BY last_active_at DESC
    `, [user.id]);

    const webSubscriptions = await queryAll<any>(`
      SELECT id, endpoint, user_agent, created_at, last_used_at
      FROM web_push_subscriptions
      WHERE user_id = ?
      ORDER BY last_used_at DESC
    `, [user.id]);

    return NextResponse.json({ devices, webSubscriptions });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to fetch devices: ' + errorMsg }, { status: 500 });
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
    const { deviceId, deviceName, platform, appVersion } = body;

    if (!deviceId || !deviceName) {
      return NextResponse.json({ error: 'Device ID and name are required' }, { status: 400 });
    }

    const now = new Date().toISOString();

    await queryRun(`
      INSERT INTO desktop_devices (user_id, device_id, device_name, platform, app_version, created_at, last_active_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(device_id) DO UPDATE SET
        device_name = excluded.device_name,
        platform = excluded.platform,
        app_version = excluded.app_version,
        last_active_at = excluded.last_active_at
    `, [user.id, deviceId, deviceName, platform || 'unknown', appVersion || '1.0.0', now, now]);

    return NextResponse.json({ success: true, message: 'Desktop device registered successfully' });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to register device: ' + errorMsg }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const ctx = await getTenantContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { user } = ctx;

    const { searchParams } = new URL(req.url);
    const deviceId = searchParams.get('deviceId');

    if (!deviceId) {
      return NextResponse.json({ error: 'Device ID is required' }, { status: 400 });
    }

    await queryRun(`
      DELETE FROM desktop_devices WHERE device_id = ? AND user_id = ?
    `, [deviceId, user.id]);

    return NextResponse.json({ success: true, message: 'Device deregistered' });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to delete device: ' + errorMsg }, { status: 500 });
  }
}
