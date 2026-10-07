import { NextResponse } from 'next/server';
import { getTenantContext, getCurrentUser } from '@/lib/auth';
import { queryAll, queryRun } from '@/lib/db';
import { VEYA_LEGAL_CONFIG } from '@/lib/legalConfig';

export const dynamic = 'force-dynamic';

/**
 * GET: Retrieve legal acceptance history for the current authenticated user / active workspace.
 */
export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let orgId: number | null = null;
    const ctx = await getTenantContext();
    if (ctx && ctx.activeOrg) {
      orgId = ctx.activeOrg.id;
    }

    // Admins can see acceptance records for their active workspace; non-admins see their own
    let query = `
      SELECT la.id, la.user_id, u.name as user_name, u.email as user_email, la.organisation_id, 
             la.document_type, la.document_version, la.acceptance_type, la.accepted_at
      FROM legal_acceptances la
      JOIN users u ON la.user_id = u.id
      WHERE la.user_id = ?
    `;
    const params: any[] = [user.id];

    if (ctx && ctx.activeOrg && ctx.activeOrg.is_admin && orgId) {
      query = `
        SELECT la.id, la.user_id, u.name as user_name, u.email as user_email, la.organisation_id, 
               la.document_type, la.document_version, la.acceptance_type, la.accepted_at
        FROM legal_acceptances la
        JOIN users u ON la.user_id = u.id
        WHERE la.organisation_id = ? OR la.user_id = ?
        ORDER BY la.accepted_at DESC
        LIMIT 100
      `;
      params.splice(0, params.length, orgId, user.id);
    } else {
      query += ` ORDER BY la.accepted_at DESC LIMIT 50`;
    }

    const records = await queryAll(query, params);

    return NextResponse.json({
      success: true,
      acceptances: records,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to query acceptances';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * POST: Record an affirmative legal document acceptance (immutable audit record).
 */
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { documentType, documentVersion, acceptanceType, organisationId, metadata } = body;

    if (!documentType || !documentVersion) {
      return NextResponse.json({ error: 'Missing documentType or documentVersion' }, { status: 400 });
    }

    const validAcceptanceTypes = [
      'SIGNUP_CHECKBOX',
      'ONBOARDING_MODAL',
      'WORKSPACE_ADMIN_EXECUTION',
      'CONTRACT_ORDER_FORM',
    ];
    const accType = validAcceptanceTypes.includes(acceptanceType) ? acceptanceType : 'ONBOARDING_MODAL';

    // Extract lawful compliance proof headers without invasive tracking
    const userAgent = req.headers.get('user-agent') || 'Unknown';
    const forwardedFor = req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for') || null;
    const ipAddress = forwardedFor ? forwardedFor.split(',')[0].trim() : null;

    let orgToRecord: number | null = organisationId ? Number(organisationId) : null;
    const ctx = await getTenantContext();
    if (!orgToRecord && ctx && ctx.activeOrg) {
      orgToRecord = ctx.activeOrg.id;
    }

    // Insert immutable acceptance record
    await queryRun(`
      INSERT INTO legal_acceptances (
        user_id, organisation_id, document_type, document_version, 
        acceptance_type, ip_address, user_agent, accepted_at, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), ?)
    `, [
      user.id,
      orgToRecord,
      String(documentType).toUpperCase(),
      String(documentVersion),
      accType,
      ipAddress,
      userAgent.slice(0, 255),
      metadata ? JSON.stringify(metadata) : null,
    ]);

    // If DPA was accepted by an Admin/Owner, update organisation_subscriptions
    if (String(documentType).toUpperCase() === 'DPA' && orgToRecord) {
      await queryRun(`
        UPDATE organisation_subscriptions 
        SET dpa_accepted_at = datetime('now'), dpa_accepted_by_user_id = ?, updated_at = datetime('now')
        WHERE organisation_id = ?
      `, [user.id, orgToRecord]);
    }

    return NextResponse.json({
      success: true,
      message: 'Legal document acceptance successfully recorded',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to record acceptance';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
