import { NextResponse } from 'next/server';
import { getTenantContext, getGlobalUser } from '@/lib/auth';

export async function GET() {
  try {
    const ctx = await getTenantContext();
    if (ctx) {
      return NextResponse.json({
        authenticated: true,
        user: ctx.user,
        activeOrg: ctx.activeOrg,
        allOrgs: ctx.allOrgs,
      });
    }

    // Check if user has a valid global account but 0 workspace memberships
    const globalData = await getGlobalUser();
    if (globalData) {
      return NextResponse.json({
        authenticated: true,
        user: globalData.user,
        activeOrg: null,
        allOrgs: globalData.allOrgs,
        hasNoWorkspace: true,
      });
    }

    return NextResponse.json({ authenticated: false }, { status: 401 });
  } catch {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}
