import { NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth';
import { queryFirst, queryAll } from '@/lib/db';
import { computeInvoiceStatus } from '@/lib/finance-db';

export async function GET(req: Request) {
  try {
    const ctx = await getTenantContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { activeOrg } = ctx;

    const invoices = await queryAll<any>(`
      SELECT 
        i.*,
        c.name as client_name,
        u.name as account_owner_name,
        COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.invoice_id = i.id), 0) as paid_amount
      FROM invoices i
      LEFT JOIN clients c ON i.client_id = c.id
      LEFT JOIN users u ON i.account_owner_id = u.id
      WHERE i.organisation_id = ?
      ORDER BY i.created_at DESC
    `, [activeOrg.id]);

    let totalInvoiceValue = 0;
    let totalPaid = 0;
    let totalOutstanding = 0;
    let overdueCount = 0;
    let overdueValue = 0;

    const enrichedInvoices = invoices.map((inv) => {
      const paid = Number(inv.paid_amount) || 0;
      const total = Number(inv.total_amount) || 0;
      const outstanding = Math.max(0, total - paid);
      const computedStatus = computeInvoiceStatus(inv.due_date, total, paid, inv.payment_status);

      if (computedStatus !== 'Cancelled') {
        totalInvoiceValue += total;
        totalPaid += paid;
        totalOutstanding += outstanding;
        if (computedStatus === 'Overdue') {
          overdueCount++;
          overdueValue += outstanding;
        }
      }

      return {
        ...inv,
        paid_amount: paid,
        outstanding_amount: outstanding,
        effective_status: computedStatus,
      };
    });

    const pdcs = await queryAll<any>(`
      SELECT 
        p.*,
        c.name as client_name,
        i.invoice_number
      FROM pdc_records p
      LEFT JOIN clients c ON p.client_id = c.id
      LEFT JOIN invoices i ON p.invoice_id = i.id
      WHERE p.organisation_id = ?
      ORDER BY p.cheque_date ASC
    `, [activeOrg.id]);

    const todayStr = new Date().toISOString().split('T')[0];
    const sevenDaysFromNow = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

    let pdcsReceived = 0;
    let pdcsPending = 0;
    let pdcsDueSoon = 0;
    let pdcsCleared = 0;
    let pdcsBounced = 0;

    pdcs.forEach((pdc) => {
      if (pdc.status === 'Received') pdcsReceived++;
      else if (pdc.status === 'Pending') pdcsPending++;
      else if (pdc.status === 'Cleared') pdcsCleared++;
      else if (pdc.status === 'Bounced') pdcsBounced++;

      if (pdc.status !== 'Cleared' && pdc.status !== 'Cancelled') {
        if (pdc.cheque_date >= todayStr && pdc.cheque_date <= sevenDaysFromNow) {
          pdcsDueSoon++;
        }
      }
    });

    const payments = await queryAll<any>(`
      SELECT 
        p.*,
        c.name as client_name,
        i.invoice_number,
        u.name as recorded_by_name
      FROM payments p
      LEFT JOIN clients c ON p.client_id = c.id
      LEFT JOIN invoices i ON p.invoice_id = i.id
      LEFT JOIN users u ON p.recorded_by = u.id
      WHERE p.organisation_id = ?
      ORDER BY p.payment_date DESC, p.created_at DESC
      LIMIT 10
    `, [activeOrg.id]);

    const upcomingInvoices = enrichedInvoices
      .filter((inv) => inv.outstanding_amount > 0 && inv.effective_status !== 'Cancelled')
      .sort((a, b) => (a.due_date > b.due_date ? 1 : -1))
      .slice(0, 8);

    const upcomingPdcs = pdcs
      .filter((p) => p.status !== 'Cleared' && p.status !== 'Cancelled')
      .slice(0, 8);

    const recentInvoices = enrichedInvoices.slice(0, 8);
    const recentPdcs = [...pdcs].reverse().slice(0, 8);

    return NextResponse.json({
      stats: {
        totalInvoices: invoices.length,
        totalInvoiceValue,
        totalPaid,
        totalOutstanding,
        pendingPaymentsValue: totalOutstanding,
        overdueCount,
        overdueValue,
        pdcsReceived,
        pdcsPending,
        pdcsDueSoon,
        pdcsCleared,
        pdcsBounced,
      },
      recentInvoices,
      recentPdcs,
      recentPayments: payments,
      upcomingInvoices,
      upcomingPdcs,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to fetch finance overview: ' + errorMsg }, { status: 500 });
  }
}
