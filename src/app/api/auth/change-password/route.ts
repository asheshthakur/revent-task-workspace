import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getCurrentUser } from '@/lib/auth';
import { queryFirst, queryRun, logAuditAction } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { currentPassword, newPassword, confirmNewPassword } = await req.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Current password and new password are required' }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'New password must be at least 6 characters long' }, { status: 400 });
    }

    if (confirmNewPassword && newPassword !== confirmNewPassword) {
      return NextResponse.json({ error: 'New passwords do not match' }, { status: 400 });
    }

    const dbUser = await queryFirst<any>('SELECT id, name, email, password_hash FROM users WHERE id = ?', [user.id]);
    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const isValid = bcrypt.compareSync(currentPassword, dbUser.password_hash);
    if (!isValid) {
      return NextResponse.json({ error: 'Incorrect current password' }, { status: 400 });
    }

    const newHash = bcrypt.hashSync(newPassword, 10);
    const now = new Date().toISOString();

    await queryRun('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?', [newHash, now, user.id]);

    await logAuditAction({
      userId: user.id,
      actionType: 'Password Changed',
      entityType: 'User',
      entityId: user.id,
      entityTitle: user.name,
      newValue: 'User self-service password update',
    });

    return NextResponse.json({ success: true, message: 'Password updated successfully' });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to update password: ' + errorMsg }, { status: 500 });
  }
}
