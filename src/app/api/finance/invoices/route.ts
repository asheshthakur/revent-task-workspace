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
    const search = (searchParams.get('search') || '').trim().toLowerCase();
    const paymentStatus = searchParams.get('paymentStatus') || '';
    const pdcStatus = searchParams.get('pdcStatus') || '';
    const clientId = searchParams.get('clientId') || '';
    const accountOwnerId = searchParams.get('accountOwnerId') || '';
    const dateFrom = searchParams.get('dateFrom') || '';
    const dateTo = searchParams.get('dateTo') || '';
    const timing = searchParams.get('timing') || ''; // 'overdue' | 'due_today' | 'due_week'

    let query = `
      SELECT 
        i.*,
        c.name as client_name,
        c.contact_person as client_contact_person,
        c.email as client_email,
        c.phone as client_phone,
        u.name as account_owner_name,
        u.email as account_owner_email,
        COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.invoice_id = i.id), 0) as paid_amount,
        (SELECT COUNT(*) FROM pdc_records pdc WHERE pdc.invoice_id = i.id) as pdc_count,
        (SELECT COUNT(*) FROM tasks t WHERE t.invoice_id = i.id) as task_count,
        (SELECT COUNT(*) FROM finance_documents fd WHERE fd.entity_type = 'invoice' AND fd.entity_id = i.id) as document_count
      FROM invoices i
      LEFT JOIN clients c ON i.client_id = c.id
      LEFT JOIN users u ON i.account_owner_id = u.id
      WHERE i.organisation_id = ?
    `;

    const params: any[] = [activeOrg.id];

    if (clientId) {
      query += ` AND i.client_id = ? `;
      params.push(parseInt(clientId, 10));
    }

    if (accountOwnerId) {
      query += ` AND i.account_owner_id = ? `;
      params.push(parseInt(accountOwnerId, 10));
    }

    if (pdcStatus) {
      query += ` AND i.pdc_status = ? `;
      params.push(pdcStatus);
    }

    if (dateFrom) {
      query += ` AND i.invoice_date >= ? `;
      params.push(dateFrom);
    }

    if (dateTo) {
      query += ` AND i.invoice_date <= ? `;
      params.push(dateTo);
    }

    if (search) {
      query += ` AND (LOWER(i.invoice_number) LIKE ? OR LOWER(c.name) LIKE ? OR LOWER(c.contact_person) LIKE ? OR LOWER(c.email) LIKE ?) `;
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }

    query += ` ORDER BY i.created_at DESC `;

    const rawInvoices = await queryAll<any>(query, params);

    const todayStr = new Date().toISOString().split('T')[0];
    const sevenDaysLater = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

    const invoices = rawInvoices.map((inv) => {
      const paid = Number(inv.paid_amount) || 0;
      const total = Number(inv.total_amount) || 0;
      const outstanding = Math.max(0, total - paid);
      const computedStatus = computeInvoiceStatus(inv.due_date, total, paid, inv.payment_status);

      return {
        ...inv,
        paid_amount: paid,
        outstanding_amount: outstanding,
        effective_status: computedStatus,
      };
    });

    let filtered = invoices;

    if (paymentStatus) {
      filtered = filtered.filter((inv) => inv.effective_status.toLowerCase() === paymentStatus.toLowerCase());
    }

    if (timing === 'overdue') {
      filtered = filtered.filter((inv) => inv.effective_status === 'Overdue');
    } else if (timing === 'due_today') {
      filtered = filtered.filter((inv) => inv.due_date === todayStr && inv.outstanding_amount > 0);
    } else if (timing === 'due_week') {
      filtered = filtered.filter((inv) => inv.due_date >= todayStr && inv.due_date <= sevenDaysLater && inv.outstanding_amount > 0);
    }

    return NextResponse.json({ invoices: filtered });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to fetch invoices: ' + errorMsg }, { status: 500 });
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
      invoice_number,
      client_id,
      account_owner_id,
      invoice_date,
      due_date,
      currency = 'AED',
      subtotal = 0,
      vat_rate = 5.0,
      notes = '',
    } = body;

    if (!invoice_number || !invoice_number.trim()) {
      return NextResponse.json({ error: 'Invoice number is required' }, { status: 400 });
    }
    if (!client_id) {
      return NextResponse.json({ error: 'Client is required' }, { status: 400 });
    }
    if (!invoice_date || !due_date) {
      return NextResponse.json({ error: 'Invoice date and due date are required' }, { status: 400 });
    }

    // Verify client belongs to this organisation
    const client = await queryFirst<any>(
      'SELECT id, name FROM clients WHERE id = ? AND organisation_id = ?',
      [client_id, activeOrg.id]
    );
    if (!client) {
      return NextResponse.json({ error: 'Selected client does not exist in this workspace' }, { status: 400 });
    }

    // Check duplicate invoice number within this organization
    const existing = await queryFirst<any>(
      'SELECT id FROM invoices WHERE organisation_id = ? AND LOWER(invoice_number) = ?',
      [activeOrg.id, invoice_number.trim().toLowerCase()]
    );
    if (existing) {
      return NextResponse.json({ error: `Invoice number "${invoice_number.trim()}" already exists` }, { status: 409 });
    }

    const sub = Math.max(0, parseFloat(subtotal) || 0);
    const rate = Math.max(0, parseFloat(vat_rate) || 0);
    const vatAmount = parseFloat(((sub * rate) / 100).toFixed(2));
    const totalAmount = parseFloat((sub + vatAmount).toFixed(2));
    const now = new Date().toISOString();

    const res = await queryRun(`
      INSERT INTO invoices (
        organisation_id, invoice_number, client_id, account_owner_id, invoice_date, due_date,
        currency, subtotal, vat_rate, vat_amount, total_amount, payment_status, pdc_status,
        notes, created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending', 'None', ?, ?, ?, ?)
    `, [
      activeOrg.id,
      invoice_number.trim(),
      client.id,
      account_owner_id ? parseInt(account_owner_id, 10) : user.id,
      invoice_date,
      due_date,
      currency,
      sub,
      rate,
      vatAmount,
      totalAmount,
      notes ? notes.trim() : '',
      user.id,
      now,
      now,
    ]);

    const newInvoiceId = Number(res.lastInsertRowid);

    await logAuditAction({
      organisationId: activeOrg.id,
      userId: user.id,
      actionType: 'Invoice Created',
      entityType: 'Invoice',
      entityId: newInvoiceId,
      entityTitle: invoice_number.trim(),
      newValue: `Created invoice ${invoice_number.trim()} for ${client.name} (${currency} ${totalAmount.toLocaleString()})`,
    });

    const created = await queryFirst<any>('SELECT * FROM invoices WHERE id = ?', [newInvoiceId]);
    return NextResponse.json({ success: true, invoice: created }, { status: 201 });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to create invoice: ' + errorMsg }, { status: 500 });
  }
}
