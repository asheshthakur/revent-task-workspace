import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { queryAll } from '@/lib/db';

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') || 'month';
    const fromDate = searchParams.get('fromDate') || '';
    const toDate = searchParams.get('toDate') || '';

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

    let dateWhereClause = '';
    const dateParams: any[] = [];
    if (startDateStr && endDateStr) {
      dateWhereClause = ` AND (t.created_at BETWEEN ? AND ? OR t.completed_at BETWEEN ? AND ?) `;
      dateParams.push(startDateStr, endDateStr, startDateStr, endDateStr);
    }

    // Combine parameters: dateWhereClause appears 3 times in the SELECT sub-expressions
    const allParams = [...dateParams, ...dateParams, ...dateParams];

    const teamPerformance = await queryAll<any>(`
      SELECT 
        u.id as employee_id,
        u.name as employee_name,
        u.email as employee_email,
        u.department,
        u.is_active,
        COUNT(CASE WHEN t.is_archived = 0 ${dateWhereClause} THEN t.id END) as assigned,
        COUNT(CASE WHEN t.is_archived = 0 AND t.status = 'Completed' ${dateWhereClause} THEN t.id END) as completed,
        COUNT(CASE WHEN t.is_archived = 0 AND t.status != 'Completed' ${dateWhereClause} THEN t.id END) as pending
      FROM users u
      LEFT JOIN tasks t ON u.id = t.assigned_to
      WHERE u.role = 'employee'
      GROUP BY u.id
      ORDER BY assigned DESC, u.name ASC
    `, allParams);

    // Calculate completion rate per employee
    const enriched = teamPerformance.map((emp) => {
      const assigned = Number(emp.assigned);
      const completed = Number(emp.completed);
      const rate = assigned > 0 ? Math.round((completed / assigned) * 1000) / 10 : 0;
      return {
        ...emp,
        completion_rate: rate,
      };
    });

    return NextResponse.json({
      period,
      periodRange: { start: startDateStr, end: endDateStr },
      teamPerformance: enriched,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to fetch organization analytics: ' + errorMsg }, { status: 500 });
  }
}
