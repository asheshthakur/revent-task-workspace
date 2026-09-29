import { NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth';
import { queryFirst, queryAll } from '@/lib/db';
import { PRIORITIES } from '@/lib/constants';

export async function GET(req: Request) {
  try {
    const ctx = await getTenantContext();
    if (!ctx || !ctx.activeOrg.is_admin) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }
    const { activeOrg } = ctx;

    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get('employeeId');
    const period = searchParams.get('period') || 'month';
    const fromDate = searchParams.get('fromDate') || '';
    const toDate = searchParams.get('toDate') || '';

    if (!employeeId) {
      return NextResponse.json({ error: 'employeeId is required' }, { status: 400 });
    }

    const empId = parseInt(employeeId, 10);
    // Verify employee belongs to active organization
    const employee = await queryFirst<any>(
      `SELECT u.id, u.name, u.email, om.department, om.role, u.is_active, om.joined_at as created_at 
       FROM organisation_members om
       JOIN users u ON om.user_id = u.id
       WHERE om.organisation_id = ? AND om.user_id = ?`,
      [activeOrg.id, empId]
    );
    if (!employee) {
      return NextResponse.json({ error: 'Employee not found in this organization' }, { status: 404 });
    }

    const now = new Date();
    let startDateStr = '';
    let endDateStr = '';

    if (period === 'day') {
      const d = new Date(now);
      d.setHours(0, 0, 0, 0);
      startDateStr = d.toISOString();
      const endD = new Date(now);
      endD.setHours(23, 59, 59, 999);
      endDateStr = endD.toISOString();
    } else if (period === 'week') {
      const d = new Date(now);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      d.setDate(diff);
      d.setHours(0, 0, 0, 0);
      startDateStr = d.toISOString();
      const endD = new Date(d);
      endD.setDate(d.getDate() + 6);
      endD.setHours(23, 59, 59, 999);
      endDateStr = endD.toISOString();
    } else if (period === 'month') {
      const d = new Date(now.getFullYear(), now.getMonth(), 1);
      d.setHours(0, 0, 0, 0);
      startDateStr = d.toISOString();
      const endD = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      endD.setHours(23, 59, 59, 999);
      endDateStr = endD.toISOString();
    } else if (period === 'year') {
      const d = new Date(now.getFullYear(), 0, 1);
      d.setHours(0, 0, 0, 0);
      startDateStr = d.toISOString();
      const endD = new Date(now.getFullYear(), 11, 31);
      endD.setHours(23, 59, 59, 999);
      endDateStr = endD.toISOString();
    } else if (period === 'custom') {
      if (fromDate) {
        const d = new Date(fromDate);
        d.setHours(0, 0, 0, 0);
        startDateStr = d.toISOString();
      }
      if (toDate) {
        const endD = new Date(toDate);
        endD.setHours(23, 59, 59, 999);
        endDateStr = endD.toISOString();
      }
    }

    let taskDateFilter = '';
    const filterParams: any[] = [activeOrg.id, empId];

    if (startDateStr && endDateStr) {
      taskDateFilter = ` AND (t.created_at BETWEEN ? AND ? OR t.completed_at BETWEEN ? AND ? OR (t.created_at <= ? AND (t.completed_at IS NULL OR t.completed_at >= ?))) `;
      filterParams.push(startDateStr, endDateStr, startDateStr, endDateStr, endDateStr, startDateStr);
    } else if (startDateStr) {
      taskDateFilter = ` AND (t.created_at >= ? OR t.completed_at >= ?) `;
      filterParams.push(startDateStr, startDateStr);
    }

    const tasks = await queryAll<any>(`
      SELECT 
        t.*,
        u_by.name as assigned_by_name,
        u_by.email as assigned_by_email
      FROM tasks t
      LEFT JOIN users u_by ON t.created_by = u_by.id
      WHERE t.organisation_id = ? AND t.assigned_to = ? AND t.is_archived = 0 ${taskDateFilter}
      ORDER BY t.priority_rank ASC, t.created_at DESC
    `, filterParams);

    const totalAssigned = tasks.length;
    const completedTasks = tasks.filter((t) => t.status === 'Completed').length;
    const startedTasks = tasks.filter((t) => t.status === 'Started').length;
    const halfwayTasks = tasks.filter((t) => t.status === 'Half-way').length;
    const notStartedTasks = tasks.filter((t) => t.status === 'Not Started').length;
    const pendingWork = totalAssigned - completedTasks;

    const completionRate = totalAssigned > 0 ? Math.round((completedTasks / totalAssigned) * 1000) / 10 : 0;

    const todayStr = new Date().toISOString().split('T')[0];
    const overdueTasks = tasks.filter((t) => t.status !== 'Completed' && t.due_date && t.due_date < todayStr).length;

    const priorityCounts: Record<string, number> = {};
    for (const p of PRIORITIES) {
      priorityCounts[p] = tasks.filter((t) => t.priority === p).length;
    }

    const statusCounts: Record<string, number> = {
      'Not Started': notStartedTasks,
      'Started': startedTasks,
      'Half-way': halfwayTasks,
      'Completed': completedTasks,
    };

    let trendData: any[] = [];

    if (period === 'day') {
      trendData = [
        { label: 'Today', assigned: totalAssigned, completed: completedTasks, pending: pendingWork }
      ];
    } else if (period === 'week') {
      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      trendData = days.map((dayName, idx) => {
        const dayAssigned = tasks.filter((t) => {
          const d = new Date(t.created_at);
          const dayIndex = (d.getDay() + 6) % 7;
          return dayIndex === idx;
        }).length;

        const dayCompleted = tasks.filter((t) => {
          if (!t.completed_at) return false;
          const d = new Date(t.completed_at);
          const dayIndex = (d.getDay() + 6) % 7;
          return dayIndex === idx;
        }).length;

        return {
          day: dayName,
          assigned: dayAssigned,
          completed: dayCompleted,
          pending: Math.max(0, dayAssigned - dayCompleted),
        };
      });
    } else if (period === 'year') {
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      trendData = monthNames.map((mName, mIdx) => {
        const mAssigned = tasks.filter((t) => new Date(t.created_at).getMonth() === mIdx).length;
        const mCompleted = tasks.filter((t) => t.completed_at && new Date(t.completed_at).getMonth() === mIdx).length;
        const mRate = mAssigned > 0 ? Math.round((mCompleted / mAssigned) * 1000) / 10 : 0;
        return {
          month: mName,
          assigned: mAssigned,
          completed: mCompleted,
          pending: Math.max(0, mAssigned - mCompleted),
          completionRate: mRate,
        };
      });
    } else {
      trendData = [
        { label: 'Week 1', assigned: Math.ceil(totalAssigned * 0.25), completed: Math.ceil(completedTasks * 0.25) },
        { label: 'Week 2', assigned: Math.ceil(totalAssigned * 0.25), completed: Math.ceil(completedTasks * 0.25) },
        { label: 'Week 3', assigned: Math.ceil(totalAssigned * 0.25), completed: Math.ceil(completedTasks * 0.25) },
        { label: 'Week 4', assigned: Math.max(0, totalAssigned - Math.ceil(totalAssigned * 0.75)), completed: Math.max(0, completedTasks - Math.ceil(completedTasks * 0.75)) },
      ];
    }

    return NextResponse.json({
      employee,
      period,
      periodRange: { start: startDateStr, end: endDateStr },
      metrics: {
        totalAssigned,
        completedTasks,
        startedTasks,
        halfwayTasks,
        notStartedTasks,
        pendingWork,
        completionRate,
        overdueTasks,
      },
      priorityCounts,
      statusCounts,
      trendData,
      tasks,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to calculate employee analytics: ' + errorMsg }, { status: 500 });
  }
}
