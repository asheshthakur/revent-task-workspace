import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { queryFirst, queryRun } from '@/lib/db';
import { signToken, hashToken, COOKIE_NAME } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const { name, email, password, termsAccepted } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email, and password are required' }, { status: 400 });
    }

    if (!termsAccepted) {
      return NextResponse.json({
        error: 'You must agree to the VEYA Terms of Service and acknowledge the Privacy Policy to create an account.',
      }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters long' }, { status: 400 });
    }

    // Check if email already exists
    const existing = await queryFirst<any>(
      'SELECT id FROM users WHERE LOWER(email) = ?',
      [cleanEmail]
    );

    if (existing) {
      return NextResponse.json({ error: 'An account with this email already exists. Please sign in.' }, { status: 409 });
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    const now = new Date();
    const nowIso = now.toISOString();

    // Default animal emojis for user profile avatars
    const emojis = ['🦊', '🦁', '🐯', '🐻', '🐼', '🐨', '🦅', '🦉', '🐺', '🐬'];
    const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];

    // Create global VEYA user
    const userResult = await queryRun(
      `INSERT INTO users (name, email, password_hash, role, department, animal_emoji, selected_status, is_active, created_at, updated_at, last_login_at)
       VALUES (?, ?, ?, 'employee', '', ?, 'Online', 1, ?, ?, ?)`,
      [cleanName, cleanEmail, passwordHash, randomEmoji, nowIso, nowIso, nowIso]
    );

    const userId = Number(userResult.lastInsertRowid);

    const sessionData = {
      id: userId,
      name: cleanName,
      email: cleanEmail,
      role: 'employee' as const,
      department: '',
      animal_emoji: randomEmoji,
      selected_status: 'Online',
      can_reset_other_user_passwords: false,
    };

    const token = await signToken(sessionData as any);
    const tokenHash = hashToken(token);
    const expiresIso = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

    // Insert server session
    await queryRun(
      `INSERT INTO sessions (user_id, session_token_hash, created_at, last_heartbeat_at, expires_at, revoked_at)
       VALUES (?, ?, ?, ?, ?, NULL)`,
      [userId, tokenHash, nowIso, nowIso, expiresIso]
    );

    // Record immutable legal acceptance for Terms of Service and Privacy Policy
    try {
      const forwardedFor = req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for') || null;
      const ipAddress = forwardedFor ? forwardedFor.split(',')[0].trim() : null;
      const userAgent = (req.headers.get('user-agent') || 'Unknown').slice(0, 255);

      await queryRun(
        `INSERT INTO legal_acceptances (user_id, organisation_id, document_type, document_version, acceptance_type, ip_address, user_agent, accepted_at)
         VALUES (?, NULL, 'TERMS_OF_SERVICE', '1.0', 'SIGNUP_CHECKBOX', ?, ?, ?)`,
        [userId, ipAddress, userAgent, nowIso]
      );
      await queryRun(
        `INSERT INTO legal_acceptances (user_id, organisation_id, document_type, document_version, acceptance_type, ip_address, user_agent, accepted_at)
         VALUES (?, NULL, 'PRIVACY_POLICY', '1.0', 'SIGNUP_CHECKBOX', ?, ?, ?)`,
        [userId, ipAddress, userAgent, nowIso]
      );
    } catch (legalAuditErr) {
      console.error('Legal acceptance record failed:', legalAuditErr);
    }

    // Trigger Welcome Email (Outbound Relay)
    // Only after account creation and session creation have succeeded
    try {
      const { sendWelcomeEmail } = await import('@/lib/email');
      const firstName = cleanName.split(' ')[0] || cleanName;
      const emailResult = await sendWelcomeEmail(cleanEmail, firstName);

      if (emailResult.success) {
        await queryRun(
          'UPDATE users SET welcome_email_sent_at = ? WHERE id = ?',
          [new Date().toISOString(), userId]
        );
      }
    } catch (emailErr) {
      // Delivery failure does NOT void account creation
      console.error('Welcome email dispatch failed:', emailErr);
    }

    const response = NextResponse.json({
      success: true,
      user: sessionData,
      message: 'VEYA account created successfully',
    });

    const isProductionHttps = process.env.NODE_ENV === 'production';
    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: isProductionHttps,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: 'Registration failed: ' + errorMsg }, { status: 500 });
  }
}
