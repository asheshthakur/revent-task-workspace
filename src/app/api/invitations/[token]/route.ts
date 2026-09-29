import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { queryFirst, queryRun, logAuditAction } from "@/lib/db";
import { signToken, hashToken, COOKIE_NAME, WORKSPACE_COOKIE_NAME } from "@/lib/auth";

interface Context {
  params: Promise<{ token: string }>;
}

// GET /api/invitations/[token]: Get invitation metadata for display
export async function GET(req: Request, context: Context) {
  try {
    const { token } = await context.params;
    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    const invitation = await queryFirst<any>(
      "SELECT i.*, o.name as organisation_name, o.slug as organisation_slug, u.name as invited_by_name FROM organisation_invitations i JOIN organisations o ON i.organisation_id = o.id LEFT JOIN users u ON i.invited_by_user_id = u.id WHERE i.token = ?",
      [token]
    );

    if (!invitation) {
      return NextResponse.json({ error: "Invalid invitation token" }, { status: 404 });
    }

    const nowIso = new Date().toISOString();
    if (invitation.status !== "pending" || invitation.expires_at < nowIso) {
      return NextResponse.json({ error: "This invitation has expired or has already been used" }, { status: 410 });
    }

    // Check if user already exists
    const existingUser = await queryFirst<any>("SELECT id, name, email FROM users WHERE LOWER(email) = ?", [invitation.email.toLowerCase()]);

    return NextResponse.json({
      valid: true,
      email: invitation.email,
      role: invitation.role,
      organisationName: invitation.organisation_name,
      organisationSlug: invitation.organisation_slug,
      invitedByName: invitation.invited_by_name,
      userExists: !!existingUser,
      existingUserName: existingUser?.name,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: "Failed to verify invitation: " + errorMsg }, { status: 500 });
  }
}

// POST /api/invitations/[token]: Accept invitation and join workspace
export async function POST(req: Request, context: Context) {
  try {
    const { token } = await context.params;
    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    const invitation = await queryFirst<any>(
      "SELECT i.*, o.name as organisation_name, o.slug as organisation_slug FROM organisation_invitations i JOIN organisations o ON i.organisation_id = o.id WHERE i.token = ?",
      [token]
    );

    if (!invitation) {
      return NextResponse.json({ error: "Invalid invitation token" }, { status: 404 });
    }

    const now = new Date();
    const nowIso = now.toISOString();

    if (invitation.status !== "pending" || invitation.expires_at < nowIso) {
      return NextResponse.json({ error: "This invitation has expired or has already been used" }, { status: 410 });
    }

    const body = await req.json().catch(() => ({}));
    const { name, password } = body;

    const cleanEmail = invitation.email.toLowerCase().trim();
    let user = await queryFirst<any>("SELECT * FROM users WHERE LOWER(email) = ?", [cleanEmail]);

    if (!user) {
      // New user creating account through invitation
      if (!name || !password) {
        return NextResponse.json({ error: "Name and password are required to create your account" }, { status: 400 });
      }
      if (password.length < 6) {
        return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
      }

      const passwordHash = bcrypt.hashSync(password, 10);
      const userRes = await queryRun(
        "INSERT INTO users (name, email, password_hash, role, department, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, '', 1, ?, ?)",
        [name.trim(), cleanEmail, passwordHash, invitation.role === "admin" ? "admin" : "employee", nowIso, nowIso]
      );
      user = {
        id: Number(userRes.lastInsertRowid),
        name: name.trim(),
        email: cleanEmail,
        role: invitation.role === "admin" ? "admin" : "employee",
        is_active: 1,
      };
    }

    // Add user as member to the target organization
    await queryRun(
      "INSERT OR IGNORE INTO organisation_members (organisation_id, user_id, role, status, department, joined_at, created_at) VALUES (?, ?, ?, 'active', '', ?, ?)",
      [invitation.organisation_id, user.id, invitation.role, nowIso, nowIso]
    );

    // Mark invitation as accepted
    await queryRun(
      "UPDATE organisation_invitations SET status = 'accepted' WHERE id = ?",
      [invitation.id]
    );

    await logAuditAction({
      organisationId: invitation.organisation_id,
      userId: user.id,
      actionType: "Invitation Accepted",
      entityType: "Invitation",
      entityId: invitation.id,
      entityTitle: user.name,
      newValue: "Joined " + invitation.organisation_name + " as " + invitation.role,
    });

    // Create session so user is logged in directly to the new workspace
    const sessionData = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: invitation.role === "admin" ? "admin" : "employee",
      department: user.department || "",
      animal_emoji: user.animal_emoji || "🦊",
      selected_status: "Online",
      can_reset_other_user_passwords: invitation.role === "admin",
      activeOrgId: invitation.organisation_id,
    };

    const jwtToken = await signToken(sessionData as any);
    const tokenHash = hashToken(jwtToken);
    const expiresIso = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

    await queryRun(
      "INSERT INTO sessions (user_id, session_token_hash, created_at, last_heartbeat_at, expires_at, revoked_at) VALUES (?, ?, ?, ?, ?, NULL)",
      [user.id, tokenHash, nowIso, nowIso, expiresIso]
    );

    const response = NextResponse.json({
      success: true,
      user: sessionData,
      organisation: {
        id: invitation.organisation_id,
        name: invitation.organisation_name,
        slug: invitation.organisation_slug,
      },
    });

    const isProductionHttps = process.env.NODE_ENV === "production";

    response.cookies.set(COOKIE_NAME, jwtToken, {
      httpOnly: true,
      secure: isProductionHttps,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    response.cookies.set(WORKSPACE_COOKIE_NAME, String(invitation.organisation_id), {
      httpOnly: false,
      secure: isProductionHttps,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: "Failed to accept invitation: " + errorMsg }, { status: 500 });
  }
}
