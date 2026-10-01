'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  KeyRound,
  Shield,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Download,
  FileSpreadsheet,
  Database,
  Server,
  Bell,
  Monitor,
  Volume2,
  Send,
  Laptop,
  MessageSquare,
  CheckSquare,
  DollarSign
} from 'lucide-react';
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

        {/* NOTIFICATION PREFERENCES */}
        <NotificationPreferencesCard />

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

function NotificationPreferencesCard() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [prefs, setPrefs] = useState({
    master_enabled: 1,
    in_app_enabled: 1,
    browser_enabled: 0,
    desktop_enabled: 1,
    tasks_enabled: 1,
    task_assignments: 1,
    task_status_changes: 1,
    task_deadlines: 1,
    task_discussions: 1,
    chat_messages: 1,
    finance_enabled: 1,
    mentions_enabled: 1,
  });

  useEffect(() => {
    fetch('/api/notifications/preferences')
      .then((res) => res.json())
      .then((data) => {
        if (data.preferences) {
          setPrefs((prev) => ({ ...prev, ...data.preferences }));
        }
      })
      .catch((err) => console.error('Failed to load preferences:', err))
      .finally(() => setLoading(false));
  }, []);

  const handleToggle = async (key: keyof typeof prefs) => {
    const nextVal = prefs[key] ? 0 : 1;
    const newPrefs = { ...prefs, [key]: nextVal };
    setPrefs(newPrefs);

    // If enabling browser notifications, prompt permission if supported
    if (key === 'browser_enabled' && nextVal === 1 && typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        const perm = await Notification.requestPermission();
        if (perm !== 'granted') {
          setTestResult('Browser permission was denied in your browser settings.');
          setPrefs((p) => ({ ...p, browser_enabled: 0 }));
          return;
        }
      }
    }

    try {
      setSaving(true);
      await fetch('/api/notifications/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: nextVal }),
      });
    } catch (err) {
      console.error('Error saving notification preferences:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleSendTestNotification = async () => {
    try {
      setTesting(true);
      setTestResult(null);
      const res = await fetch('/api/notifications/test', {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok) {
        setTestResult('Test notification sent! Check the bell icon at the top right.');
        // If web notification API is enabled and permitted, show instant browser test too
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted' && prefs.browser_enabled) {
          new Notification('Revent Test Notification', {
            body: 'Browser push notifications are active and working!',
            icon: '/favicon.ico',
          });
        }
      } else {
        setTestResult(data.error || 'Failed to send test notification');
      }
    } catch {
      setTestResult('Network error sending test notification');
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs flex items-center justify-center">
        <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-5">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center space-x-2">
          <Bell className="w-5 h-5 text-indigo-600" />
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            Notification Preferences
          </h3>
        </div>
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handleSendTestNotification}
            disabled={testing}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold border border-indigo-200/60 transition-colors cursor-pointer"
          >
            {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            <span>Send Test Notification</span>
          </button>
        </div>
      </div>

      {testResult && (
        <div className="p-3 rounded-xl bg-indigo-50/80 border border-indigo-200 text-indigo-800 text-xs font-medium flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
          <span>{testResult}</span>
        </div>
      )}

      {/* Master Toggle */}
      <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
        <div>
          <span className="text-xs font-bold text-slate-900 block">Master Notification Toggle</span>
          <span className="text-[11px] text-slate-500">Enable or pause all system notifications across devices</span>
        </div>
        <button
          type="button"
          onClick={() => handleToggle('master_enabled')}
          className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
            prefs.master_enabled ? 'bg-indigo-600' : 'bg-slate-300'
          }`}
        >
          <div
            className={`w-5 h-5 rounded-full bg-white transition-transform absolute top-0.5 left-0.5 shadow-xs ${
              prefs.master_enabled ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {/* Delivery Channels */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Delivery Channels</h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 rounded-xl border border-slate-200 bg-white flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <Bell className="w-4 h-4 text-slate-600" />
              <div>
                <span className="text-xs font-bold text-slate-900 block">In-App Center</span>
                <span className="text-[10px] text-slate-500">Bell icon header badge</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleToggle('in_app_enabled')}
              className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer ${
                prefs.in_app_enabled ? 'bg-indigo-600' : 'bg-slate-300'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-0.5 left-0.5 shadow-xs ${
                  prefs.in_app_enabled ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="p-3 rounded-xl border border-slate-200 bg-white flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <Monitor className="w-4 h-4 text-slate-600" />
              <div>
                <span className="text-xs font-bold text-slate-900 block">Web Browser</span>
                <span className="text-[10px] text-slate-500">HTML5 Push banner</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleToggle('browser_enabled')}
              className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer ${
                prefs.browser_enabled ? 'bg-indigo-600' : 'bg-slate-300'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-0.5 left-0.5 shadow-xs ${
                  prefs.browser_enabled ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="p-3 rounded-xl border border-slate-200 bg-white flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <Laptop className="w-4 h-4 text-slate-600" />
              <div>
                <span className="text-xs font-bold text-slate-900 block">Desktop App</span>
                <span className="text-[10px] text-slate-500">macOS & Windows</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleToggle('desktop_enabled')}
              className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer ${
                prefs.desktop_enabled ? 'bg-indigo-600' : 'bg-slate-300'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-0.5 left-0.5 shadow-xs ${
                  prefs.desktop_enabled ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Module Events */}
      <div className="space-y-3 pt-2">
        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Module Event Subscriptions</h4>
        <div className="space-y-2">
          <div className="flex items-center justify-between py-2 border-b border-slate-100">
            <div className="flex items-center space-x-2.5">
              <CheckSquare className="w-4 h-4 text-indigo-600" />
              <div>
                <span className="text-xs font-bold text-slate-800">Task Assignments & Updates</span>
                <span className="text-[11px] text-slate-500 block">When tasks are assigned to you or updated</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleToggle('tasks_enabled')}
              className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer ${
                prefs.tasks_enabled ? 'bg-indigo-600' : 'bg-slate-300'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-0.5 left-0.5 shadow-xs ${
                  prefs.tasks_enabled ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between py-2 border-b border-slate-100">
            <div className="flex items-center space-x-2.5">
              <MessageSquare className="w-4 h-4 text-emerald-600" />
              <div>
                <span className="text-xs font-bold text-slate-800">Direct Chat & Team Messages</span>
                <span className="text-[11px] text-slate-500 block">When you receive incoming direct messages</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleToggle('chat_messages')}
              className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer ${
                prefs.chat_messages ? 'bg-indigo-600' : 'bg-slate-300'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-0.5 left-0.5 shadow-xs ${
                  prefs.chat_messages ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between py-2">
            <div className="flex items-center space-x-2.5">
              <DollarSign className="w-4 h-4 text-purple-600" />
              <div>
                <span className="text-xs font-bold text-slate-800">Finance & Invoice Activities</span>
                <span className="text-[11px] text-slate-500 block">Invoice status changes and payment alerts</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleToggle('finance_enabled')}
              className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer ${
                prefs.finance_enabled ? 'bg-indigo-600' : 'bg-slate-300'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-0.5 left-0.5 shadow-xs ${
                  prefs.finance_enabled ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
