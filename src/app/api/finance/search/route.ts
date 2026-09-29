import { NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth';
import { queryAll } from '@/lib/db';
import { computeInvoiceStatus } from '@/lib/finance-db';

export async function GET(req: Request) {
  try {
    const ctx = await getTenantContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { activeOrg } = ctx;

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get('q') || '').trim().toLowerCase();

    if (!q) {
      return NextResponse.json({
        clients: [],
        invoices: [],
        pdcs: [],
        payments: [],
        tasks: [],
      });
    }

    const searchPattern = `%${q}%`;

    const clients = await queryAll<any>(`
      SELECT c.*, u.name as account_owner_name
      FROM clients c
      LEFT JOIN users u ON c.account_owner_id = u.id
      WHERE c.organisation_id = ?
        AND (
          LOWER(c.name) LIKE ? OR
          LOWER(c.contact_person) LIKE ? OR
          LOWER(c.email) LIKE ? OR
          LOWER(c.phone) LIKE ?
        )
      LIMIT 10
    `, [activeOrg.id, searchPattern, searchPattern, searchPattern, searchPattern]);

    const invoices = await queryAll<any>(`
      SELECT 
        i.*,
        c.name as client_name,
        COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.invoice_id = i.id), 0) as paid_amount
      FROM invoices i
      LEFT JOIN clients c ON i.client_id = c.id
      WHERE i.organisation_id = ?
        AND (
          LOWER(i.invoice_number) LIKE ? OR
          LOWER(c.name) LIKE ? OR
          LOWER(c.contact_person) LIKE ? OR
          LOWER(c.email) LIKE ? OR
          LOWER(c.phone) LIKE ?
        )
      LIMIT 15
    `, [activeOrg.id, searchPattern, searchPattern, searchPattern, searchPattern, searchPattern]);

    const enrichedInvoices = invoices.map((inv) => {
      const paid = Number(inv.paid_amount) || 0;
      const total = Number(inv.total_amount) || 0;
      return {
        ...inv,
        paid_amount: paid,
        outstanding_amount: Math.max(0, total - paid),
        effective_status: computeInvoiceStatus(inv.due_date, total, paid, inv.payment_status),
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
        AND (
          LOWER(p.pdc_number) LIKE ? OR
          LOWER(p.bank_name) LIKE ? OR
          LOWER(c.name) LIKE ? OR
          LOWER(i.invoice_number) LIKE ?
        )
      LIMIT 15
    `, [activeOrg.id, searchPattern, searchPattern, searchPattern, searchPattern]);

    const payments = await queryAll<any>(`
      SELECT 
        p.*,
        c.name as client_name,
        i.invoice_number
      FROM payments p
      LEFT JOIN clients c ON p.client_id = c.id
      LEFT JOIN invoices i ON p.invoice_id = i.id
      WHERE p.organisation_id = ?
        AND (
          LOWER(p.payment_reference) LIKE ? OR
          LOWER(c.name) LIKE ? OR
          LOWER(i.invoice_number) LIKE ?
        )
      LIMIT 15
    `, [activeOrg.id, searchPattern, searchPattern, searchPattern]);

    const tasks = await queryAll<any>(`
      SELECT 
        t.*,
        u.name as assigned_to_name,
        i.invoice_number
      FROM tasks t
      LEFT JOIN users u ON t.assigned_to = u.id
      LEFT JOIN invoices i ON t.invoice_id = i.id
      WHERE t.organisation_id = ?
        AND (
          LOWER(t.task_name) LIKE ? OR
          LOWER(t.description) LIKE ? OR
          LOWER(i.invoice_number) LIKE ?
        )
      LIMIT 15
    `, [activeOrg.id, searchPattern, searchPattern, searchPattern]);

    return NextResponse.json({
      query: q,
      clients,
      invoices: enrichedInvoices,
      pdcs,
      payments,
      tasks,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: 'Finance search failed: ' + errorMsg }, { status: 500 });
  }
}
