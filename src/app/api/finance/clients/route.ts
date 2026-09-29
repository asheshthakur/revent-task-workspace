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

    let query = `
      SELECT 
        c.*,
        u.name as account_owner_name,
        u.email as account_owner_email,
        (SELECT COUNT(*) FROM invoices i WHERE i.client_id = c.id) as invoice_count,
        (SELECT COALESCE(SUM(i.total_amount), 0) FROM invoices i WHERE i.client_id = c.id AND i.payment_status != 'Cancelled') as total_invoiced,
        (SELECT COALESCE(SUM(p.amount), 0) FROM payments p WHERE p.client_id = c.id) as total_paid,
        (SELECT COUNT(*) FROM pdc_records pdc WHERE pdc.client_id = c.id) as pdc_count,
        (SELECT COUNT(*) FROM tasks t WHERE t.organisation_id = c.organisation_id AND t.description LIKE ('%' || c.name || '%') AND t.status != 'Completed') as open_tasks_count
      FROM clients c
      LEFT JOIN users u ON c.account_owner_id = u.id
      WHERE c.organisation_id = ?
    `;

    const params: any[] = [activeOrg.id];

    if (search) {
      query += ` AND (LOWER(c.name) LIKE ? OR LOWER(c.contact_person) LIKE ? OR LOWER(c.email) LIKE ? OR LOWER(c.phone) LIKE ?) `;
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }

    query += ` ORDER BY c.name ASC `;

    const clients = await queryAll<any>(query, params);

    const enriched = clients.map((c) => {
      const invoiced = Number(c.total_invoiced) || 0;
      const paid = Number(c.total_paid) || 0;
      const outstanding = Math.max(0, invoiced - paid);
      return {
        ...c,
        total_invoiced: invoiced,
        total_paid: paid,
        total_outstanding: outstanding,
      };
    });

    return NextResponse.json({ clients: enriched });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to fetch clients: ' + errorMsg }, { status: 500 });
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
    const { name, contact_person = '', email = '', phone = '', address = '', account_owner_id } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Client company name is required' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const res = await queryRun(`
      INSERT INTO clients (
        organisation_id, name, contact_person, email, phone, address, account_owner_id, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `, [
      activeOrg.id,
      name.trim(),
      contact_person ? contact_person.trim() : '',
      email ? email.trim() : '',
      phone ? phone.trim() : '',
      address ? address.trim() : '',
      account_owner_id ? parseInt(account_owner_id, 10) : user.id,
      now,
      now,
    ]);

    const clientId = Number(res.lastInsertRowid);

    await logAuditAction({
      organisationId: activeOrg.id,
      userId: user.id,
      actionType: 'Client Created',
      entityType: 'Client',
      entityId: clientId,
      entityTitle: name.trim(),
      newValue: `Client ${name.trim()} added`,
    });

    const client = await queryFirst<any>('SELECT * FROM clients WHERE id = ?', [clientId]);
    return NextResponse.json({ success: true, client }, { status: 201 });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to create client: ' + errorMsg }, { status: 500 });
  }
}
