import { NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth';
import { queryFirst, queryAll, queryRun, logAuditAction } from '@/lib/db';
import { computeInvoiceStatus } from '@/lib/finance-db';

interface Context {
  params: Promise<{ id: string }>;
}

export async function GET(req: Request, context: Context) {
  try {
    const ctx = await getTenantContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { activeOrg } = ctx;
    const { id } = await context.params;
    const clientId = parseInt(id, 10);

    const client = await queryFirst<any>(`
      SELECT 
        c.*,
        u.name as account_owner_name,
        u.email as account_owner_email
      FROM clients c
      LEFT JOIN users u ON c.account_owner_id = u.id
      WHERE c.id = ? AND c.organisation_id = ?
    `, [clientId, activeOrg.id]);

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    const invoices = await queryAll<any>(`
      SELECT 
        i.*,
        u.name as account_owner_name,
        COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.invoice_id = i.id), 0) as paid_amount
      FROM invoices i
      LEFT JOIN users u ON i.account_owner_id = u.id
      WHERE i.client_id = ? AND i.organisation_id = ?
      ORDER BY i.invoice_date DESC
    `, [clientId, activeOrg.id]);

    let totalInvoiced = 0;
    let totalPaid = 0;
    let totalOutstanding = 0;
    let totalOverdue = 0;

    const enrichedInvoices = invoices.map((inv) => {
      const paid = Number(inv.paid_amount) || 0;
      const total = Number(inv.total_amount) || 0;
      const outstanding = Math.max(0, total - paid);
      const computedStatus = computeInvoiceStatus(inv.due_date, total, paid, inv.payment_status);

      if (computedStatus !== 'Cancelled') {
        totalInvoiced += total;
        totalPaid += paid;
        totalOutstanding += outstanding;
        if (computedStatus === 'Overdue') {
          totalOverdue += outstanding;
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
        i.invoice_number
      FROM pdc_records p
      LEFT JOIN invoices i ON p.invoice_id = i.id
      WHERE p.client_id = ? AND p.organisation_id = ?
      ORDER BY p.cheque_date DESC
    `, [clientId, activeOrg.id]);

    const payments = await queryAll<any>(`
      SELECT 
        p.*,
        i.invoice_number,
        u.name as recorded_by_name
      FROM payments p
      LEFT JOIN invoices i ON p.invoice_id = i.id
      LEFT JOIN users u ON p.recorded_by = u.id
      WHERE p.client_id = ? AND p.organisation_id = ?
      ORDER BY p.payment_date DESC
    `, [clientId, activeOrg.id]);

    const tasks = await queryAll<any>(`
      SELECT 
        t.*,
        u.name as assigned_to_name
      FROM tasks t
      LEFT JOIN users u ON t.assigned_to = u.id
      WHERE t.organisation_id = ? 
        AND (
          t.invoice_id IN (SELECT id FROM invoices WHERE client_id = ?)
          OR t.task_name LIKE ('%' || ? || '%')
          OR t.description LIKE ('%' || ? || '%')
        )
      ORDER BY t.created_at DESC
    `, [activeOrg.id, clientId, client.name, client.name]);

    return NextResponse.json({
      client,
      financialSummary: {
        totalInvoiced,
        totalPaid,
        totalOutstanding,
        totalOverdue,
        invoiceCount: invoices.length,
        pdcCount: pdcs.length,
        openTasksCount: tasks.filter(t => t.status !== 'Completed').length,
      },
      invoices: enrichedInvoices,
      pdcs,
      payments,
      tasks,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to fetch client detail: ' + errorMsg }, { status: 500 });
  }
}

export async function PATCH(req: Request, context: Context) {
  try {
    const ctx = await getTenantContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { user, activeOrg } = ctx;
    const { id } = await context.params;
    const clientId = parseInt(id, 10);

    const client = await queryFirst<any>(
      'SELECT * FROM clients WHERE id = ? AND organisation_id = ?',
      [clientId, activeOrg.id]
    );

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    const body = await req.json();
    const { name, contact_person, email, phone, address, account_owner_id, is_active } = body;

    const updatedName = name !== undefined ? name.trim() : client.name;
    const updatedContact = contact_person !== undefined ? contact_person.trim() : client.contact_person;
    const updatedEmail = email !== undefined ? email.trim() : client.email;
    const updatedPhone = phone !== undefined ? phone.trim() : client.phone;
    const updatedAddress = address !== undefined ? address.trim() : client.address;
    const updatedOwner = account_owner_id !== undefined ? parseInt(account_owner_id, 10) : client.account_owner_id;
    const updatedActive = is_active !== undefined ? (is_active ? 1 : 0) : client.is_active;
    const now = new Date().toISOString();

    await queryRun(`
      UPDATE clients SET
        name = ?, contact_person = ?, email = ?, phone = ?, address = ?,
        account_owner_id = ?, is_active = ?, updated_at = ?
      WHERE id = ? AND organisation_id = ?
    `, [
      updatedName, updatedContact, updatedEmail, updatedPhone, updatedAddress,
      updatedOwner, updatedActive, now, clientId, activeOrg.id
    ]);

    await logAuditAction({
      organisationId: activeOrg.id,
      userId: user.id,
      actionType: 'Client Updated',
      entityType: 'Client',
      entityId: clientId,
      entityTitle: updatedName,
      oldValue: client.name,
      newValue: `Updated details for ${updatedName}`,
    });

    const updated = await queryFirst<any>('SELECT * FROM clients WHERE id = ?', [clientId]);
    return NextResponse.json({ success: true, client: updated });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to update client: ' + errorMsg }, { status: 500 });
  }
}
