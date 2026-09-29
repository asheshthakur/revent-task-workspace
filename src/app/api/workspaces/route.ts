import { NextResponse } from "next/server";
import { getTenantContext, WORKSPACE_COOKIE_NAME } from "@/lib/auth";
import { queryFirst, queryAll, queryRun, logAuditAction } from "@/lib/db";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// GET /api/workspaces: List all workspaces current user belongs to
export async function GET() {
  try {
    const ctx = await getTenantContext();
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({
      activeOrg: ctx.activeOrg,
      organisations: ctx.allOrgs,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: "Failed to fetch workspaces: " + errorMsg }, { status: 500 });
  }
}

// POST /api/workspaces: Create a new organization/workspace
export async function POST(req: Request) {
  try {
    const ctx = await getTenantContext();
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { user } = ctx;

    const { name, department } = await req.json();
    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Workspace name is required" }, { status: 400 });
    }

    const cleanName = name.trim();
    let baseSlug = slugify(cleanName);
    if (!baseSlug) baseSlug = "workspace";

    let uniqueSlug = baseSlug;
    let counter = 1;
    while (true) {
      const existing = await queryFirst<any>("SELECT id FROM organisations WHERE slug = ?", [uniqueSlug]);
      if (!existing) break;
      uniqueSlug = baseSlug + "-" + counter;
      counter++;
    }

    const now = new Date().toISOString();

    // 1. Create organisation
    const orgResult = await queryRun(
      "INSERT INTO organisations (name, slug, logo, created_by_user_id, is_active, created_at, updated_at) VALUES (?, ?, '', ?, 1, ?, ?)",
      [cleanName, uniqueSlug, user.id, now, now]
    );

    const newOrgId = Number(orgResult.lastInsertRowid);

    // 2. Add creator as owner
    await queryRun(
      "INSERT INTO organisation_members (organisation_id, user_id, role, status, department, joined_at, created_at) VALUES (?, ?, 'owner', 'active', ?, ?, ?)",
      [newOrgId, user.id, department ? department.trim() : "Leadership", now, now]
    );

    await logAuditAction({
      organisationId: newOrgId,
      userId: user.id,
      actionType: "Workspace Created",
      entityType: "Organisation",
      entityId: newOrgId,
      entityTitle: cleanName,
      newValue: "Created new workspace " + cleanName + " (" + uniqueSlug + ")",
    });

    const newOrg = {
      id: newOrgId,
      name: cleanName,
      slug: uniqueSlug,
      logo: "",
      role: "owner",
      department: department ? department.trim() : "Leadership",
      is_owner: true,
      is_admin: true,
    };

    const response = NextResponse.json({
      success: true,
      organisation: newOrg,
    });

    // Set active workspace cookie to this new workspace
    response.cookies.set(WORKSPACE_COOKIE_NAME, String(newOrgId), {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: "Failed to create workspace: " + errorMsg }, { status: 500 });
  }
}
