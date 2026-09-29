import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getTenantContext } from '@/lib/auth';
import { queryFirst, queryRun, logAuditAction } from '@/lib/db';
import { PASSWORD_RESET_AUTHORISED_EMAILS } from '@/lib/constants';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getTenantContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { user: currentUser, activeOrg } = ctx;

    const { id } = await params;
    const empId = parseInt(id, 10);
    if (isNaN(empId)) {
      return NextResponse.json({ error: 'Invalid employee ID' }, { status: 400 });
    }

    // Verify target employee is a member of the active organization
    const memberRecord = await queryFirst<any>(
      `SELECT om.*, u.name, u.email, u.is_active 
       FROM organisation_members om
       JOIN users u ON om.user_id = u.id
       WHERE om.organisation_id = ? AND om.user_id = ?`,
      [activeOrg.id, empId]
    );

    if (!memberRecord) {
      return NextResponse.json({ error: 'Employee not found in this organization' }, { status: 404 });
    }
    const existing = memberRecord;

    const body = await req.json();
    const now = new Date().toISOString();

    const isAuthorizedForPasswordReset =
      activeOrg.is_admin ||
      PASSWORD_RESET_AUTHORISED_EMAILS.includes(currentUser.email.toLowerCase());

    const isAdmin = activeOrg.is_admin;

    // If body contains new_password
    if (body.new_password) {
      if (!isAuthorizedForPasswordReset) {
        return NextResponse.json(
          { error: 'Forbidden: You are not authorized to reset employee passwords' },
          { status: 403 }
        );
      }

      if (body.new_password.length < 6) {
        return NextResponse.json(
          { error: 'Password must be at least 6 characters long' },
          { status: 400 }
        );
      }

      const hash = bcrypt.hashSync(body.new_password, 10);

      // Invalidate all active sessions for this affected user so they must log in again
      await queryRun(
        `UPDATE sessions 
         SET revoked_at = ? 
         WHERE user_id = ? AND revoked_at IS NULL`,
        [now, empId]
      );

      // If user also wanted animal_emoji or details updated
      const emojiUpdate = body.animal_emoji ? ', animal_emoji = ?' : '';
      const paramsList: any[] = [hash, now];
      if (body.animal_emoji) paramsList.push(body.animal_emoji);
      paramsList.push(empId);

      await queryRun(
        `UPDATE users 
         SET password_hash = ?, updated_at = ? ${emojiUpdate}
         WHERE id = ?`,
        paramsList
      );

      await logAuditAction({
        userId: currentUser.id,
        actionType: 'Password Reset',
        entityType: 'User',
        entityId: empId,
        entityTitle: existing.name,
        newValue: `Password reset by ${currentUser.name} (${currentUser.email}) - forced re-login`,
      });

      const updatedUser = await queryFirst<any>(
        'SELECT id, name, email, role, department, animal_emoji, is_active, updated_at FROM users WHERE id = ?',
        [empId]
      );
      return NextResponse.json({ success: true, employee: updatedUser });
    }

    // Other management operations require admin role
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden: Admin access required to edit employee details' }, { status: 403 });
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (body.name !== undefined) {
      updates.push('name = ?');
      values.push(body.name.trim());
      await logAuditAction({
        userId: currentUser.id,
        actionType: 'Employee Updated',
        entityType: 'User',
        entityId: empId,
        entityTitle: existing.name,
        oldValue: `Name: ${existing.name}`,
        newValue: `Name: ${body.name.trim()}`,
      });
    }

    if (body.email !== undefined) {
      const cleanEmail = body.email.trim().toLowerCase();
      const dup = await queryFirst<any>('SELECT id FROM users WHERE LOWER(email) = ? AND id != ?', [cleanEmail, empId]);
      if (dup) {
        return NextResponse.json({ error: 'Email is already used by another employee' }, { status: 409 });
      }
      updates.push('email = ?');
      values.push(cleanEmail);
    }

    if (body.department !== undefined) {
      updates.push('department = ?');
      values.push(body.department.trim());
    }

    if (body.role !== undefined && (body.role === 'admin' || body.role === 'employee')) {
      updates.push('role = ?');
      values.push(body.role);
    }

    if (body.animal_emoji !== undefined) {
      updates.push('animal_emoji = ?');
      values.push(body.animal_emoji);
    }

    if (body.is_active !== undefined) {
      const activeVal = body.is_active ? 1 : 0;
      if (empId === currentUser.id && activeVal === 0) {
        return NextResponse.json({ error: 'You cannot deactivate your own admin account' }, { status: 400 });
      }
      updates.push('is_active = ?');
      values.push(activeVal);

      // If deactivating, revoke all active sessions immediately
      if (activeVal === 0) {
        await queryRun('UPDATE sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL', [now, empId]);
      }

      await logAuditAction({
        userId: currentUser.id,
        actionType: activeVal === 1 ? 'Employee Reactivated' : 'Employee Deactivated',
        entityType: 'User',
        entityId: empId,
        entityTitle: existing.name,
        oldValue: existing.is_active === 1 ? 'Active' : 'Inactive',
        newValue: activeVal === 1 ? 'Active' : 'Inactive',
      });
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    updates.push('updated_at = ?');
    values.push(now);
    values.push(empId);

    const query = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
    await queryRun(query, values);

    const updatedUser = await queryFirst<any>(
      'SELECT id, name, email, role, department, animal_emoji, is_active, updated_at FROM users WHERE id = ?',
      [empId]
    );

    return NextResponse.json({ success: true, employee: updatedUser });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to update employee: ' + errorMsg }, { status: 500 });
  }
}
