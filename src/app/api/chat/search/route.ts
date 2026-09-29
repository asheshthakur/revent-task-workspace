import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { queryAll } from '@/lib/db';

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q');
    if (!query || !query.trim()) {
      return NextResponse.json({ results: [] });
    }

    const searchTerm = `%${query.trim().toLowerCase()}%`;

    // Only search within conversations current user is a verified member of
    const results = await queryAll<any>(`
      SELECT 
        m.id as message_id,
        m.message,
        m.created_at,
        m.is_deleted,
        c.id as conversation_id,
        c.type as conversation_type,
        c.name as conversation_name,
        c.avatar_emoji as conversation_avatar,
        c.task_id,
        t.task_name,
        u.id as sender_id,
        u.name as sender_name,
        u.animal_emoji as sender_animal_emoji
      FROM messages m
      JOIN conversations c ON m.conversation_id = c.id
      JOIN conversation_members cm ON c.id = cm.conversation_id AND cm.user_id = ?
      JOIN users u ON m.sender_user_id = u.id
      LEFT JOIN tasks t ON c.task_id = t.id
      WHERE m.is_deleted = 0 
        AND (LOWER(m.message) LIKE ? OR LOWER(u.name) LIKE ?)
      ORDER BY m.id DESC
      LIMIT 40
    `, [user.id, searchTerm, searchTerm]);

    return NextResponse.json({ results });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to search messages: ' + errorMsg }, { status: 500 });
  }
}
