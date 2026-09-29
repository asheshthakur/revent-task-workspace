import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { COOKIE_NAME, hashToken, verifyToken } from '@/lib/auth';
import { queryRun, logAuditAction } from '@/lib/db';

export async function POST() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;

    if (token) {
      const session = await verifyToken(token);
      const tokenHash = hashToken(token);
      const nowIso = new Date().toISOString();

      // Revoke database session immediately
      await queryRun(
        `UPDATE sessions 
         SET revoked_at = ? 
         WHERE session_token_hash = ?`,
        [nowIso, tokenHash]
      );

      if (session) {
        await logAuditAction({
          userId: session.id,
          actionType: 'User Logout',
          entityType: 'User',
          entityId: session.id,
          entityTitle: session.name,
          newValue: 'Session terminated and revoked',
        });
      }
    }

    const response = NextResponse.json({ success: true, message: 'Logged out successfully' });
    response.cookies.set(COOKIE_NAME, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });
    return response;
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: 'Logout failed: ' + errorMsg }, { status: 500 });
  }
}
