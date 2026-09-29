import { NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth';
import { queryAll, logAuditAction } from '@/lib/db';

function convertToCsv(items: any[]): string {
  if (!items || items.length === 0) return '';
  const headers = Object.keys(items[0]);
  const headerRow = headers.join(',');
  const rows = items.map((item) => {
    return headers
      .map((header) => {
        let val = item[header];
        if (val === null || val === undefined) return '""';
        if (typeof val === 'object') val = JSON.stringify(val);
        const escaped = String(val).replace(/"/g, '""');
        return `"${escaped}"`;
      })
      .join(',');
  });
  return [headerRow, ...rows].join('\n');
}

export async function GET(req: Request) {
  try {
    const ctx = await getTenantContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!ctx.activeOrg.is_admin) {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required to export organizational data' },
        { status: 403 }
      );
    }
    const { user, activeOrg } = ctx;

    const { searchParams } = new URL(req.url);
    const format = searchParams.get('format') || 'json';
    const type = searchParams.get('type') || 'all';

    const employees = await queryAll(`
      SELECT u.id, u.name, u.email, om.role, om.department, u.animal_emoji, u.selected_status, u.is_active, u.last_login_at, om.joined_at as created_at
      FROM organisation_members om
      JOIN users u ON om.user_id = u.id
      WHERE om.organisation_id = ?
      ORDER BY u.id ASC
    `, [activeOrg.id]);

    const tasks = await queryAll(`
      SELECT 
        t.id, 
        t.task_name, 
        t.description, 
        t.priority, 
        t.priority_rank, 
        t.status, 
        t.drive_link, 
        t.due_date, 
        t.notes, 
        t.department, 
        t.is_archived, 
        t.created_at, 
        t.updated_at, 
        t.completed_at,
        u_assigned.name as assigned_to_name,
        u_assigned.email as assigned_to_email,
        u_created.name as assigned_by_name,
        u_created.email as assigned_by_email
      FROM tasks t
      LEFT JOIN users u_assigned ON t.assigned_to = u_assigned.id
      LEFT JOIN users u_created ON t.created_by = u_created.id
      WHERE t.organisation_id = ?
      ORDER BY t.id ASC
    `, [activeOrg.id]);

    const assignmentHistory = await queryAll(`
      SELECT 
        h.id, 
        h.task_id, 
        t.task_name,
        u_by.name as assigned_by_name, 
        u_by.email as assigned_by_email,
        u_to.name as assigned_to_name,
        u_to.email as assigned_to_email,
        h.assigned_at, 
        h.notes
      FROM task_assignment_history h
      LEFT JOIN tasks t ON h.task_id = t.id
      LEFT JOIN users u_by ON h.assigned_by_user_id = u_by.id
      LEFT JOIN users u_to ON h.assigned_to_user_id = u_to.id
      WHERE h.organisation_id = ?
      ORDER BY h.id ASC
    `, [activeOrg.id]);

    const statusHistory = await queryAll(`
      SELECT 
        s.id, 
        s.task_id, 
        t.task_name,
        u.name as changed_by_name, 
        u.email as changed_by_email,
        s.old_status, 
        s.new_status, 
        s.changed_at
      FROM task_status_history s
      LEFT JOIN tasks t ON s.task_id = t.id
      LEFT JOIN users u ON s.changed_by_user_id = u.id
      WHERE s.organisation_id = ?
      ORDER BY s.id ASC
    `, [activeOrg.id]);

    const auditLogs = await queryAll(`
      SELECT 
        al.id, 
        u.name as actor_name, 
        u.email as actor_email, 
        al.action_type, 
        al.entity_type, 
        al.entity_id, 
        al.entity_title, 
        al.old_value, 
        al.new_value, 
        al.created_at
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE al.organisation_id = ?
      ORDER BY al.id ASC
    `, [activeOrg.id]);

    await logAuditAction({
      organisationId: activeOrg.id,
      userId: user.id,
      actionType: 'Data Exported',
      entityType: 'System',
      entityTitle: `Format: ${format.toUpperCase()}, Type: ${type}`,
      newValue: `Exported at ${new Date().toISOString()}`,
    });

    if (format === 'csv') {
      let targetData: any[] = [];
      let filename = `${activeOrg.slug}-export`;

      switch (type) {
        case 'employees':
          targetData = employees;
          filename = `${activeOrg.slug}-employees`;
          break;
        case 'tasks':
          targetData = tasks;
          filename = `${activeOrg.slug}-tasks`;
          break;
        case 'assignments':
          targetData = assignmentHistory;
          filename = `${activeOrg.slug}-assignment-history`;
          break;
        case 'status_history':
          targetData = statusHistory;
          filename = `${activeOrg.slug}-status-history`;
          break;
        case 'audit_logs':
          targetData = auditLogs;
          filename = `${activeOrg.slug}-audit-logs`;
          break;
        default:
          targetData = tasks;
          filename = `${activeOrg.slug}-tasks-full`;
          break;
      }

      const csvContent = convertToCsv(targetData);
      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}-${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      });
    }

    const exportBundle = {
      version: '1.0',
      exported_at: new Date().toISOString(),
      exported_by: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      counts: {
        employees: employees.length,
        tasks: tasks.length,
        assignment_history_records: assignmentHistory.length,
        status_history_records: statusHistory.length,
        audit_log_records: auditLogs.length,
      },
      data: {
        employees,
        tasks,
        task_assignment_history: assignmentHistory,
        task_status_history: statusHistory,
        audit_logs: auditLogs,
      },
    };

    return new NextResponse(JSON.stringify(exportBundle, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="${activeOrg.slug}-backup-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: 'Export failed: ' + errorMsg }, { status: 500 });
  }
}
