'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound, Shield, CheckCircle2, AlertCircle, Loader2, Download, FileSpreadsheet, Database, Server } from 'lucide-react';
import { AppLayout } from '@/components/AppLayout';

interface UserProfile {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'employee';
  department?: string;
  animal_emoji?: string;
  selected_status?: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Form states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

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

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage('');
    setErrorMessage('');

    if (newPassword !== confirmNewPassword) {
      setErrorMessage('New password and confirm password do not match.');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMessage('New password must be at least 6 characters long.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmNewPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update password');
      }

      setSuccessMessage('Your password has been changed securely.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error updating password';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading || !currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <AppLayout user={currentUser}>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <KeyRound className="w-6 h-6 text-indigo-600" />
            <span>Account Security & Password Settings</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Manage your personal login credentials securely. Passwords are encrypted with salted hashes.
          </p>
        </div>

        {/* Profile Details Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
          <div className="flex items-center space-x-4 pb-4 border-b border-slate-100">
            <div className="h-16 w-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-3xl shadow-xs shrink-0">
              {currentUser.animal_emoji || '🦊'}
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 leading-tight">
                {currentUser.name}
              </h3>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                {currentUser.email}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-bold uppercase tracking-wider text-[10px] border border-indigo-200/60">
                  {currentUser.role}
                </span>
                <span className="text-xs text-slate-400">•</span>
                <span className="text-xs text-slate-600 font-medium">
                  Status: <strong>{currentUser.selected_status || 'Online'}</strong>
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-1">
            <div>
              <span className="text-slate-400 block font-medium">Full Name</span>
              <span className="text-slate-900 font-bold text-sm block mt-0.5">{currentUser.name}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Email / Login ID</span>
              <span className="text-slate-900 font-bold text-sm block mt-0.5">{currentUser.email}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Organization Role</span>
              <span className="inline-block mt-1 px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-bold uppercase tracking-wider text-[10px]">
                {currentUser.role}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Department</span>
              <span className="text-slate-700 font-semibold block mt-0.5">{currentUser.department || 'General'}</span>
            </div>
          </div>
        </div>

        {/* Change Password Form */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Shield className="w-4 h-4 text-indigo-600" />
            <span>Change Your Password</span>
          </h3>

          {successMessage && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Current Password *
              </label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  New Password *
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Confirm New Password *
                </label>
                <input
                  type="password"
                  required
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md transition-all cursor-pointer"
              >
                {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Update Password</span>
              </button>
            </div>
          </form>
        </div>

        {/* ADMIN-ONLY DATA BACKUP & ORGANISATION EXPORT */}
        {currentUser.role === 'admin' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-5">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Database className="w-4 h-4 text-indigo-600" />
                  <span>Organisation Data Backup & Export</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Export complete organisational datasets to prevent vendor lock-in and enable zero-risk migrations.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold uppercase tracking-wider">
                Admin Exclusive
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <a
                href="/api/export?format=json"
                download
                className="flex items-center justify-between p-3.5 rounded-xl border border-indigo-200 bg-indigo-50/50 hover:bg-indigo-50 transition-colors group cursor-pointer"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-indigo-600 text-white">
                    <Download className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <span className="text-xs font-bold text-slate-900 block group-hover:text-indigo-600 transition-colors">
                      Full System Backup
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      JSON Bundle (Users, Tasks, Histories, Logs)
                    </span>
                  </div>
                </div>
              </a>

              <a
                href="/api/export?format=csv&type=tasks"
                download
                className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors group cursor-pointer"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-emerald-600 text-white">
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <span className="text-xs font-bold text-slate-900 block group-hover:text-emerald-700 transition-colors">
                      Tasks Export
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      CSV Spreadsheet with Assigners & Links
                    </span>
                  </div>
                </div>
              </a>

              <a
                href="/api/export?format=csv&type=employees"
                download
                className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors group cursor-pointer"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-sky-600 text-white">
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <span className="text-xs font-bold text-slate-900 block group-hover:text-sky-700 transition-colors">
                      Employee Directory
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      CSV listing roles, departments, & status
                    </span>
                  </div>
                </div>
              </a>

              <a
                href="/api/export?format=csv&type=audit_logs"
                download
                className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors group cursor-pointer"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-purple-600 text-white">
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <span className="text-xs font-bold text-slate-900 block group-hover:text-purple-700 transition-colors">
                      Audit Logs Export
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      CSV of all security & activity logs
                    </span>
                  </div>
                </div>
              </a>
            </div>

            {/* Production Cost & Architecture Badge */}
            <div className="mt-4 p-4 rounded-xl bg-slate-900 text-white space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Server className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                    Production Architecture: Zero Mandatory Cost (₹0 / $0)
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-mono font-bold border border-emerald-500/30">
                  VERIFIED FREE TIER
                </span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Designed for serverless edge deployment (Cloudflare Pages / Workers + Cloudflare D1 SQLite).
                Zero sleeping instances, no cold startup delays after weeks of inactivity, and zero paid infrastructure dependencies under normal organizational workload.
              </p>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
