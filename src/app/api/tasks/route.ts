import { NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth';
import { queryFirst, queryAll, queryRun, logAuditAction } from '@/lib/db';
import { PRIORITY_MAP, PRIORITIES, STATUSES } from '@/lib/constants';

export async function GET(req: Request) {
  try {
    const ctx = await getTenantContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { user, activeOrg } = ctx;

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const priority = searchParams.get('priority') || '';
    const assignedTo = searchParams.get('assignedTo') || searchParams.get('employeeId') || '';
    const assignedBy = searchParams.get('assignedBy') || '';
    const includeArchived = searchParams.get('includeArchived') === 'true';
    const mode = searchParams.get('mode') || ''; // 'active' | 'completed' | 'history'
    const view = searchParams.get('view') || ''; // 'assigned_by_me' or empty

    let query = `
      SELECT DISTINCT
        t.*,
        u_assigned.name as assigned_to_name,
        u_assigned.email as assigned_to_email,
        u_assigned.department as assigned_to_department,
        u_assigned.is_active as assigned_to_is_active,
        u_created.name as created_by_name,
        u_created.name as assigned_by_name,
        u_created.email as assigned_by_email,
        i.invoice_number,
        i.total_amount as invoice_total_amount,
        c.name as client_name
      FROM tasks t
      LEFT JOIN users u_assigned ON t.assigned_to = u_assigned.id
      LEFT JOIN users u_created ON t.created_by = u_created.id
      LEFT JOIN invoices i ON t.invoice_id = i.id
      LEFT JOIN clients c ON i.client_id = c.id
    `;

    const params: any[] = [];

    if (view === 'assigned_by_me') {
      // Query tasks assigned by the current user to anyone in the workspace
      query += ` WHERE t.organisation_id = ? AND t.created_by = ? `;
      params.push(activeOrg.id, user.id);

      if (assignedTo && assignedTo !== 'all') {
        query += ` AND t.assigned_to = ? `;
        params.push(parseInt(assignedTo, 10));
      }
    } else if (mode === 'history' && !activeOrg.is_admin) {
      // In history mode, include tasks currently assigned to the user OR previously assigned via task_assignment_history
      query += `
        LEFT JOIN task_assignment_history tah ON t.id = tah.task_id
        WHERE t.organisation_id = ? AND (t.assigned_to = ? OR tah.assigned_to_user_id = ?)
      `;
      params.push(activeOrg.id, user.id, user.id);
    } else if (mode === 'history' && activeOrg.is_admin && assignedTo && assignedTo !== 'all') {
      // Admin inspecting a specific employee's history
      const targetEmpId = parseInt(assignedTo, 10);
      query += `
        LEFT JOIN task_assignment_history tah ON t.id = tah.task_id
        WHERE t.organisation_id = ? AND (t.assigned_to = ? OR tah.assigned_to_user_id = ?)
      `;
      params.push(activeOrg.id, targetEmpId, targetEmpId);
    } else {
      query += ` WHERE t.organisation_id = ? `;
      params.push(activeOrg.id);

      // STRICT USER-LEVEL AUTHORIZATION
      if (!activeOrg.is_admin) {
        query += ` AND t.assigned_to = ? `;
        params.push(user.id);
      } else {
        if (assignedTo && assignedTo !== 'all') {
          query += ` AND t.assigned_to = ? `;
          params.push(parseInt(assignedTo, 10));
        }

        if (assignedBy && assignedBy !== 'all') {
          query += ` AND t.created_by = ? `;
          params.push(parseInt(assignedBy, 10));
        }
      }
    }

    // Filter by assignedBy for employees if provided in standard view
    if (view !== 'assigned_by_me' && !activeOrg.is_admin && assignedBy && assignedBy !== 'all') {
      query += ` AND t.created_by = ? `;
      params.push(parseInt(assignedBy, 10));
    }

    if (!includeArchived && mode !== 'history' && view !== 'assigned_by_me') {
      query += ` AND t.is_archived = 0 `;
    } else if (!includeArchived && view === 'assigned_by_me') {
      query += ` AND t.is_archived = 0 `;
    }

    if (mode === 'active') {
      query += ` AND t.status != 'Completed' AND t.is_archived = 0 `;
    } else if (mode === 'completed') {
      query += ` AND t.status = 'Completed' AND t.is_archived = 0 `;
    }

    if (status && status !== 'all') {
      query += ` AND t.status = ? `;
      params.push(status);
    }

    if (priority && priority !== 'all') {
      query += ` AND t.priority = ? `;
      params.push(priority);
    }

    if (search) {
      query += ` AND (t.task_name LIKE ? OR t.description LIKE ? OR t.notes LIKE ? OR u_assigned.name LIKE ? OR u_created.name LIKE ?) `;
      const pattern = `%${search}%`;
      params.push(pattern, pattern, pattern, pattern, pattern);
    }

    query += ` ORDER BY t.priority_rank ASC, (CASE WHEN t.due_date = '' THEN '9999-99-99' ELSE t.due_date END) ASC, t.created_at DESC`;

    const tasks = await queryAll(query, params);

    return NextResponse.json({ tasks });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to fetch tasks: ' + errorMsg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await getTenantContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized: Please log in to create tasks' }, { status: 401 });
    }
    const { user, activeOrg } = ctx;

    const {
      task_name,
      description,
      assigned_to,
      priority,
      status = 'Not Started',
      drive_link = '',
      due_date = '',
      notes = '',
      department = '',
      invoice_id = null,
    } = await req.json();

    if (!task_name || !assigned_to || !priority) {
      return NextResponse.json(
        { error: 'Task name, assigned employee, and priority are required' },
        { status: 400 }
      );
    }

    if (!PRIORITIES.includes(priority)) {
      return NextResponse.json(
        { error: `Invalid priority. Must be one of: ${PRIORITIES.join(', ')}` },
        { status: 400 }
      );
    }

    if (status && !STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${STATUSES.join(', ')}` },
        { status: 400 }
      );
    }

    // Verify assigned user is an active member of this organization
    const assignedMember = await queryFirst<any>(
      `SELECT u.id, u.name, u.is_active 
       FROM organisation_members om
       JOIN users u ON om.user_id = u.id
       WHERE om.organisation_id = ? AND om.user_id = ? AND om.status = 'active'`,
      [activeOrg.id, assigned_to]
    );

    if (!assignedMember) {
      return NextResponse.json({ error: 'Assigned employee does not belong to this organization' }, { status: 400 });
    }

    if (assignedMember.is_active !== 1) {
      return NextResponse.json(
        { error: `Cannot assign task to ${assignedMember.name} because their account is inactive.` },
        { status: 400 }
      );
    }

    if (drive_link && drive_link.trim()) {
      try {
        const parsed = new URL(drive_link.trim());
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
          return NextResponse.json({ error: 'Work link must start with http:// or https://' }, { status: 400 });
        }
      } catch {
        return NextResponse.json({ error: 'Please enter a valid URL for the Drive / Work link' }, { status: 400 });
      }
    }

    const priorityRank = PRIORITY_MAP[priority] || 99;
    const now = new Date().toISOString();
    const completedAt = status === 'Completed' ? now : null;
    const parsedInvoiceId = invoice_id ? parseInt(invoice_id, 10) : null;

    const result = await queryRun(
      `INSERT INTO tasks (
        organisation_id, task_name, description, assigned_to, created_by, priority, priority_rank,
        status, drive_link, due_date, notes, department, is_archived, created_at, updated_at, completed_at, invoice_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)`,
      [
        activeOrg.id,
        task_name.trim(),
        description ? description.trim() : '',
        assignedMember.id,
        user.id,
        priority,
        priorityRank,
        status,
        drive_link ? drive_link.trim() : '',
        due_date || '',
        notes ? notes.trim() : '',
        department || '',
        now,
        now,
        completedAt,
        parsedInvoiceId,
      ]
    );

    const newTaskId = Number(result.lastInsertRowid);

    // Record initial assignment history
    await queryRun(
      `INSERT INTO task_assignment_history (organisation_id, task_id, assigned_by_user_id, assigned_to_user_id, assigned_at, notes)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [activeOrg.id, newTaskId, user.id, assignedMember.id, now, 'Initial Task Assignment']
    );

    // Record initial status history
    await queryRun(
      `INSERT INTO task_status_history (organisation_id, task_id, changed_by_user_id, old_status, new_status, changed_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [activeOrg.id, newTaskId, user.id, 'None', status, now]
    );

    // Log Central Audit
    await logAuditAction({
      organisationId: activeOrg.id,
      userId: user.id,
      actionType: 'Task Created',
      entityType: 'Task',
      entityId: newTaskId,
      entityTitle: task_name.trim(),
      oldValue: '',
      newValue: `Assigned to ${assignedMember.name} with priority ${priority}`,
    });

    const createdTask = await queryFirst<any>(`
      SELECT 
        t.*, 
        u_assigned.name as assigned_to_name, 
        u_created.name as created_by_name,
        u_created.name as assigned_by_name
      FROM tasks t
      LEFT JOIN users u_assigned ON t.assigned_to = u_assigned.id
      LEFT JOIN users u_created ON t.created_by = u_created.id
      WHERE t.id = ?
    `, [newTaskId]);

    return NextResponse.json({ success: true, task: createdTask });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to create task: ' + errorMsg }, { status: 500 });
  }
}
