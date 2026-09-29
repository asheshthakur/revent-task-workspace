import { NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth';
import { queryFirst, queryAll, queryRun, logAuditAction } from '@/lib/db';

export async function GET(req: Request) {
  try {
    const ctx = await getTenantContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { activeOrg } = ctx;

    const { searchParams } = new URL(req.url);
    const search = (searchParams.get('search') || '').trim().toLowerCase();
    const status = searchParams.get('status') || '';
    const clientId = searchParams.get('clientId') || '';
    const invoiceId = searchParams.get('invoiceId') || '';
    const timing = searchParams.get('timing') || ''; // 'due_soon' | 'cleared' | 'bounced'

    let query = `
      SELECT 
        pdc.*,
        c.name as client_name,
        c.contact_person as client_contact_person,
        i.invoice_number,
        i.total_amount as invoice_total_amount,
        u.name as created_by_name,
        (SELECT fd.id FROM finance_documents fd WHERE fd.entity_type = 'pdc' AND fd.entity_id = pdc.id LIMIT 1) as document_id,
        (SELECT fd.filename FROM finance_documents fd WHERE fd.entity_type = 'pdc' AND fd.entity_id = pdc.id LIMIT 1) as document_filename
      FROM pdc_records pdc
      LEFT JOIN clients c ON pdc.client_id = c.id
      LEFT JOIN invoices i ON pdc.invoice_id = i.id
      LEFT JOIN users u ON pdc.created_by = u.id
      WHERE pdc.organisation_id = ?
    `;

    const params: any[] = [activeOrg.id];

    if (clientId) {
      query += ` AND pdc.client_id = ? `;
      params.push(parseInt(clientId, 10));
    }

    if (invoiceId) {
      query += ` AND pdc.invoice_id = ? `;
      params.push(parseInt(invoiceId, 10));
    }

    if (status) {
      query += ` AND pdc.status = ? `;
      params.push(status);
    }

    if (search) {
      query += ` AND (LOWER(pdc.pdc_number) LIKE ? OR LOWER(pdc.bank_name) LIKE ? OR LOWER(c.name) LIKE ? OR LOWER(i.invoice_number) LIKE ?) `;
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }

    query += ` ORDER BY pdc.cheque_date ASC `;

    let pdcs = await queryAll<any>(query, params);

    const todayStr = new Date().toISOString().split('T')[0];
    const sevenDaysLater = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

    if (timing === 'due_soon') {
      pdcs = pdcs.filter((p) => p.status !== 'Cleared' && p.status !== 'Cancelled' && p.cheque_date >= todayStr && p.cheque_date <= sevenDaysLater);
    }

    return NextResponse.json({ pdcs });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to fetch PDCs: ' + errorMsg }, { status: 500 });
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
      pdc_number,
      client_id,
      invoice_id,
      bank_name,
      cheque_date,
      amount,
      currency = 'AED',
      received_date,
      status = 'Received',
      notes = '',
      document_data,
      document_filename,
      document_mime_type,
    } = body;

    if (!pdc_number || !pdc_number.trim()) {
      return NextResponse.json({ error: 'PDC cheque number is required' }, { status: 400 });
    }
    if (!client_id) {
      return NextResponse.json({ error: 'Client is required' }, { status: 400 });
    }
    if (!bank_name || !bank_name.trim()) {
      return NextResponse.json({ error: 'Bank name is required' }, { status: 400 });
    }
    if (!cheque_date) {
      return NextResponse.json({ error: 'Cheque date is required' }, { status: 400 });
    }
    if (!amount || parseFloat(amount) <= 0) {
      return NextResponse.json({ error: 'Valid cheque amount is required' }, { status: 400 });
    }

    const client = await queryFirst<any>(
      'SELECT id, name FROM clients WHERE id = ? AND organisation_id = ?',
      [client_id, activeOrg.id]
    );
    if (!client) {
      return NextResponse.json({ error: 'Client not found in this workspace' }, { status: 400 });
    }

    let validInvoiceId: number | null = null;
    if (invoice_id) {
      const inv = await queryFirst<any>(
        'SELECT id, invoice_number FROM invoices WHERE id = ? AND organisation_id = ?',
        [invoice_id, activeOrg.id]
      );
      if (inv) validInvoiceId = inv.id;
    }

    const now = new Date().toISOString();
    const received = received_date || now.split('T')[0];

    const res = await queryRun(`
      INSERT INTO pdc_records (
        organisation_id, pdc_number, client_id, invoice_id, bank_name, cheque_date,
        amount, currency, received_date, status, notes, created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      activeOrg.id,
      pdc_number.trim(),
      client.id,
      validInvoiceId,
      bank_name.trim(),
      cheque_date,
      parseFloat(amount),
      currency,
      received,
      status,
      notes ? notes.trim() : '',
      user.id,
      now,
      now,
    ]);

    const newPdcId = Number(res.lastInsertRowid);

    // If an invoice is linked, update invoice's pdc_status
    if (validInvoiceId) {
      await queryRun(`
        UPDATE invoices SET pdc_status = ?, updated_at = ? WHERE id = ? AND organisation_id = ?
      `, [status, now, validInvoiceId, activeOrg.id]);
    }

    // If document file attached, save it into finance_documents
    if (document_data && document_filename) {
      await queryRun(`
        INSERT INTO finance_documents (
          organisation_id, entity_type, entity_id, document_type, filename, file_size, mime_type, file_data, uploaded_by, created_at
        ) VALUES (?, 'pdc', ?, 'PDC Scan', ?, ?, ?, ?, ?, ?)
      `, [
        activeOrg.id,
        newPdcId,
        document_filename,
        document_data.length,
        document_mime_type || 'application/pdf',
        document_data,
        user.id,
        now,
      ]);
    }

    await logAuditAction({
      organisationId: activeOrg.id,
      userId: user.id,
      actionType: 'PDC Uploaded',
      entityType: 'PDC',
      entityId: newPdcId,
      entityTitle: pdc_number.trim(),
      newValue: `Recorded PDC ${pdc_number.trim()} from ${client.name} (${currency} ${parseFloat(amount).toLocaleString()}, Due: ${cheque_date})`,
    });

    const created = await queryFirst<any>('SELECT * FROM pdc_records WHERE id = ?', [newPdcId]);
    return NextResponse.json({ success: true, pdc: created }, { status: 201 });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to record PDC: ' + errorMsg }, { status: 500 });
  }
}
