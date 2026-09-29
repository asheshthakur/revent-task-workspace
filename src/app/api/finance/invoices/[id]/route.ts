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
    const invoiceId = parseInt(id, 10);

    const invoice = await queryFirst<any>(`
      SELECT 
        i.*,
        c.name as client_name,
        c.contact_person as client_contact_person,
        c.email as client_email,
        c.phone as client_phone,
        c.address as client_address,
        u_owner.name as account_owner_name,
        u_owner.email as account_owner_email,
        u_creator.name as created_by_name
      FROM invoices i
      LEFT JOIN clients c ON i.client_id = c.id
      LEFT JOIN users u_owner ON i.account_owner_id = u_owner.id
      LEFT JOIN users u_creator ON i.created_by = u_creator.id
      WHERE i.id = ? AND i.organisation_id = ?
    `, [invoiceId, activeOrg.id]);

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const payments = await queryAll<any>(`
      SELECT 
        p.*,
        u.name as recorded_by_name
      FROM payments p
      LEFT JOIN users u ON p.recorded_by = u.id
      WHERE p.invoice_id = ? AND p.organisation_id = ?
      ORDER BY p.payment_date DESC, p.created_at DESC
    `, [invoiceId, activeOrg.id]);

    const pdcs = await queryAll<any>(`
      SELECT 
        pdc.*,
        u.name as created_by_name
      FROM pdc_records pdc
      LEFT JOIN users u ON pdc.created_by = u.id
      WHERE pdc.invoice_id = ? AND pdc.organisation_id = ?
      ORDER BY pdc.cheque_date DESC
    `, [invoiceId, activeOrg.id]);

    const documents = await queryAll<any>(`
      SELECT 
        id, organisation_id, entity_type, entity_id, document_type, filename, file_size, mime_type, created_at
      FROM finance_documents
      WHERE entity_type = 'invoice' AND entity_id = ? AND organisation_id = ?
      ORDER BY created_at DESC
    `, [invoiceId, activeOrg.id]);

    const tasks = await queryAll<any>(`
      SELECT 
        t.*,
        u.name as assigned_to_name,
        u_creator.name as created_by_name
      FROM tasks t
      LEFT JOIN users u ON t.assigned_to = u.id
      LEFT JOIN users u_creator ON t.created_by = u_creator.id
      WHERE t.invoice_id = ? AND t.organisation_id = ?
      ORDER BY t.created_at DESC
    `, [invoiceId, activeOrg.id]);

    const totalPaid = payments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
    const totalAmount = Number(invoice.total_amount) || 0;
    const outstanding = Math.max(0, totalAmount - totalPaid);
    const effectiveStatus = computeInvoiceStatus(invoice.due_date, totalAmount, totalPaid, invoice.payment_status);

    return NextResponse.json({
      invoice: {
        ...invoice,
        paid_amount: totalPaid,
        outstanding_amount: outstanding,
        effective_status: effectiveStatus,
      },
      payments,
      pdcs,
      documents,
      tasks,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to fetch invoice details: ' + errorMsg }, { status: 500 });
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
    const invoiceId = parseInt(id, 10);

    const invoice = await queryFirst<any>(
      'SELECT * FROM invoices WHERE id = ? AND organisation_id = ?',
      [invoiceId, activeOrg.id]
    );

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const body = await req.json();
    const {
      invoice_number,
      client_id,
      account_owner_id,
      invoice_date,
      due_date,
      currency,
      subtotal,
      vat_rate,
      payment_status,
      pdc_status,
      notes,
    } = body;

    const sub = subtotal !== undefined ? Math.max(0, parseFloat(subtotal) || 0) : invoice.subtotal;
    const rate = vat_rate !== undefined ? Math.max(0, parseFloat(vat_rate) || 0) : invoice.vat_rate;
    const vatAmount = parseFloat(((sub * rate) / 100).toFixed(2));
    const totalAmount = parseFloat((sub + vatAmount).toFixed(2));
    const now = new Date().toISOString();

    await queryRun(`
      UPDATE invoices SET
        invoice_number = ?, client_id = ?, account_owner_id = ?, invoice_date = ?, due_date = ?,
        currency = ?, subtotal = ?, vat_rate = ?, vat_amount = ?, total_amount = ?,
        payment_status = ?, pdc_status = ?, notes = ?, updated_at = ?
      WHERE id = ? AND organisation_id = ?
    `, [
      invoice_number !== undefined ? invoice_number.trim() : invoice.invoice_number,
      client_id !== undefined ? parseInt(client_id, 10) : invoice.client_id,
      account_owner_id !== undefined ? parseInt(account_owner_id, 10) : invoice.account_owner_id,
      invoice_date !== undefined ? invoice_date : invoice.invoice_date,
      due_date !== undefined ? due_date : invoice.due_date,
      currency !== undefined ? currency : invoice.currency,
      sub,
      rate,
      vatAmount,
      totalAmount,
      payment_status !== undefined ? payment_status : invoice.payment_status,
      pdc_status !== undefined ? pdc_status : invoice.pdc_status,
      notes !== undefined ? notes.trim() : invoice.notes,
      now,
      invoiceId,
      activeOrg.id,
    ]);

    await logAuditAction({
      organisationId: activeOrg.id,
      userId: user.id,
      actionType: 'Invoice Updated',
      entityType: 'Invoice',
      entityId: invoiceId,
      entityTitle: invoice.invoice_number,
      oldValue: `Status: ${invoice.payment_status}, Total: ${invoice.total_amount}`,
      newValue: `Updated invoice ${invoice.invoice_number}`,
    });

    const updated = await queryFirst<any>('SELECT * FROM invoices WHERE id = ?', [invoiceId]);
    return NextResponse.json({ success: true, invoice: updated });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to update invoice: ' + errorMsg }, { status: 500 });
  }
}
