'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users,
  Plus,
  Edit2,
  KeyRound,
  UserCheck,
  UserX,
  Search,
  ShieldCheck,
  MessageSquare,
  Mail,
  Copy,
  Check,
} from 'lucide-react';
import { AppLayout } from '@/components/AppLayout';
import { EmployeeModal, Employee } from '@/components/EmployeeModal';

interface UserProfile {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'employee';
  can_reset_other_user_passwords?: boolean;
}

export default function TeamPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Modals
  const [selectedEmp, setSelectedEmp] = useState<Employee | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'password'>('create');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Invite Modal
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'member' | 'admin'>('member');
  const [inviteUrl, setInviteUrl] = useState('');
  const [inviteCopied, setInviteCopied] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState('');

  // Verify auth: Admins or designated password reset users
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) {
          router.push('/login');
          return;
        }
        const data = await res.json();
        if (data.authenticated && data.user) {
          if (data.user.role !== 'admin' && !data.user.can_reset_other_user_passwords) {
            router.push('/dashboard');
            return;
          }
          setCurrentUser(data.user);
        } else {
          router.push('/login');
        }
      } catch {
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  // Fetch employees
  const fetchEmployees = useCallback(async () => {
    try {
      const res = await fetch('/api/employees');
      const data = await res.json();
      if (data.employees) {
        setEmployees(data.employees);
      }
    } catch (err) {
      console.error('Failed to fetch employees:', err);
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchEmployees();
    }
  }, [currentUser, fetchEmployees]);

  // Toggle active/inactive
  const handleToggleActive = async (emp: Employee) => {
    if (currentUser?.role !== 'admin') {
      alert('Only administrators can deactivate/reactivate employees.');
      return;
    }

    const newStatus = emp.is_active === 1 ? false : true;
    const confirmMsg = newStatus
      ? `Reactivate account for ${emp.name}? They will regain login access and appear in task assignments.`
      : `Deactivate ${emp.name}? They will immediately lose login access and active sessions will be revoked. Historical tasks will remain intact.`;

    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await fetch(`/api/employees/${emp.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update status');
      await fetchEmployees();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error updating status';
      alert(msg);
    }
  };

  if (loading || !currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      emp.name.toLowerCase().includes(search.toLowerCase()) ||
      emp.email.toLowerCase().includes(search.toLowerCase()) ||
      (emp.department && emp.department.toLowerCase().includes(search.toLowerCase()));

    if (statusFilter === 'active') return matchesSearch && emp.is_active === 1;
    if (statusFilter === 'inactive') return matchesSearch && emp.is_active === 0;
    return matchesSearch;
  });

  const canResetPasswords = currentUser.role === 'admin' || !!currentUser.can_reset_other_user_passwords;

  return (
    <AppLayout user={currentUser}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Users className="w-6 h-6 text-indigo-600" />
              <span>Team & Employee Management</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              {currentUser.role === 'admin'
                ? 'Manage employee accounts, animal emoji avatars, passwords, and presence.'
                : 'Authorized password-reset portal for designated managers.'}
            </p>
          </div>

          {currentUser.role === 'admin' && (
            <div className="flex items-center space-x-2.5 self-start sm:self-auto">
              <button
                onClick={() => {
                  setInviteEmail('');
                  setInviteRole('member');
                  setInviteUrl('');
                  setInviteCopied(false);
                  setInviteError('');
                  setIsInviteModalOpen(true);
                }}
                className="inline-flex items-center space-x-2 py-2 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold shadow-md transition-all cursor-pointer"
              >
                <Mail className="w-4 h-4 text-indigo-400" />
                <span>Invite Member</span>
              </button>
              <button
                onClick={() => {
                  setSelectedEmp(null);
                  setModalMode('create');
                  setIsModalOpen(true);
                }}
                className="inline-flex items-center space-x-2 py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add Employee</span>
              </button>
            </div>
          )}
        </div>

        {/* Filter Controls */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <input
              type="text"
              placeholder="Search by name, email, department..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          </div>

          <div className="flex items-center space-x-2 self-start sm:self-auto">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                statusFilter === 'all'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All ({employees.length})
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                statusFilter === 'active'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Active ({employees.filter((e) => e.is_active === 1).length})
            </button>
            <button
              onClick={() => setStatusFilter('inactive')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                statusFilter === 'inactive'
                  ? 'bg-slate-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Inactive ({employees.filter((e) => e.is_active === 0).length})
            </button>
          </div>
        </div>

        {/* Employees Table with Animal Emojis */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-6">Employee</th>
                  <th className="py-3.5 px-4">Department</th>
                  <th className="py-3.5 px-4">Role</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-center">Tasks</th>
                  <th className="py-3.5 px-4 text-right pr-6">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {filteredEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-6">
                      <div className="flex items-center space-x-3">
                        {/* Animal Emoji Avatar */}
                        <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center text-lg shrink-0 border border-slate-200">
                          {emp.animal_emoji || '🦊'}
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 block">{emp.name}</span>
                          <span className="text-[11px] text-slate-400 block">{emp.email}</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-slate-600">
                      {emp.department || '—'}
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          emp.role === 'admin'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {emp.role === 'admin' ? (
                          <>
                            <ShieldCheck className="w-3 h-3 mr-1 inline" /> Admin
                          </>
                        ) : (
                          'Employee'
                        )}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-flex px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider ${
                          emp.is_active === 1
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-red-50 text-red-700 border border-red-200'
                        }`}
                      >
                        {emp.is_active === 1 ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <div className="font-bold text-slate-900 text-sm">
                        {emp.total_tasks ?? 0}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {emp.completed_tasks ?? 0} completed
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-right pr-6 whitespace-nowrap">
                      <div className="flex items-center justify-end space-x-1">
                        {/* Message Button */}
                        {emp.id !== currentUser.id && emp.is_active === 1 && (
                          <button
                            onClick={() => router.push(`/chat?userId=${emp.id}`)}
                            className="p-1.5 rounded-lg text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-colors cursor-pointer"
                            title={`Message ${emp.name}`}
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Edit Button (Admin Only) */}
                        {currentUser.role === 'admin' && (
                          <button
                            onClick={() => {
                              setSelectedEmp(emp);
                              setModalMode('edit');
                              setIsModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-indigo-600 transition-colors cursor-pointer"
                            title="Edit Details & Emoji"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Reset Password Button (Admin + Dhananjay + Baldeep) */}
                        {canResetPasswords && (
                          <button
                            onClick={() => {
                              setSelectedEmp(emp);
                              setModalMode('password');
                              setIsModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-amber-600 transition-colors cursor-pointer"
                            title="Reset Employee Password"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Deactivate / Reactivate Button (Admin Only) */}
                        {currentUser.role === 'admin' && (
                          <button
                            onClick={() => handleToggleActive(emp)}
                            disabled={emp.id === currentUser.id}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              emp.is_active === 1
                                ? 'text-red-500 hover:bg-red-50'
                                : 'text-emerald-600 hover:bg-emerald-50'
                            } ${emp.id === currentUser.id ? 'opacity-30 cursor-not-allowed' : ''}`}
                            title={emp.is_active === 1 ? 'Deactivate Employee' : 'Reactivate Employee'}
                          >
                            {emp.is_active === 1 ? (
                              <UserX className="w-3.5 h-3.5" />
                            ) : (
                              <UserCheck className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Employee Modal */}
      <EmployeeModal
        isOpen={isModalOpen}
        mode={modalMode}
        employeeToEdit={selectedEmp}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedEmp(null);
        }}
        onSuccess={fetchEmployees}
      />

      {/* Invite Member Modal */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 text-slate-900 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Invite Team Member</h3>
                <p className="text-xs text-slate-500">Send an invitation link to join this workspace</p>
              </div>
            </div>

            {inviteError && (
              <div className="p-3 mb-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                {inviteError}
              </div>
            )}

            {!inviteUrl ? (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!inviteEmail.trim()) return;
                  setInviteLoading(true);
                  setInviteError('');
                  try {
                    const res = await fetch('/api/invitations', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
                    });
                    const data = await res.json();
                    if (res.ok) {
                      setInviteUrl(`${window.location.origin}${data.inviteUrl}`);
                    } else {
                      setInviteError(data.error || 'Failed to create invitation');
                    }
                  } catch {
                    setInviteError('Network error creating invitation');
                  } finally {
                    setInviteLoading(false);
                  }
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="colleague@example.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Workspace Role
                  </label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as 'member' | 'admin')}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="member">Member (Regular Employee)</option>
                    <option value="admin">Admin (Full Workspace Management)</option>
                  </select>
                </div>

                <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsInviteModalOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={inviteLoading || !inviteEmail.trim()}
                    className="px-4 py-2 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors shadow-sm disabled:opacity-50"
                  >
                    {inviteLoading ? 'Generating Link...' : 'Generate Invite Link'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-medium">
                  Invitation link created successfully! Share this link with the recipient to join the workspace.
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    readOnly
                    value={inviteUrl}
                    className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg text-slate-700"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(inviteUrl);
                      setInviteCopied(true);
                      setTimeout(() => setInviteCopied(false), 2000);
                    }}
                    className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg flex items-center space-x-1 shrink-0"
                  >
                    {inviteCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{inviteCopied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>

                <div className="flex justify-end pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsInviteModalOpen(false)}
                    className="px-4 py-2 text-sm font-semibold bg-slate-900 text-white rounded-lg hover:bg-slate-800"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </AppLayout>
  );
}
