import { NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth';
import { queryFirst, queryRun, logAuditAction } from '@/lib/db';
import { VEYA_LEGAL_CONFIG } from '@/lib/legalConfig';

export const dynamic = 'force-dynamic';

/**
 * GET: Retrieve active deletion requests for the workspace.
 */
export async function GET() {
  try {
    const ctx = await getTenantContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { activeOrg } = ctx;

    const request = await queryFirst(`
      SELECT r.id, r.organisation_id, r.requested_by_user_id, u.name as requested_by_name,
             r.request_type, r.status, r.scheduled_purge_at, r.created_at
      FROM customer_deletion_requests r
      JOIN users u ON r.requested_by_user_id = u.id
      WHERE r.organisation_id = ? AND r.status IN ('pending_review', 'scheduled')
      ORDER BY r.id DESC
      LIMIT 1
    `, [activeOrg.id]);

    return NextResponse.json({
      success: true,
      pendingDeletionRequest: request || null,
      gracePeriodDays: 30,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to query deletion requests';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * POST: Submit an organizational deletion / erasure request (Workspace Owner only).
 */
export async function POST(req: Request) {
  try {
    const ctx = await getTenantContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { activeOrg, user } = ctx;

    // Only Workspace Owner can initiate organizational erasure
    if (activeOrg.role !== 'owner') {
      return NextResponse.json({
        error: 'Forbidden: Only the primary Workspace Owner can initiate complete organizational data erasure',
      }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { confirmationText } = body;

    if (confirmationText !== `DELETE ${activeOrg.name}`) {
      return NextResponse.json({
        error: `Explicit confirmation mismatch. You must type exactly: DELETE ${activeOrg.name}`,
      }, { status: 400 });
    }

    // Schedule 30-day grace period
    const scheduledPurge = new Date();
    scheduledPurge.setDate(scheduledPurge.getDate() + 30);

    await queryRun(`
      INSERT INTO customer_deletion_requests (
        organisation_id, requested_by_user_id, request_type, status,
        scheduled_purge_at, created_at
      ) VALUES (?, ?, 'WORKSPACE_DELETION', 'scheduled', ?, datetime('now'))
    `, [
      activeOrg.id,
      user.id,
      scheduledPurge.toISOString(),
    ]);

    await logAuditAction({
      organisationId: activeOrg.id,
      userId: user.id,
      actionType: 'Workspace Deletion Requested',
      entityType: 'Organisation',
      entityTitle: activeOrg.name,
      newValue: `Purge scheduled for ${scheduledPurge.toISOString()} by Owner ${user.name}`,
    });

    return NextResponse.json({
      success: true,
      message: 'Workspace erasure scheduled. You retain access for a 30-day export grace period before permanent purge.',
      scheduledPurgeAt: scheduledPurge.toISOString(),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to schedule deletion';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
