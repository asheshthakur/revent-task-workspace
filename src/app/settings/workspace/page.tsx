'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Users, Mail, Shield, UserPlus, Trash2, CheckCircle2, AlertCircle, Loader2, Globe, Copy, Check } from 'lucide-react';
import { AppLayout } from '@/components/AppLayout';
import { CommercialWorkspaceCard } from '@/components/legal/CommercialWorkspaceCard';

interface WorkspaceMember {
  membership_id: number;
  user_id: number;
  name: string;
  email: string;
  role: 'owner' | 'admin' | 'manager' | 'member' | 'guest';
  department: string;
  joined_at: string;
  animal_emoji: string;
  selected_status: string;
  is_active: number;
}

export default function WorkspaceSettingsPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeOrg, setActiveOrg] = useState<any>(null);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [loading, setLoading] = useState(true);

  // Invite modal / state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'manager' | 'member' | 'guest'>('member');
  const [isInviting, setIsInviting] = useState(false);
  const [inviteResult, setInviteResult] = useState<{ url: string; token: string } | null>(null);
  const [inviteError, setInviteError] = useState('');
  const [copied, setCopied] = useState(false);

  // Owner transfer modal state
  const [transferTargetUser, setTransferTargetUser] = useState<WorkspaceMember | null>(null);
  const [transferConfirmText, setTransferConfirmText] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);

  // Role update state
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const authRes = await fetch('/api/auth/me');
      if (!authRes.ok) {
        router.push('/login');
        return;
      }
      const authData = await authRes.json();
      if (!authData.authenticated || !authData.activeOrg) {
        router.push('/workspaces/find');
        return;
      }

      setCurrentUser(authData.user);
      setActiveOrg(authData.activeOrg);

      const memRes = await fetch('/api/workspaces/members');
      if (memRes.ok) {
        const memData = await memRes.json();
        setMembers(memData.members || []);
      }
    } catch {
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [router]);

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setIsInviting(true);
    setInviteError('');
    setInviteResult(null);

    try {
      const res = await fetch('/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail.trim(),
          role: inviteRole,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create invitation');
      }

      const fullUrl = `${window.location.origin}/invite/${data.token}`;
      setInviteResult({ url: fullUrl, token: data.token });
      setInviteEmail('');
    } catch (err: unknown) {
      setInviteError(err instanceof Error ? err.message : 'Error sending invitation');
    } finally {
      setIsInviting(false);
    }
  };

  const handleCopyInviteLink = () => {
    if (!inviteResult) return;
    navigator.clipboard.writeText(inviteResult.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleRoleChange = async (targetUserId: number, newRole: 'admin' | 'manager' | 'member' | 'guest') => {
    setActionError('');
    setActionSuccess('');

    try {
      const res = await fetch('/api/workspaces/members', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId, role: newRole }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update member role');
      }

      setActionSuccess('Member role updated successfully');
      setMembers((prev) =>
        prev.map((m) => (m.user_id === targetUserId ? { ...m, role: newRole } : m))
      );
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to update role');
    }
  };

  const handleTransferOwnership = async () => {
    if (!transferTargetUser) return;
    if (transferConfirmText !== 'TRANSFER') {
      setActionError('Please type TRANSFER to confirm ownership transfer');
      return;
    }

    setIsTransferring(true);
    setActionError('');
    setActionSuccess('');

    try {
      const res = await fetch('/api/workspaces/members', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'transfer_owner',
          targetUserId: transferTargetUser.user_id,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to transfer ownership');
      }

      setActionSuccess(`Ownership successfully transferred to ${transferTargetUser.name}. You are now an Admin.`);
      setTransferTargetUser(null);
      setTransferConfirmText('');
      await loadData();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to transfer ownership');
    } finally {
      setIsTransferring(false);
    }
  };

  const handleRemoveMember = async (targetUserId: number, name: string) => {
    if (!confirm(`Are you sure you want to remove ${name} from ${activeOrg?.name}? Their global VEYA account will not be deleted.`)) {
      return;
    }

    setActionError('');
    setActionSuccess('');

    try {
      const res = await fetch(`/api/workspaces/members?userId=${targetUserId}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to remove member');
      }

      setActionSuccess(`${name} was removed from the workspace`);
      setMembers((prev) => prev.filter((m) => m.user_id !== targetUserId));
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to remove member');
    }
  };

  if (loading || !currentUser || !activeOrg) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isWorkspaceAdmin = activeOrg.is_admin || activeOrg.is_owner;

  return (
    <AppLayout user={currentUser}>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <Building2 className="w-6 h-6 text-indigo-600" />
                <span>Workspace Settings: {activeOrg.name}</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Manage your organization profile, team members, roles, and invitation links.
              </p>
            </div>
            <span className="px-3 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold uppercase tracking-wider">
              {activeOrg.role}
            </span>
          </div>
        </div>

        {actionSuccess && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
        )}

        {actionError && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{actionError}</span>
          </div>
        )}

        {/* Workspace Identity & Subdomain Details */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            Workspace Details
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <span className="text-slate-400 block font-medium">Workspace Name</span>
              <span className="text-slate-900 font-bold text-sm block mt-0.5">{activeOrg.name}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Workspace Slug</span>
              <span className="text-slate-900 font-mono font-bold text-sm block mt-0.5">{activeOrg.slug}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Custom Subdomain (Target)</span>
              <span className="text-indigo-600 font-mono font-bold text-sm block mt-0.5 flex items-center gap-1">
                <Globe className="w-3.5 h-3.5" />
                <span>{activeOrg.slug}.veya.com</span>
              </span>
            </div>
          </div>
        </div>

        {/* Commercial Plan & Legal Compliance Card */}
        {isWorkspaceAdmin && (
          <CommercialWorkspaceCard activeOrg={activeOrg} currentUser={currentUser} />
        )}

        {/* Invite Teammates (Admins only) */}
        {isWorkspaceAdmin && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-indigo-600" />
              <span>Invite Team Members</span>
            </h3>

            {inviteError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
                {inviteError}
              </div>
            )}

            {inviteResult && (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2">
                <div className="flex items-center space-x-2 text-emerald-800 text-xs font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Invitation link created!</span>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    readOnly
                    value={inviteResult.url}
                    className="flex-1 px-3 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs font-mono text-slate-800"
                  />
                  <button
                    type="button"
                    onClick={handleCopyInviteLink}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1 cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied!' : 'Copy'}</span>
                  </button>
                </div>
              </div>
            )}

            <form onSubmit={handleSendInvite} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="sm:col-span-2">
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@company.com"
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-medium bg-white focus:outline-hidden"
                >
                  <option value="member">Role: Member</option>
                  <option value="manager">Role: Manager</option>
                  <option value="admin">Role: Admin</option>
                  <option value="guest">Role: Guest</option>
                </select>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isInviting}
                  className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer flex items-center justify-center space-x-1.5"
                >
                  {isInviting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
                  <span>Create Invite</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Workspace Members Directory */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-600" />
              <span>Workspace Members ({members.length})</span>
            </h3>
          </div>

          <div className="divide-y divide-slate-100">
            {members.map((m) => (
              <div key={m.user_id} className="py-3.5 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-xl shadow-2xs shrink-0">
                    {m.animal_emoji || '🦊'}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-xs text-slate-900">{m.name}</span>
                      {m.user_id === currentUser.id && (
                        <span className="text-[10px] text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded font-bold">
                          You
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-500 font-mono block mt-0.5">{m.email}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  {/* Role Display / Control */}
                  {isWorkspaceAdmin && m.role !== 'owner' && m.user_id !== currentUser.id ? (
                    <select
                      value={m.role}
                      onChange={(e) => handleRoleChange(m.user_id, e.target.value as any)}
                      className="text-xs font-semibold px-2 py-1 rounded bg-slate-50 border border-slate-300 text-slate-700 cursor-pointer"
                    >
                      <option value="guest">Guest</option>
                      <option value="member">Member</option>
                      <option value="manager">Manager</option>
                      <option value="admin">Admin</option>
                    </select>
                  ) : (
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                        m.role === 'owner'
                          ? 'bg-purple-100 text-purple-700'
                          : m.role === 'admin'
                          ? 'bg-amber-100 text-amber-700'
                          : m.role === 'manager'
                          ? 'bg-blue-100 text-blue-700'
                          : m.role === 'guest'
                          ? 'bg-slate-100 text-slate-600'
                          : 'bg-indigo-100 text-indigo-700'
                      }`}
                    >
                      {m.role}
                    </span>
                  )}

                  {/* Transfer Ownership Button (Owner only, for other members) */}
                  {activeOrg.is_owner && m.user_id !== currentUser.id && (
                    <button
                      type="button"
                      onClick={() => setTransferTargetUser(m)}
                      className="px-2 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded text-[11px] font-medium transition-colors cursor-pointer"
                      title="Transfer workspace ownership"
                    >
                      Transfer Owner
                    </button>
                  )}

                  {/* Remove Member */}
                  {isWorkspaceAdmin && m.role !== 'owner' && m.user_id !== currentUser.id && (
                    <button
                      type="button"
                      onClick={() => handleRemoveMember(m.user_id, m.name)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      title="Remove from workspace"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Transfer Ownership Confirmation Modal */}
        {transferTargetUser && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-center space-x-3 text-red-600">
                <AlertCircle className="w-6 h-6 shrink-0" />
                <h3 className="text-base font-bold text-slate-900">Transfer Workspace Ownership</h3>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                You are about to transfer ownership of <strong>{activeOrg.name}</strong> to{' '}
                <strong>{transferTargetUser.name}</strong> ({transferTargetUser.email}).
                <br /><br />
                Once transferred, you will become an <strong>Admin</strong>. Only the new owner will be able to transfer ownership back or delete the workspace.
              </p>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 block">
                  Type <span className="font-mono text-red-600 font-bold">TRANSFER</span> to confirm:
                </label>
                <input
                  type="text"
                  value={transferConfirmText}
                  onChange={(e) => setTransferConfirmText(e.target.value)}
                  placeholder="TRANSFER"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-red-500 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setTransferTargetUser(null);
                    setTransferConfirmText('');
                  }}
                  className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={transferConfirmText !== 'TRANSFER' || isTransferring}
                  onClick={handleTransferOwnership}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg cursor-pointer flex items-center space-x-1.5"
                >
                  {isTransferring && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Confirm Transfer</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
