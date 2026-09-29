import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getTenantContext } from '@/lib/auth';
import { queryFirst, queryAll, queryRun, logAuditAction } from '@/lib/db';

export async function GET(req: Request) {
  try {
    const ctx = await getTenantContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { user, activeOrg } = ctx;

    const { searchParams } = new URL(req.url);
    const activeOnly = searchParams.get('active') === 'true';

    let query = `
      SELECT 
        u.id, 
        u.name, 
        u.email, 
        om.role as role, 
        om.department as department, 
        u.animal_emoji,
        u.selected_status,
        u.is_active, 
        om.joined_at as created_at,
        COUNT(CASE WHEN t.is_archived = 0 AND t.organisation_id = ? THEN t.id END) as total_tasks,
        COUNT(CASE WHEN t.status = 'Not Started' AND t.is_archived = 0 AND t.organisation_id = ? THEN t.id END) as not_started_tasks,
        COUNT(CASE WHEN t.status = 'Started' AND t.is_archived = 0 AND t.organisation_id = ? THEN t.id END) as started_tasks,
        COUNT(CASE WHEN t.status = 'Half-way' AND t.is_archived = 0 AND t.organisation_id = ? THEN t.id END) as halfway_tasks,
        COUNT(CASE WHEN t.status = 'Completed' AND t.is_archived = 0 AND t.organisation_id = ? THEN t.id END) as completed_tasks
      FROM organisation_members om
      JOIN users u ON om.user_id = u.id
      LEFT JOIN tasks t ON u.id = t.assigned_to AND t.organisation_id = ?
      WHERE om.organisation_id = ? AND om.status = 'active'
    `;
    const params: any[] = [activeOrg.id, activeOrg.id, activeOrg.id, activeOrg.id, activeOrg.id, activeOrg.id, activeOrg.id];

    if (activeOnly) {
      query += ` AND u.is_active = 1 `;
    }

    query += ` GROUP BY u.id ORDER BY u.is_active DESC, u.name ASC`;

    const employees = await queryAll<any>(query, params);

    if (!activeOrg.is_admin) {
      const simplified = employees.map((e: any) => ({
        id: e.id,
        name: e.name,
        email: e.email,
        role: e.role,
        department: e.department,
        animal_emoji: e.animal_emoji,
        selected_status: e.selected_status,
        is_active: e.is_active,
      }));
      return NextResponse.json({ employees: simplified });
    }

    return NextResponse.json({ employees });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to fetch employees: ' + errorMsg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await getTenantContext();
    if (!ctx || !ctx.activeOrg.is_admin) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }
    const { user: currentUser, activeOrg } = ctx;

    const { name, email, password, department, role } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Full name, email, and password are required' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const now = new Date().toISOString();

    // Check if user already exists globally
    let targetUser = await queryFirst<any>('SELECT id, name, is_active FROM users WHERE LOWER(email) = ?', [cleanEmail]);

    if (!targetUser) {
      const passwordHash = bcrypt.hashSync(password, 10);
      const userResult = await queryRun(
        `INSERT INTO users (name, email, password_hash, role, department, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 1, ?, ?)`,
        [
          name.trim(),
          cleanEmail,
          passwordHash,
          role === 'admin' ? 'admin' : 'employee',
          department ? department.trim() : '',
          now,
          now,
        ]
      );
      targetUser = { id: Number(userResult.lastInsertRowid), name: name.trim(), is_active: 1 };
    }

    // Check if user is already a member of this organisation
    const existingMember = await queryFirst<any>(
      'SELECT id FROM organisation_members WHERE organisation_id = ? AND user_id = ?',
      [activeOrg.id, targetUser.id]
    );

    if (existingMember) {
      return NextResponse.json({ error: 'This user is already a member of this workspace' }, { status: 409 });
    }

    // Add to organisation_members
    await queryRun(
      `INSERT INTO organisation_members (organisation_id, user_id, role, status, department, joined_at, created_at)
       VALUES (?, ?, ?, 'active', ?, ?, ?)`,
      [
        activeOrg.id,
        targetUser.id,
        role === 'admin' ? 'admin' : 'member',
        department ? department.trim() : '',
        now,
        now,
      ]
    );

    await logAuditAction({
      organisationId: activeOrg.id,
      userId: currentUser.id,
      actionType: 'Employee Added',
      entityType: 'User',
      entityId: targetUser.id,
      entityTitle: name.trim(),
      newValue: `Added to ${activeOrg.name} with role: ${role || 'member'}`,
    });

    return NextResponse.json({
      success: true,
      employee: {
        id: targetUser.id,
        name: name.trim(),
        email: cleanEmail,
        role: role === 'admin' ? 'admin' : 'member',
        department: department || '',
        is_active: 1,
      },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to create employee: ' + errorMsg }, { status: 500 });
  }
}
