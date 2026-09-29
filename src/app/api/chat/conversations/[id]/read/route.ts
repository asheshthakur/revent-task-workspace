import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { queryFirst, queryRun } from '@/lib/db';

interface Context {
  params: Promise<{ id: string }>;
}

export async function POST(req: Request, context: Context) {
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

    const now = new Date().toISOString();

    await queryRun(`
      UPDATE conversation_members 
      SET last_read_at = ?
      WHERE conversation_id = ? AND user_id = ?
    `, [now, convId, user.id]);

    return NextResponse.json({ success: true, last_read_at: now });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to mark as read: ' + errorMsg }, { status: 500 });
  }
}
