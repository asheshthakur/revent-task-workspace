import { NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth';
import { queryAll, queryFirst, queryRun, logAuditAction } from '@/lib/db';

// GET /api/workspaces/members: List all members of the active workspace
export async function GET() {
  try {
    const ctx = await getTenantContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { activeOrg } = ctx;

    const members = await queryAll<any>(
      `SELECT 
        om.id as membership_id,
        u.id as user_id,
        u.name,
        u.email,
        om.role,
        om.department,
        om.status,
        om.joined_at,
        u.animal_emoji,
        u.selected_status,
        u.is_active
       FROM organisation_members om
       JOIN users u ON om.user_id = u.id
       WHERE om.organisation_id = ?
       ORDER BY 
         CASE om.role 
           WHEN 'owner' THEN 1 
           WHEN 'admin' THEN 2 
           ELSE 3 
         END,
         u.name ASC`,
      [activeOrg.id]
    );

    return NextResponse.json({
      workspace: activeOrg,
      members,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to fetch members: ' + errorMsg }, { status: 500 });
  }
}

// PATCH /api/workspaces/members: Update a member's role or department (admin/owner only)
export async function PATCH(req: Request) {
  try {
    const ctx = await getTenantContext();
    if (!ctx || !ctx.activeOrg.is_admin) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }
    const { user, activeOrg } = ctx;

    const { targetUserId, role, department } = await req.json();
    if (!targetUserId) {
      return NextResponse.json({ error: 'targetUserId is required' }, { status: 400 });
    }

    const targetMembership = await queryFirst<any>(
      'SELECT * FROM organisation_members WHERE organisation_id = ? AND user_id = ?',
      [activeOrg.id, targetUserId]
    );

    if (!targetMembership) {
      return NextResponse.json({ error: 'Member not found in workspace' }, { status: 404 });
    }

    // Protect workspace owner from being demoted by non-owners
    if (targetMembership.role === 'owner' && !activeOrg.is_owner && user.id !== targetUserId) {
      return NextResponse.json({ error: 'Only workspace owners can modify owner roles' }, { status: 403 });
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (role && ['admin', 'member'].includes(role)) {
      updates.push('role = ?');
      values.push(role);
    }

    if (department !== undefined) {
      updates.push('department = ?');
      values.push(department.trim());
    }

    if (updates.length > 0) {
      values.push(activeOrg.id, targetUserId);
      await queryRun(
        `UPDATE organisation_members SET ${updates.join(', ')} WHERE organisation_id = ? AND user_id = ?`,
        values
      );

      await logAuditAction({
        organisationId: activeOrg.id,
        userId: user.id,
        actionType: 'Member Role Updated',
        entityType: 'OrganisationMember',
        entityId: targetUserId,
        newValue: `Updated member ${targetUserId} to role ${role || targetMembership.role}`,
      });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to update member: ' + errorMsg }, { status: 500 });
  }
}

// DELETE /api/workspaces/members: Remove a member from the workspace (admin/owner only)
export async function DELETE(req: Request) {
  try {
    const ctx = await getTenantContext();
    if (!ctx || !ctx.activeOrg.is_admin) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }
    const { user, activeOrg } = ctx;

    const { searchParams } = new URL(req.url);
    const targetUserIdStr = searchParams.get('userId');
    if (!targetUserIdStr) {
      return NextResponse.json({ error: 'userId parameter is required' }, { status: 400 });
    }
    const targetUserId = parseInt(targetUserIdStr, 10);

    const targetMembership = await queryFirst<any>(
      'SELECT * FROM organisation_members WHERE organisation_id = ? AND user_id = ?',
      [activeOrg.id, targetUserId]
    );

    if (!targetMembership) {
      return NextResponse.json({ error: 'Member not found in workspace' }, { status: 404 });
    }

    if (targetMembership.role === 'owner') {
      return NextResponse.json({ error: 'Workspace owner cannot be removed. Transfer ownership first.' }, { status: 400 });
    }

    // Remove from organisation_members WITHOUT deleting the global VEYA user account
    await queryRun(
      'DELETE FROM organisation_members WHERE organisation_id = ? AND user_id = ?',
      [activeOrg.id, targetUserId]
    );

    await logAuditAction({
      organisationId: activeOrg.id,
      userId: user.id,
      actionType: 'Member Removed',
      entityType: 'OrganisationMember',
      entityId: targetUserId,
      newValue: `Removed user ${targetUserId} from workspace ${activeOrg.name}`,
    });

    return NextResponse.json({ success: true, message: 'Member removed from workspace' });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to remove member: ' + errorMsg }, { status: 500 });
  }
}
