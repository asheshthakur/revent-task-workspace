import { SignJWT, jwtVerify } from 'jose';
import { cookies, headers } from 'next/headers';
import crypto from 'crypto';
import { queryFirst } from './db';
import { PASSWORD_RESET_AUTHORISED_EMAILS } from './constants';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'revent-work-secure-jwt-key-2026-production-ready'
);

export const COOKIE_NAME = 'revent_auth_token';
export const WORKSPACE_COOKIE_NAME = 'veya_active_org_id';

export interface ActiveOrganisation {
  id: number;
  name: string;
  slug: string;
  logo: string;
  role: 'owner' | 'admin' | 'member';
  department: string;
  is_owner: boolean;
  is_admin: boolean;
}

export interface UserSession {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'employee'; // backward compatibility / organization-specific role mapped
  department: string;
  animal_emoji: string;
  selected_status: string;
  can_reset_other_user_passwords: boolean;
  sessionId?: string;
  activeOrgId?: number;
}

export interface TenantContext {
  user: UserSession;
  activeOrg: ActiveOrganisation;
  allOrgs: ActiveOrganisation[];
}

export async function signToken(payload: UserSession): Promise<string> {
  const nonce = crypto.randomUUID();
  return await new SignJWT({ ...payload, jti: nonce })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setJti(nonce)
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<UserSession | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as UserSession;
  } catch {
    return null;
  }
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Retrieves the currently authenticated user and active organization tenant context.
 * Strictly verifies database session and organization membership.
 */
export async function getTenantContext(): Promise<TenantContext | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const session = await verifyToken(token);
  if (!session) return null;

  const tokenHash = hashToken(token);

  // Validate active session in database (ensure not revoked)
  const dbSession = await queryFirst<any>(
    `SELECT * FROM sessions 
     WHERE session_token_hash = ? AND revoked_at IS NULL AND expires_at > datetime('now')`,
    [tokenHash]
  );

  if (!dbSession) {
    return null;
  }

  // Check user is active
  const user = await queryFirst<any>(
    'SELECT id, name, email, role, department, is_active, animal_emoji, selected_status FROM users WHERE id = ?',
    [session.id]
  );

  if (!user || user.is_active !== 1) {
    return null;
  }

  // Fetch all active organisation memberships for this user
  const memberships = await queryFirst<any[]>(
    `SELECT 
       o.id, 
       o.name, 
       o.slug, 
       o.logo, 
       om.role as member_role, 
       om.department as member_department, 
       om.status as member_status
     FROM organisation_members om
     JOIN organisations o ON om.organisation_id = o.id
     WHERE om.user_id = ? AND om.status = 'active' AND o.is_active = 1
     ORDER BY o.name ASC`,
    [user.id]
  ).then(res => (Array.isArray(res) ? res : [])) as any[];

  // Fallback: If no membership query returned an array, run queryAll safely
  const { queryAll } = await import('./db');
  const userMemberships = await queryAll<any>(
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

  if (!userMemberships || userMemberships.length === 0) {
    return null;
  }

  const allOrgs: ActiveOrganisation[] = userMemberships.map((m) => ({
    id: m.id,
    name: m.name,
    slug: m.slug,
    logo: m.logo || '',
    role: m.member_role,
    department: m.member_department || '',
    is_owner: m.member_role === 'owner',
    is_admin: m.member_role === 'owner' || m.member_role === 'admin',
  }));

  // Determine active organisation
  // Priority:
  // 1. Hostname Subdomain (e.g. acme.veya.com, revent.veya.com)
  // 2. Explicit Cookie 'veya_active_org_id'
  // 3. First organisation in user's memberships
  let activeOrg: ActiveOrganisation | undefined;

  try {
    const reqHeaders = await headers();
    const host = reqHeaders.get('x-forwarded-host') || reqHeaders.get('host') || '';
    const cleanHost = host.split(':')[0].toLowerCase();

    // Check if host is a subdomain of veya.com or custom domain (excluding root & workers.dev)
    if (cleanHost.endsWith('.veya.com')) {
      const sub = cleanHost.replace('.veya.com', '').trim();
      if (sub && sub !== 'www' && sub !== 'app') {
        activeOrg = allOrgs.find((o) => o.slug.toLowerCase() === sub);
      }
    }
  } catch {
    // Ignore header resolution in non-request contexts
  }

  if (!activeOrg) {
    const requestedOrgIdStr = cookieStore.get(WORKSPACE_COOKIE_NAME)?.value;
    if (requestedOrgIdStr) {
      const requestedOrgId = parseInt(requestedOrgIdStr, 10);
      activeOrg = allOrgs.find((o) => o.id === requestedOrgId);
    }
  }

  if (!activeOrg) {
    activeOrg = allOrgs[0];
  }

  const canReset = activeOrg.is_admin || PASSWORD_RESET_AUTHORISED_EMAILS.includes(user.email.toLowerCase());

  const userSession: UserSession = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: activeOrg.is_admin ? 'admin' : 'employee',
    department: activeOrg.department || user.department || '',
    animal_emoji: user.animal_emoji || '🦊',
    selected_status: user.selected_status || 'Online',
    can_reset_other_user_passwords: canReset,
    sessionId: tokenHash,
    activeOrgId: activeOrg.id,
  };

  return {
    user: userSession,
    activeOrg,
    allOrgs,
  };
}

/**
 * Backward-compatible helper returning UserSession.
 * Scopes role and department to active organisation.
 */
export async function getCurrentUser(): Promise<UserSession | null> {
  const ctx = await getTenantContext();
  return ctx ? ctx.user : null;
}

/**
 * Returns the authenticated VEYA global user regardless of workspace membership.
 */
export async function getGlobalUser(): Promise<{ user: UserSession; allOrgs: ActiveOrganisation[] } | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const session = await verifyToken(token);
  if (!session) return null;

  const tokenHash = hashToken(token);

  const dbSession = await queryFirst<any>(
    `SELECT * FROM sessions 
     WHERE session_token_hash = ? AND revoked_at IS NULL AND expires_at > datetime('now')`,
    [tokenHash]
  );
  if (!dbSession) return null;

  const user = await queryFirst<any>(
    'SELECT id, name, email, role, department, is_active, animal_emoji, selected_status FROM users WHERE id = ?',
    [session.id]
  );
  if (!user || user.is_active !== 1) return null;

  const { queryAll } = await import('./db');
  const userMemberships = await queryAll<any>(
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

  const allOrgs: ActiveOrganisation[] = (userMemberships || []).map((m) => ({
    id: m.id,
    name: m.name,
    slug: m.slug,
    logo: m.logo || '',
    role: m.member_role,
    department: m.member_department || '',
    is_owner: m.member_role === 'owner',
    is_admin: m.member_role === 'owner' || m.member_role === 'admin',
  }));

  const userSession: UserSession = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: 'employee',
    department: user.department || '',
    animal_emoji: user.animal_emoji || '🦊',
    selected_status: user.selected_status || 'Online',
    can_reset_other_user_passwords: false,
    sessionId: tokenHash,
  };

  return { user: userSession, allOrgs };
}
