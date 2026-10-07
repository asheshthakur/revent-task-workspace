import { NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth';
import { queryFirst, queryRun, logAuditAction } from '@/lib/db';
import { VEYA_LEGAL_CONFIG } from '@/lib/legalConfig';

export const dynamic = 'force-dynamic';

/**
 * GET: Retrieve active commercial subscription and legal status for the workspace.
 */
export async function GET() {
  try {
    const ctx = await getTenantContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { activeOrg, user } = ctx;

    const sub = await queryFirst(`
      SELECT 
        s.id, s.organisation_id, s.plan_id, s.status, s.seat_limit, s.billing_interval, 
        s.currency, s.price_per_seat, s.dpa_accepted_at, s.dpa_accepted_by_user_id,
        u_dpa.name as dpa_accepted_by_name,
        s.current_period_start, s.current_period_end, s.trial_ends_at,
        s.billing_legal_name, s.billing_address, s.billing_tax_id, s.billing_contact_email,
        s.created_at, s.updated_at
      FROM organisation_subscriptions s
      LEFT JOIN users u_dpa ON s.dpa_accepted_by_user_id = u_dpa.id
      WHERE s.organisation_id = ?
    `, [activeOrg.id]);

    const activePlan = VEYA_LEGAL_CONFIG.PRICING_PLANS.find(p => p.id === (sub?.plan_id || 'free')) || VEYA_LEGAL_CONFIG.PRICING_PLANS[0];

    return NextResponse.json({
      success: true,
      subscription: sub || {
        organisation_id: activeOrg.id,
        plan_id: 'free',
        status: 'active',
        seat_limit: 5,
        billing_interval: 'monthly',
        currency: 'USD',
        price_per_seat: 0,
        dpa_accepted_at: null,
      },
      planDetails: activePlan,
      isOwnerOrAdmin: activeOrg.is_admin,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to query subscription';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * PUT: Update workspace commercial profile or plan tier (Admin/Owner only).
 */
export async function PUT(req: Request) {
  try {
    const ctx = await getTenantContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!ctx.activeOrg.is_admin) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }
    const { activeOrg, user } = ctx;

    const body = await req.json().catch(() => ({}));
    const {
      planId,
      billingLegalName,
      billingAddress,
      billingTaxId,
      billingContactEmail,
      billingInterval,
    } = body;

    const validPlan = VEYA_LEGAL_CONFIG.PRICING_PLANS.find(p => p.id === planId);
    const planToSave = validPlan ? validPlan.id : 'pro';
    const seatLimit = validPlan?.seatLimit ?? null;
    const pricePerSeat = validPlan?.priceMonthlyUSD ?? 0;

    await queryRun(`
      INSERT INTO organisation_subscriptions (
        organisation_id, plan_id, status, seat_limit, billing_interval,
        currency, price_per_seat, billing_legal_name, billing_address,
        billing_tax_id, billing_contact_email, updated_at
      ) VALUES (?, ?, 'active', ?, ?, 'USD', ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(organisation_id) DO UPDATE SET
        plan_id = excluded.plan_id,
        seat_limit = excluded.seat_limit,
        billing_interval = excluded.billing_interval,
        price_per_seat = excluded.price_per_seat,
        billing_legal_name = coalesce(excluded.billing_legal_name, organisation_subscriptions.billing_legal_name),
        billing_address = coalesce(excluded.billing_address, organisation_subscriptions.billing_address),
        billing_tax_id = coalesce(excluded.billing_tax_id, organisation_subscriptions.billing_tax_id),
        billing_contact_email = coalesce(excluded.billing_contact_email, organisation_subscriptions.billing_contact_email),
        updated_at = datetime('now')
    `, [
      activeOrg.id,
      planToSave,
      seatLimit,
      billingInterval || 'monthly',
      pricePerSeat,
      billingLegalName ? String(billingLegalName).trim() : null,
      billingAddress ? String(billingAddress).trim() : null,
      billingTaxId ? String(billingTaxId).trim() : null,
      billingContactEmail ? String(billingContactEmail).trim() : null,
    ]);

    await logAuditAction({
      organisationId: activeOrg.id,
      userId: user.id,
      actionType: 'Subscription Updated',
      entityType: 'Subscription',
      entityTitle: `Plan: ${planToSave}`,
      newValue: `Plan changed to ${planToSave} by ${user.name}`,
    });

    return NextResponse.json({
      success: true,
      message: 'Workspace commercial subscription successfully updated',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to update subscription';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
