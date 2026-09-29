'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { History, Search, Filter, ShieldAlert, ArrowRight, Clock, User } from 'lucide-react';
import { AppLayout } from '@/components/AppLayout';

interface UserProfile {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'employee';
}

interface AuditLogEntry {
  id: number;
  user_id: number;
  actor_name: string;
  actor_email: string;
  actor_role: string;
  action_type: string;
  entity_type: string;
  entity_id: number | null;
  entity_title: string;
  old_value: string;
  new_value: string;
  created_at: string;
}

export default function AuditLogPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [search, setSearch] = useState('');
  const [actionTypeFilter, setActionTypeFilter] = useState('all');
  const [entityTypeFilter, setEntityTypeFilter] = useState('all');

  // Verify auth & admin
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
          if (data.user.role !== 'admin') {
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

  const fetchLogs = useCallback(async () => {
    if (!currentUser || currentUser.role !== 'admin') return;

    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (actionTypeFilter !== 'all') params.set('actionType', actionTypeFilter);
      if (entityTypeFilter !== 'all') params.set('entityType', entityTypeFilter);

      const res = await fetch(`/api/audit-logs?${params.toString()}`);
      const data = await res.json();
      if (data.logs) {
        setLogs(data.logs);
      }
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
    }
  }, [currentUser, search, actionTypeFilter, entityTypeFilter]);

  useEffect(() => {
    if (currentUser) {
      fetchLogs();
    }
  }, [currentUser, fetchLogs]);

  const formatDateTime = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return isoStr;
    }
  };

  if (loading || !currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const actionTypes = [
    'Task Created',
    'Task Reassigned',
    'Status Changed',
    'Priority Changed',
    'Task Archived',
    'Employee Created',
    'Employee Updated',
    'Employee Deactivated',
    'Employee Reactivated',
    'Password Reset by Admin',
    'Password Changed',
  ];

  return (
    <AppLayout user={currentUser}>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <History className="w-6 h-6 text-indigo-600" />
            <span>Central Organization Activity & Audit Log</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Permanent, tamper-resistant trail of assignments, status transitions, priority changes, and user management events.
          </p>
        </div>

        {/* Filter Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:w-80">
            <input
              type="text"
              placeholder="Search actors, tasks, details..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <select
              value={actionTypeFilter}
              onChange={(e) => setActionTypeFilter(e.target.value)}
              className="text-xs px-3 py-2 rounded-lg border border-slate-300 bg-white font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="all">All Action Types</option>
              {actionTypes.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>

            <select
              value={entityTypeFilter}
              onChange={(e) => setEntityTypeFilter(e.target.value)}
              className="text-xs px-3 py-2 rounded-lg border border-slate-300 bg-white font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="all">All Entities</option>
              <option value="Task">Task</option>
              <option value="User">User / Employee</option>
            </select>
          </div>
        </div>

        {/* Audit Log Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-6">Timestamp</th>
                  <th className="py-3.5 px-4">Performed By</th>
                  <th className="py-3.5 px-4">Action</th>
                  <th className="py-3.5 px-4">Entity</th>
                  <th className="py-3.5 px-6">Transition / Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">
                      No audit log records found matching your filters.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-6 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                        {formatDateTime(log.created_at)}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-bold text-slate-900 block">{log.actor_name || `User #${log.user_id}`}</span>
                        <span className="text-[10px] text-slate-400 block">{log.actor_email}</span>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            log.action_type.includes('Reassign')
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : log.action_type.includes('Status')
                              ? 'bg-purple-50 text-purple-800 border border-purple-200'
                              : log.action_type.includes('Created')
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : log.action_type.includes('Deactiv')
                              ? 'bg-red-50 text-red-800 border border-red-200'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {log.action_type}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 max-w-xs truncate">
                        <span className="font-semibold text-slate-900 block truncate">
                          {log.entity_title || `#${log.entity_id}`}
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          Type: {log.entity_type}
                        </span>
                      </td>

                      <td className="py-3.5 px-6 text-slate-600">
                        {log.old_value && log.new_value ? (
                          <div className="flex items-center space-x-1.5">
                            <span className="line-through text-slate-400">{log.old_value}</span>
                            <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="font-bold text-indigo-700">{log.new_value}</span>
                          </div>
                        ) : (
                          <span>{log.new_value || log.old_value || '—'}</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
