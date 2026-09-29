'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  BarChart3,
  Users,
  Calendar,
  CheckCircle2,
  Clock,
  Flame,
  AlertTriangle,
  PlayCircle,
  CircleDashed,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Percent,
} from 'lucide-react';
import { AppLayout } from '@/components/AppLayout';
import { PriorityBadge } from '@/components/PriorityBadge';
import { StatusBadge } from '@/components/StatusBadge';
import { PRIORITIES, STATUSES } from '@/lib/constants';

interface UserProfile {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'employee';
}

interface EmployeeOption {
  id: number;
  name: string;
  email: string;
  department?: string;
  is_active: number;
}

export default function AnalyticsPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [period, setPeriod] = useState<string>('month'); // 'day' | 'week' | 'month' | 'year' | 'custom'
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  // Analytics payload
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [orgData, setOrgData] = useState<any>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  // Tab: 'individual' | 'organization'
  const [viewMode, setViewMode] = useState<'individual' | 'organization'>('individual');

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

  // Load employees
  useEffect(() => {
    if (!currentUser || currentUser.role !== 'admin') return;

    const loadEmployees = async () => {
      try {
        const res = await fetch('/api/employees');
        const data = await res.json();
        if (data.employees && data.employees.length > 0) {
          setEmployees(data.employees);
          if (!selectedEmployeeId) {
            setSelectedEmployeeId(String(data.employees[0].id));
          }
        }
      } catch (err) {
        console.error('Failed to load employees:', err);
      }
    };

    loadEmployees();
  }, [currentUser]);

  // Fetch individual employee analytics
  const fetchEmployeeAnalytics = useCallback(async () => {
    if (!selectedEmployeeId) return;

    try {
      setLoadingAnalytics(true);
      const params = new URLSearchParams();
      params.set('employeeId', selectedEmployeeId);
      params.set('period', period);
      if (period === 'custom') {
        if (fromDate) params.set('fromDate', fromDate);
        if (toDate) params.set('toDate', toDate);
      }

      const res = await fetch(`/api/analytics/employee?${params.toString()}`);
      const data = await res.json();
      setAnalyticsData(data);
    } catch (err) {
      console.error('Failed to load employee analytics:', err);
    } finally {
      setLoadingAnalytics(false);
    }
  }, [selectedEmployeeId, period, fromDate, toDate]);

  // Fetch organization-wide comparison analytics
  const fetchOrgAnalytics = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      params.set('period', period);
      if (period === 'custom') {
        if (fromDate) params.set('fromDate', fromDate);
        if (toDate) params.set('toDate', toDate);
      }

      const res = await fetch(`/api/analytics/organization?${params.toString()}`);
      const data = await res.json();
      setOrgData(data);
    } catch (err) {
      console.error('Failed to load org analytics:', err);
    }
  }, [period, fromDate, toDate]);

  useEffect(() => {
    if (viewMode === 'individual') {
      fetchEmployeeAnalytics();
    } else {
      fetchOrgAnalytics();
    }
  }, [viewMode, fetchEmployeeAnalytics, fetchOrgAnalytics]);

  if (loading || !currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const metrics = analyticsData?.metrics;
  const statusCounts = analyticsData?.statusCounts || {};
  const priorityCounts = analyticsData?.priorityCounts || {};
  const trendData = analyticsData?.trendData || [];
  const recentTasks = analyticsData?.tasks || [];

  return (
    <AppLayout user={currentUser}>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-indigo-600" />
              <span>Employee Performance Analytics</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Analyze work volume, completion velocity, and priority allocation across Day, Week, Month, Year, and Custom Date Ranges.
            </p>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center space-x-2 bg-slate-200/70 p-1 rounded-xl">
            <button
              onClick={() => setViewMode('individual')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                viewMode === 'individual'
                  ? 'bg-white text-indigo-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Individual Employee
            </button>
            <button
              onClick={() => setViewMode('organization')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                viewMode === 'organization'
                  ? 'bg-white text-indigo-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Team Comparison
            </button>
          </div>
        </div>

        {/* Global Period & Filter Controls */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap gap-4 items-center justify-between">
          {viewMode === 'individual' && (
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Select Employee:
              </span>
              <select
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                className="text-xs font-bold px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-800 shadow-2xs focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} {emp.department ? `(${emp.department})` : ''} {!emp.is_active ? '• Inactive' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Reporting Period Selector */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Period:
            </span>
            <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-lg">
              {['day', 'week', 'month', 'year', 'custom'].map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1 rounded-md text-xs font-semibold capitalize transition-colors cursor-pointer ${
                    period === p
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {p === 'day' ? 'Today' : p === 'week' ? 'This Week' : p === 'month' ? 'This Month' : p === 'year' ? 'This Year' : 'Custom'}
                </button>
              ))}
            </div>

            {/* Custom Range Inputs */}
            {period === 'custom' && (
              <div className="flex items-center space-x-2 ml-2">
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-indigo-500"
                />
                <span className="text-xs text-slate-400">to</span>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            )}
          </div>
        </div>

        {/* INDIVIDUAL EMPLOYEE VIEW */}
        {viewMode === 'individual' ? (
          loadingAnalytics ? (
            <div className="py-20 text-center">
              <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs text-slate-500">Calculating employee metrics...</p>
            </div>
          ) : !analyticsData?.employee ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
              No employee selected.
            </div>
          ) : (
            <div className="space-y-6">
              {/* Employee Quick Banner */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center space-x-4">
                  <div className="h-14 w-14 rounded-2xl bg-indigo-600 text-white font-black text-2xl flex items-center justify-center shadow-md">
                    {analyticsData.employee.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="text-xl font-bold text-slate-900">
                        {analyticsData.employee.name}
                      </h3>
                      <span
                        className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider ${
                          analyticsData.employee.is_active === 1
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-500 border border-slate-200'
                        }`}
                      >
                        {analyticsData.employee.is_active === 1 ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {analyticsData.employee.email} • {analyticsData.employee.department || 'General'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-4 border-t sm:border-t-0 sm:border-l border-slate-100 pt-3 sm:pt-0 sm:pl-6">
                  <div>
                    <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold block">
                      Completion Rate
                    </span>
                    <span className="text-2xl font-black text-indigo-600 mt-0.5 block">
                      {metrics?.completionRate ?? 0}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Core Metric Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                    Total Assigned Workload
                  </span>
                  <span className="text-3xl font-extrabold text-slate-900 mt-1 block">
                    {metrics?.totalAssigned ?? 0}
                  </span>
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Tasks during selected period
                  </span>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
                  <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider block">
                    Completed Tasks
                  </span>
                  <span className="text-3xl font-extrabold text-emerald-700 mt-1 block">
                    {metrics?.completedTasks ?? 0}
                  </span>
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    {metrics?.completionRate ?? 0}% completion efficiency
                  </span>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
                  <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider block">
                    Pending / In-Flight
                  </span>
                  <span className="text-3xl font-extrabold text-amber-700 mt-1 block">
                    {metrics?.pendingWork ?? 0}
                  </span>
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    {metrics?.startedTasks ?? 0} started, {metrics?.halfwayTasks ?? 0} half-way
                  </span>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
                  <span className="text-xs font-semibold text-red-600 uppercase tracking-wider block">
                    Overdue Work
                  </span>
                  <span className="text-3xl font-extrabold text-red-700 mt-1 block">
                    {metrics?.overdueTasks ?? 0}
                  </span>
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Passed due date without completion
                  </span>
                </div>
              </div>

              {/* Dynamic Work Volume & Completion Trend Chart / Table */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-base font-bold text-slate-900">
                      Work Volume & Completion Velocity ({period.toUpperCase()})
                    </h4>
                    <p className="text-xs text-slate-500">
                      Dynamic tasks assigned, completed, and pending across each interval
                    </p>
                  </div>
                </div>

                {/* Visual Bar Representation */}
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3 pt-2">
                  {trendData.map((item: any, idx: number) => {
                    const label = item.day || item.month || item.label;
                    const assigned = item.assigned || 0;
                    const completed = item.completed || 0;
                    const pending = item.pending || 0;
                    const maxVal = Math.max(assigned, 1);
                    const compHeight = Math.min(100, Math.round((completed / maxVal) * 100));

                    return (
                      <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between">
                        <div>
                          <span className="text-xs font-bold text-slate-700 truncate block">{label}</span>
                          <div className="mt-2 space-y-1 text-[11px]">
                            <div className="flex justify-between text-slate-500">
                              <span>Assigned:</span>
                              <span className="font-bold text-slate-900">{assigned}</span>
                            </div>
                            <div className="flex justify-between text-emerald-600">
                              <span>Completed:</span>
                              <span className="font-bold">{completed}</span>
                            </div>
                            <div className="flex justify-between text-amber-600">
                              <span>Pending:</span>
                              <span className="font-bold">{pending}</span>
                            </div>
                          </div>
                        </div>

                        {/* Progress visual */}
                        <div className="mt-3 w-full bg-slate-200 h-2 rounded-full overflow-hidden flex">
                          <div
                            style={{ width: `${compHeight}%` }}
                            className="bg-emerald-500 h-full rounded-full transition-all"
                            title={`Completed: ${compHeight}%`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Status & Priority Distributions Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Status Distribution */}
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs space-y-4">
                  <h4 className="text-base font-bold text-slate-900">Status Distribution</h4>
                  <div className="space-y-3">
                    {STATUSES.map((status) => {
                      const count = statusCounts[status] || 0;
                      const total = metrics?.totalAssigned || 1;
                      const pct = Math.round((count / total) * 100);

                      return (
                        <div key={status} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-700">{status}</span>
                            <span className="font-bold text-slate-900">
                              {count} <span className="text-slate-400 font-normal">({pct}%)</span>
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div
                              style={{ width: `${pct}%` }}
                              className={`h-full rounded-full ${
                                status === 'Completed'
                                  ? 'bg-emerald-500'
                                  : status === 'Half-way'
                                  ? 'bg-purple-500'
                                  : status === 'Started'
                                  ? 'bg-sky-500'
                                  : 'bg-zinc-400'
                              }`}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Priority Distribution */}
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs space-y-4">
                  <h4 className="text-base font-bold text-slate-900">Priority Allocation</h4>
                  <div className="space-y-3">
                    {PRIORITIES.map((priority) => {
                      const count = priorityCounts[priority] || 0;
                      const total = metrics?.totalAssigned || 1;
                      const pct = Math.round((count / total) * 100);

                      return (
                        <div key={priority} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-700">{priority}</span>
                            <span className="font-bold text-slate-900">
                              {count} <span className="text-slate-400 font-normal">({pct}%)</span>
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div
                              style={{ width: `${pct}%` }}
                              className={`h-full rounded-full ${
                                priority === 'V. Urgent'
                                  ? 'bg-red-500'
                                  : priority === 'Urgent'
                                  ? 'bg-orange-500'
                                  : priority === 'EOD'
                                  ? 'bg-amber-500'
                                  : priority === 'End of Week'
                                  ? 'bg-blue-500'
                                  : priority === '15 Days'
                                  ? 'bg-indigo-500'
                                  : 'bg-slate-400'
                              }`}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Recent Tasks List with Assigned By */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 space-y-4">
                <h4 className="text-base font-bold text-slate-900">
                  Tasks Handled in this Period ({recentTasks.length})
                </h4>

                <div className="space-y-2.5">
                  {recentTasks.map((task: any) => (
                    <div
                      key={task.id}
                      className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <PriorityBadge priority={task.priority} size="sm" />
                          <StatusBadge status={task.status} size="sm" />
                          <span className="text-slate-400 font-medium">
                            Assigned by: <strong className="text-slate-700">{task.assigned_by_name || 'Admin'}</strong>
                          </span>
                        </div>
                        <div className="font-bold text-slate-900 text-sm">{task.task_name}</div>
                      </div>

                      <div className="flex items-center space-x-3 shrink-0">
                        {task.drive_link && (
                          <a
                            href={task.drive_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center space-x-1 px-2.5 py-1 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-[11px] border border-indigo-200 transition-colors"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>Work Link</span>
                          </a>
                        )}
                        <span className="text-slate-400 font-medium">
                          Due: {task.due_date || 'None'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )
        ) : (
          /* ORGANISATION-WIDE EMPLOYEE COMPARISON VIEW */
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                Team Workload & Completion Benchmark ({period.toUpperCase()})
              </h3>
              <p className="text-xs text-slate-500">
                Factual comparative metrics dynamically computed from task timestamps and completion logs.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3.5 px-6">Employee</th>
                    <th className="py-3.5 px-4">Department</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-center font-bold text-slate-800">Assigned</th>
                    <th className="py-3.5 px-4 text-center text-emerald-600 font-bold">Completed</th>
                    <th className="py-3.5 px-4 text-center text-amber-600 font-bold">Pending</th>
                    <th className="py-3.5 px-6 text-right font-black text-indigo-700">Completion Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                  {orgData?.teamPerformance?.map((emp: any) => (
                    <tr
                      key={emp.employee_id}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                      onClick={() => {
                        setSelectedEmployeeId(String(emp.employee_id));
                        setViewMode('individual');
                      }}
                    >
                      <td className="py-4 px-6 font-bold text-slate-900 flex items-center space-x-2">
                        <span>{emp.employee_name}</span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                      </td>

                      <td className="py-4 px-4 text-slate-600">{emp.department || '—'}</td>

                      <td className="py-4 px-4 text-center">
                        <span
                          className={`inline-flex px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider ${
                            emp.is_active === 1
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-500 border border-slate-200'
                          }`}
                        >
                          {emp.is_active === 1 ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      <td className="py-4 px-4 text-center font-bold text-slate-900 text-sm">
                        {emp.assigned}
                      </td>

                      <td className="py-4 px-4 text-center font-bold text-emerald-600 text-sm">
                        {emp.completed}
                      </td>

                      <td className="py-4 px-4 text-center font-bold text-amber-600 text-sm">
                        {emp.pending}
                      </td>

                      <td className="py-4 px-6 text-right font-black text-indigo-600 text-sm">
                        <div className="flex items-center justify-end space-x-2">
                          <span>{emp.completion_rate}%</span>
                          <div className="w-16 bg-slate-200 h-1.5 rounded-full overflow-hidden">
                            <div
                              style={{ width: `${emp.completion_rate}%` }}
                              className="bg-indigo-600 h-full rounded-full"
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
