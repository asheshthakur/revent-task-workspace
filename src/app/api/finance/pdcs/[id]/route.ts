import { NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth';
import { queryFirst, queryRun, logAuditAction } from '@/lib/db';

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
    const pdcId = parseInt(id, 10);

    const pdc = await queryFirst<any>(`
      SELECT 
        p.*,
        c.name as client_name,
        c.contact_person as client_contact_person,
        i.invoice_number,
        u.name as created_by_name,
        (SELECT fd.id FROM finance_documents fd WHERE fd.entity_type = 'pdc' AND fd.entity_id = p.id LIMIT 1) as document_id,
        (SELECT fd.filename FROM finance_documents fd WHERE fd.entity_type = 'pdc' AND fd.entity_id = p.id LIMIT 1) as document_filename
      FROM pdc_records p
      LEFT JOIN clients c ON p.client_id = c.id
      LEFT JOIN invoices i ON p.invoice_id = i.id
      LEFT JOIN users u ON p.created_by = u.id
      WHERE p.id = ? AND p.organisation_id = ?
    `, [pdcId, activeOrg.id]);

    if (!pdc) {
      return NextResponse.json({ error: 'PDC not found' }, { status: 404 });
    }

    return NextResponse.json({ pdc });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to fetch PDC: ' + errorMsg }, { status: 500 });
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
    const pdcId = parseInt(id, 10);

    const pdc = await queryFirst<any>(
      'SELECT * FROM pdc_records WHERE id = ? AND organisation_id = ?',
      [pdcId, activeOrg.id]
    );

    if (!pdc) {
      return NextResponse.json({ error: 'PDC not found' }, { status: 404 });
    }

    const body = await req.json();
    const {
      status,
      bank_name,
      cheque_date,
      amount,
      notes,
      document_data,
      document_filename,
      document_mime_type,
    } = body;

    const newStatus = status !== undefined ? status : pdc.status;
    const newBank = bank_name !== undefined ? bank_name.trim() : pdc.bank_name;
    const newDate = cheque_date !== undefined ? cheque_date : pdc.cheque_date;
    const newAmount = amount !== undefined ? parseFloat(amount) : pdc.amount;
    const newNotes = notes !== undefined ? notes.trim() : pdc.notes;
    const now = new Date().toISOString();

    await queryRun(`
      UPDATE pdc_records SET
        status = ?, bank_name = ?, cheque_date = ?, amount = ?, notes = ?, updated_at = ?
      WHERE id = ? AND organisation_id = ?
    `, [newStatus, newBank, newDate, newAmount, newNotes, now, pdcId, activeOrg.id]);

    // If an invoice is linked, update invoice's pdc_status
    if (pdc.invoice_id) {
      await queryRun(`
        UPDATE invoices SET pdc_status = ?, updated_at = ? WHERE id = ? AND organisation_id = ?
      `, [newStatus, now, pdc.invoice_id, activeOrg.id]);
    }

    // Handle replacement of document
    if (document_data && document_filename) {
      await queryRun(
        'DELETE FROM finance_documents WHERE entity_type = "pdc" AND entity_id = ? AND organisation_id = ?',
        [pdcId, activeOrg.id]
      );
      await queryRun(`
        INSERT INTO finance_documents (
          organisation_id, entity_type, entity_id, document_type, filename, file_size, mime_type, file_data, uploaded_by, created_at
        ) VALUES (?, 'pdc', ?, 'PDC Scan', ?, ?, ?, ?, ?, ?)
      `, [
        activeOrg.id,
        pdcId,
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
      actionType: 'PDC Status Changed',
      entityType: 'PDC',
      entityId: pdcId,
      entityTitle: pdc.pdc_number,
      oldValue: pdc.status,
      newValue: newStatus,
    });

    const updated = await queryFirst<any>('SELECT * FROM pdc_records WHERE id = ?', [pdcId]);
    return NextResponse.json({ success: true, pdc: updated });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to update PDC: ' + errorMsg }, { status: 500 });
  }
}
