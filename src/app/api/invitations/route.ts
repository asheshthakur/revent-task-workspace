import { NextResponse } from "next/server";
import crypto from "crypto";
import { getTenantContext } from "@/lib/auth";
import { queryFirst, queryAll, queryRun, logAuditAction } from "@/lib/db";

// GET /api/invitations: List active invitations for active organisation
export async function GET() {
  try {
    const ctx = await getTenantContext();
    if (!ctx || !ctx.activeOrg.is_admin) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }
    const { activeOrg } = ctx;

    const invitations = await queryAll(
      "SELECT i.*, u.name as invited_by_name FROM organisation_invitations i LEFT JOIN users u ON i.invited_by_user_id = u.id WHERE i.organisation_id = ? ORDER BY i.created_at DESC",
      [activeOrg.id]
    );

    return NextResponse.json({ invitations });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: "Failed to fetch invitations: " + errorMsg }, { status: 500 });
  }
}

// POST /api/invitations: Create a new invitation link
export async function POST(req: Request) {
  try {
    const ctx = await getTenantContext();
    if (!ctx || !ctx.activeOrg.is_admin) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }
    const { user, activeOrg } = ctx;

    const { email, role = "member" } = await req.json();
    if (!email || !email.trim()) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check if user is already an active member of this organisation
    const existingMember = await queryFirst<any>(
      "SELECT om.id FROM organisation_members om JOIN users u ON om.user_id = u.id WHERE om.organisation_id = ? AND LOWER(u.email) = ? AND om.status = 'active'",
      [activeOrg.id, cleanEmail]
    );

    if (existingMember) {
      return NextResponse.json({ error: "This user is already a member of this workspace" }, { status: 409 });
    }

    // Generate cryptographic secure token
    const token = crypto.randomBytes(24).toString("hex");
    const now = new Date();
    const nowIso = now.toISOString();
    // 7 days expiration
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

    await queryRun(
      "INSERT INTO organisation_invitations (organisation_id, email, role, token, invited_by_user_id, status, expires_at, created_at) VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)",
      [activeOrg.id, cleanEmail, role === "admin" ? "admin" : "member", token, user.id, expiresAt, nowIso]
    );

    await logAuditAction({
      organisationId: activeOrg.id,
      userId: user.id,
      actionType: "Invitation Created",
      entityType: "Invitation",
      entityTitle: cleanEmail,
      newValue: "Invited " + cleanEmail + " as " + role,
    });

    const inviteUrl = "/invite/" + token;

    return NextResponse.json({
      success: true,
      token,
      inviteUrl,
      invitation: {
        email: cleanEmail,
        role,
        token,
        expires_at: expiresAt,
      },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: "Failed to create invitation: " + errorMsg }, { status: 500 });
  }
}
