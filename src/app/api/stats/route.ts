import { NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth';
import { queryFirst, queryAll } from '@/lib/db';

export async function GET() {
  try {
    const ctx = await getTenantContext();
    if (!ctx || !ctx.activeOrg.is_admin) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }
    const { activeOrg } = ctx;

    // High level metrics scoped to activeOrg.id
    const totalEmployeesRow = await queryFirst<any>(
      "SELECT COUNT(*) as count FROM organisation_members WHERE organisation_id = ?",
      [activeOrg.id]
    );
    const totalEmployees = totalEmployeesRow?.count || 0;

    const activeEmployeesRow = await queryFirst<any>(
      `SELECT COUNT(*) as count 
       FROM organisation_members om 
       JOIN users u ON om.user_id = u.id 
       WHERE om.organisation_id = ? AND om.status = 'active' AND u.is_active = 1`,
      [activeOrg.id]
    );
    const activeEmployees = activeEmployeesRow?.count || 0;
    
    const totalTasksRow = await queryFirst<any>(
      'SELECT COUNT(*) as count FROM tasks WHERE organisation_id = ? AND is_archived = 0',
      [activeOrg.id]
    );
    const totalTasks = totalTasksRow?.count || 0;

    const notStartedTasksRow = await queryFirst<any>(
      "SELECT COUNT(*) as count FROM tasks WHERE organisation_id = ? AND is_archived = 0 AND status = 'Not Started'",
      [activeOrg.id]
    );
    const notStartedTasks = notStartedTasksRow?.count || 0;

    const startedTasksRow = await queryFirst<any>(
      "SELECT COUNT(*) as count FROM tasks WHERE organisation_id = ? AND is_archived = 0 AND status = 'Started'",
      [activeOrg.id]
    );
    const startedTasks = startedTasksRow?.count || 0;

    const halfwayTasksRow = await queryFirst<any>(
      "SELECT COUNT(*) as count FROM tasks WHERE organisation_id = ? AND is_archived = 0 AND status = 'Half-way'",
      [activeOrg.id]
    );
    const halfwayTasks = halfwayTasksRow?.count || 0;

    const completedTasksRow = await queryFirst<any>(
      "SELECT COUNT(*) as count FROM tasks WHERE organisation_id = ? AND is_archived = 0 AND status = 'Completed'",
      [activeOrg.id]
    );
    const completedTasks = completedTasksRow?.count || 0;

    const vUrgentTasksRow = await queryFirst<any>(
      "SELECT COUNT(*) as count FROM tasks WHERE organisation_id = ? AND is_archived = 0 AND priority = 'V. Urgent' AND status != 'Completed'",
      [activeOrg.id]
    );
    const vUrgentTasks = vUrgentTasksRow?.count || 0;

    const urgentTasksRow = await queryFirst<any>(
      "SELECT COUNT(*) as count FROM tasks WHERE organisation_id = ? AND is_archived = 0 AND priority = 'Urgent' AND status != 'Completed'",
      [activeOrg.id]
    );
    const urgentTasks = urgentTasksRow?.count || 0;

    // Team Workload breakdown strictly for activeOrg.id members
    const workload = await queryAll(`
      SELECT 
        u.id as employee_id,
        u.name as employee_name,
        u.email as employee_email,
        om.department,
        u.is_active,
        COUNT(CASE WHEN t.is_archived = 0 AND t.organisation_id = ? THEN t.id END) as total,
        COUNT(CASE WHEN t.is_archived = 0 AND t.status = 'Not Started' AND t.organisation_id = ? THEN t.id END) as not_started,
        COUNT(CASE WHEN t.is_archived = 0 AND t.status = 'Started' AND t.organisation_id = ? THEN t.id END) as started,
        COUNT(CASE WHEN t.is_archived = 0 AND t.status = 'Half-way' AND t.organisation_id = ? THEN t.id END) as halfway,
        COUNT(CASE WHEN t.is_archived = 0 AND t.status = 'Completed' AND t.organisation_id = ? THEN t.id END) as completed
      FROM organisation_members om
      JOIN users u ON om.user_id = u.id
      LEFT JOIN tasks t ON u.id = t.assigned_to AND t.organisation_id = ?
      WHERE om.organisation_id = ? AND om.status = 'active'
      GROUP BY u.id
      ORDER BY u.is_active DESC, total DESC, u.name ASC
    `, [activeOrg.id, activeOrg.id, activeOrg.id, activeOrg.id, activeOrg.id, activeOrg.id, activeOrg.id]);

    return NextResponse.json({
      overview: {
        totalEmployees,
        activeEmployees,
        totalTasks,
        notStartedTasks,
        startedTasks,
        halfwayTasks,
        completedTasks,
        vUrgentTasks,
        urgentTasks,
      },
      workload,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to fetch statistics: ' + errorMsg }, { status: 500 });
  }
}
