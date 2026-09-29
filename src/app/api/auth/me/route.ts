import { NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth';

export async function GET() {
  try {
    const ctx = await getTenantContext();
    if (!ctx) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }
    return NextResponse.json({
      authenticated: true,
      user: ctx.user,
      activeOrg: ctx.activeOrg,
      allOrgs: ctx.allOrgs,
    });
  } catch {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}
