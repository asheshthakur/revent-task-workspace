import { NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth';
import { queryAll } from '@/lib/db';

export async function GET(req: Request) {
  try {
    const ctx = await getTenantContext();
    if (!ctx || !ctx.activeOrg.is_admin) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }
    const { activeOrg } = ctx;

    const { searchParams } = new URL(req.url);
    const actionType = searchParams.get('actionType') || '';
    const entityType = searchParams.get('entityType') || '';
    const search = searchParams.get('search') || '';

    let query = `
      SELECT 
        al.*,
        u.name as actor_name,
        u.email as actor_email,
        u.role as actor_role
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE al.organisation_id = ?
    `;
    const params: any[] = [activeOrg.id];

    if (actionType && actionType !== 'all') {
      query += ` AND al.action_type = ? `;
      params.push(actionType);
    }

    if (entityType && entityType !== 'all') {
      query += ` AND al.entity_type = ? `;
      params.push(entityType);
    }

    if (search) {
      query += ` AND (al.entity_title LIKE ? OR al.old_value LIKE ? OR al.new_value LIKE ? OR u.name LIKE ?) `;
      const pattern = `%${search}%`;
      params.push(pattern, pattern, pattern, pattern);
    }

    query += ` ORDER BY al.created_at DESC LIMIT 200 `;

    const logs = await queryAll(query, params);

    return NextResponse.json({ logs });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to fetch audit logs: ' + errorMsg }, { status: 500 });
  }
}
