import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { queryFirst, queryRun, logAuditAction } from '@/lib/db';
import { signToken, hashToken, COOKIE_NAME } from '@/lib/auth';
import { PASSWORD_RESET_AUTHORISED_EMAILS } from '@/lib/constants';

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();

    const user = await queryFirst<any>(
      'SELECT * FROM users WHERE LOWER(email) = ?',
      [cleanEmail]
    );

    if (!user) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    if (user.is_active !== 1) {
      return NextResponse.json(
        { error: 'This employee account has been deactivated. Please contact your administrator.' },
        { status: 403 }
      );
    }

    const isValid = bcrypt.compareSync(password, user.password_hash);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    // Fetch user active organisation memberships
    const { queryAll } = await import('@/lib/db');
    const memberships = await queryAll<any>(
      `SELECT 
         o.id, 
         o.name, 
         o.slug, 
         o.logo, 
         om.role as member_role, 
         om.department as member_department
       FROM organisation_members om
       JOIN organisations o ON om.organisation_id = o.id
       WHERE om.user_id = ? AND om.status = 'active' AND o.is_active = 1
       ORDER BY o.id ASC`,
      [user.id]
    );

    const activeOrg = memberships && memberships.length > 0 ? memberships[0] : null;

    const canReset = activeOrg 
      ? (activeOrg.member_role === 'owner' || activeOrg.member_role === 'admin')
      : (user.role === 'admin' || PASSWORD_RESET_AUTHORISED_EMAILS.includes(user.email.toLowerCase()));

    const sessionData = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: activeOrg && (activeOrg.member_role === 'owner' || activeOrg.member_role === 'admin') ? 'admin' : 'employee',
      department: activeOrg?.member_department || user.department || '',
      animal_emoji: user.animal_emoji || '🦊',
      selected_status: user.selected_status || 'Online',
      can_reset_other_user_passwords: canReset,
      activeOrgId: activeOrg?.id,
    };

    const token = await signToken(sessionData as any);
    const tokenHash = hashToken(token);

    const now = new Date();
    const nowIso = now.toISOString();
    const expiresIso = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

    // Insert server-side session
    await queryRun(
      `INSERT INTO sessions (user_id, session_token_hash, created_at, last_heartbeat_at, expires_at, revoked_at)
       VALUES (?, ?, ?, ?, ?, NULL)`,
      [user.id, tokenHash, nowIso, nowIso, expiresIso]
    );

    // Update last_login_at
    await queryRun('UPDATE users SET last_login_at = ? WHERE id = ?', [nowIso, user.id]);

    await logAuditAction({
      userId: user.id,
      organisationId: activeOrg?.id || 1,
      actionType: 'User Login',
      entityType: 'User',
      entityId: user.id,
      entityTitle: user.name,
      newValue: `Logged in to ${activeOrg?.name || 'Workspace'}`,
    });

    const response = NextResponse.json({
      success: true,
      user: sessionData,
      activeOrg,
      organisationsCount: memberships.length,
      organisations: memberships,
    });

    const isProductionHttps = process.env.NODE_ENV === 'production';

    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: isProductionHttps,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    if (activeOrg) {
      response.cookies.set('veya_active_org_id', String(activeOrg.id), {
        httpOnly: false, // accessible to client for instant switcher sync
        secure: isProductionHttps,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
      });
    }

    return response;
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: 'Authentication failed: ' + errorMsg }, { status: 500 });
  }
}
