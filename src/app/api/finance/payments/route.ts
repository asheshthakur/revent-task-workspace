import { NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth';
import { queryFirst, queryAll, queryRun, logAuditAction } from '@/lib/db';
import { computeInvoiceStatus } from '@/lib/finance-db';

export async function GET(req: Request) {
  try {
    const ctx = await getTenantContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { activeOrg } = ctx;

    const { searchParams } = new URL(req.url);
    const invoiceId = searchParams.get('invoiceId') || '';
    const clientId = searchParams.get('clientId') || '';

    let query = `
      SELECT 
        p.*,
        c.name as client_name,
        i.invoice_number,
        i.total_amount as invoice_total_amount,
        u.name as recorded_by_name
      FROM payments p
      LEFT JOIN clients c ON p.client_id = c.id
      LEFT JOIN invoices i ON p.invoice_id = i.id
      LEFT JOIN users u ON p.recorded_by = u.id
      WHERE p.organisation_id = ?
    `;

    const params: any[] = [activeOrg.id];

    if (invoiceId) {
      query += ` AND p.invoice_id = ? `;
      params.push(parseInt(invoiceId, 10));
    }

    if (clientId) {
      query += ` AND p.client_id = ? `;
      params.push(parseInt(clientId, 10));
    }

    query += ` ORDER BY p.payment_date DESC, p.created_at DESC `;

    const payments = await queryAll<any>(query, params);
    return NextResponse.json({ payments });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to fetch payments: ' + errorMsg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await getTenantContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { user, activeOrg } = ctx;

    const body = await req.json();
    const {
      invoice_id,
      amount,
      payment_date,
      payment_method = 'Bank Transfer',
      payment_reference = '',
      notes = '',
      receipt_data,
      receipt_filename,
      receipt_mime_type,
    } = body;

    if (!invoice_id) {
      return NextResponse.json({ error: 'Invoice is required' }, { status: 400 });
    }
    const payAmount = parseFloat(amount);
    if (isNaN(payAmount) || payAmount <= 0) {
      return NextResponse.json({ error: 'Valid payment amount greater than zero is required' }, { status: 400 });
    }
    if (!payment_date) {
      return NextResponse.json({ error: 'Payment date is required' }, { status: 400 });
    }

    // Verify invoice belongs to this workspace
    const invoice = await queryFirst<any>(`
      SELECT 
        i.*,
        c.name as client_name
      FROM invoices i
      LEFT JOIN clients c ON i.client_id = c.id
      WHERE i.id = ? AND i.organisation_id = ?
    `, [invoice_id, activeOrg.id]);

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found in this workspace' }, { status: 404 });
    }

    // Check existing total payments
    const existingPayments = await queryAll<any>(
      'SELECT amount FROM payments WHERE invoice_id = ? AND organisation_id = ?',
      [invoice.id, activeOrg.id]
    );
    const currentPaid = existingPayments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
    const totalAmount = Number(invoice.total_amount) || 0;
    const currentOutstanding = Math.max(0, totalAmount - currentPaid);

    if (payAmount > currentOutstanding + 0.01) {
      return NextResponse.json({
        error: `Payment amount (${payAmount.toLocaleString()}) cannot exceed the outstanding balance (${currentOutstanding.toLocaleString()})`,
      }, { status: 400 });
    }

    const now = new Date().toISOString();

    const res = await queryRun(`
      INSERT INTO payments (
        organisation_id, client_id, invoice_id, amount, payment_date, payment_method,
        payment_reference, notes, recorded_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      activeOrg.id,
      invoice.client_id,
      invoice.id,
      payAmount,
      payment_date,
      payment_method,
      payment_reference ? payment_reference.trim() : '',
      notes ? notes.trim() : '',
      user.id,
      now,
      now,
    ]);

    const newPaymentId = Number(res.lastInsertRowid);

    // Save supporting receipt document if provided
    if (receipt_data && receipt_filename) {
      await queryRun(`
        INSERT INTO finance_documents (
          organisation_id, entity_type, entity_id, document_type, filename, file_size, mime_type, file_data, uploaded_by, created_at
        ) VALUES (?, 'payment', ?, 'Payment Receipt', ?, ?, ?, ?, ?, ?)
      `, [
        activeOrg.id,
        newPaymentId,
        receipt_filename,
        receipt_data.length,
        receipt_mime_type || 'application/pdf',
        receipt_data,
        user.id,
        now,
      ]);
    }

    // Recalculate invoice status
    const newPaid = currentPaid + payAmount;
    const newStatus = computeInvoiceStatus(invoice.due_date, totalAmount, newPaid, invoice.payment_status);

    await queryRun(`
      UPDATE invoices SET payment_status = ?, updated_at = ? WHERE id = ? AND organisation_id = ?
    `, [newStatus, now, invoice.id, activeOrg.id]);

    await logAuditAction({
      organisationId: activeOrg.id,
      userId: user.id,
      actionType: 'Payment Recorded',
      entityType: 'Payment',
      entityId: newPaymentId,
      entityTitle: invoice.invoice_number,
      newValue: `Recorded payment of ${invoice.currency} ${payAmount.toLocaleString()} against invoice ${invoice.invoice_number}`,
    });

    return NextResponse.json({
      success: true,
      paymentId: newPaymentId,
      newPaidAmount: newPaid,
      newOutstandingAmount: Math.max(0, totalAmount - newPaid),
      newStatus,
    }, { status: 201 });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to record payment: ' + errorMsg }, { status: 500 });
  }
}
