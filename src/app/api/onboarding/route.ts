import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { queryFirst, queryRun, logAuditAction } from "@/lib/db";
import { signToken, hashToken, COOKIE_NAME, WORKSPACE_COOKIE_NAME } from "@/lib/auth";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// POST /api/onboarding: Create a new company/workspace along with owner account
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const companyName = body.companyName || body.organisationName;
    const workspaceName = body.workspaceName || body.workspaceSlug;
    const { fullName, email, password } = body;

    if (!companyName || !fullName || !email || !password) {
      return NextResponse.json({ error: "Company name, full name, email, and password are required" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters long" }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const now = new Date();
    const nowIso = now.toISOString();

    // Check if user already exists
    let user = await queryFirst<any>("SELECT * FROM users WHERE LOWER(email) = ?", [cleanEmail]);

    if (!user) {
      const passwordHash = bcrypt.hashSync(password, 10);
      const userRes = await queryRun(
        "INSERT INTO users (name, email, password_hash, role, department, animal_emoji, selected_status, is_active, created_at, updated_at) VALUES (?, ?, ?, 'admin', 'Executive', '🦊', 'Online', 1, ?, ?)",
        [fullName.trim(), cleanEmail, passwordHash, nowIso, nowIso]
      );
      user = {
        id: Number(userRes.lastInsertRowid),
        name: fullName.trim(),
        email: cleanEmail,
        role: "admin",
        department: "Executive",
        animal_emoji: "🦊",
        selected_status: "Online",
        is_active: 1,
      };
    } else {
      // If user exists, verify password
      const isValid = bcrypt.compareSync(password, user.password_hash);
      if (!isValid) {
        return NextResponse.json({ error: "An account with this email already exists with a different password." }, { status: 409 });
      }
    }

    // Slugify organisation name
    const orgDisplayName = workspaceName ? workspaceName.trim() : companyName.trim();
    const baseSlug = slugify(orgDisplayName) || "workspace";

    let uniqueSlug = baseSlug;
    let counter = 1;
    while (true) {
      const existingSlug = await queryFirst<any>("SELECT id FROM organisations WHERE slug = ?", [uniqueSlug]);
      if (!existingSlug) break;
      uniqueSlug = baseSlug + "-" + counter;
      counter++;
    }

    // Create organisation
    const orgRes = await queryRun(
      "INSERT INTO organisations (name, slug, logo, created_by_user_id, is_active, created_at, updated_at) VALUES (?, ?, '', ?, 1, ?, ?)",
      [orgDisplayName, uniqueSlug, user.id, nowIso, nowIso]
    );

    const orgId = Number(orgRes.lastInsertRowid);

    // Add user as owner in organisation_members
    await queryRun(
      "INSERT INTO organisation_members (organisation_id, user_id, role, status, department, joined_at, created_at) VALUES (?, ?, 'owner', 'active', 'Leadership', ?, ?)",
      [orgId, user.id, nowIso, nowIso]
    );

    await logAuditAction({
      organisationId: orgId,
      userId: user.id,
      actionType: "Workspace Created",
      entityType: "Organisation",
      entityId: orgId,
      entityTitle: orgDisplayName,
      newValue: "Organization and owner onboarding completed",
    });

    const sessionData = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: "admin",
      department: "Leadership",
      animal_emoji: user.animal_emoji || "🦊",
      selected_status: "Online",
      can_reset_other_user_passwords: true,
      activeOrgId: orgId,
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
        id: orgId,
        name: orgDisplayName,
        slug: uniqueSlug,
        role: "owner",
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

    response.cookies.set(WORKSPACE_COOKIE_NAME, String(orgId), {
      httpOnly: false,
      secure: isProductionHttps,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: "Onboarding failed: " + errorMsg }, { status: 500 });
  }
}
