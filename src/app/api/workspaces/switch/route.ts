import { NextResponse } from "next/server";
import { getTenantContext, WORKSPACE_COOKIE_NAME } from "@/lib/auth";
import { queryFirst, logAuditAction } from "@/lib/db";

// POST /api/workspaces/switch: Switch active workspace
export async function POST(req: Request) {
  try {
    const ctx = await getTenantContext();
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { user, allOrgs } = ctx;

    const body = await req.json();
    const { organisationId } = body;

    const targetOrgId = parseInt(organisationId, 10);
    if (isNaN(targetOrgId)) {
      return NextResponse.json({ error: "Invalid organization ID" }, { status: 400 });
    }

    // Verify user is an active member of this target organization
    const targetOrg = allOrgs.find((o) => o.id === targetOrgId);
    if (!targetOrg) {
      // Query database directly as double-check
      const member = await queryFirst<any>(
        "SELECT om.*, o.name, o.slug, o.logo FROM organisation_members om JOIN organisations o ON om.organisation_id = o.id WHERE om.organisation_id = ? AND om.user_id = ? AND om.status = 'active' AND o.is_active = 1",
        [targetOrgId, user.id]
      );
      if (!member) {
        return NextResponse.json({ error: "Forbidden: You are not a member of this workspace" }, { status: 403 });
      }
    }

    const orgRecord = targetOrg || await queryFirst<any>("SELECT * FROM organisations WHERE id = ?", [targetOrgId]);

    await logAuditAction({
      organisationId: targetOrgId,
      userId: user.id,
      actionType: "Workspace Switched",
      entityType: "Organisation",
      entityId: targetOrgId,
      entityTitle: orgRecord?.name || "Workspace",
      newValue: "Switched active workspace to " + (orgRecord?.name || targetOrgId),
    });

    const response = NextResponse.json({
      success: true,
      activeOrgId: targetOrgId,
      activeOrg: orgRecord,
    });

    response.cookies.set(WORKSPACE_COOKIE_NAME, String(targetOrgId), {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: "Failed to switch workspace: " + errorMsg }, { status: 500 });
  }
}
