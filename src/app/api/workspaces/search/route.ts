import { NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth';
import { queryAll } from '@/lib/db';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get('q') || '').trim().toLowerCase();

    if (!q || q.length < 2) {
      return NextResponse.json({ workspaces: [] });
    }

    // Return ONLY public safe metadata (name, slug, logo). Never leak tasks, emails, members, or financial data.
    const workspaces = await queryAll<any>(
      `SELECT id, name, slug, logo
       FROM organisations
       WHERE is_active = 1 AND (LOWER(name) LIKE ? OR LOWER(slug) LIKE ?)
       LIMIT 10`,
      [`%${q}%`, `%${q}%`]
    );

    return NextResponse.json({ workspaces });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to search workspaces: ' + errorMsg }, { status: 500 });
  }
}
