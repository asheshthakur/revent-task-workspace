'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  CheckCircle2,
  Clock,
  PlayCircle,
  CircleDashed,
  ExternalLink,
  Flame,
  AlertTriangle,
  Users,
  Search,
  Filter,
  ArrowUpDown,
  Plus,
} from 'lucide-react';
import { AppLayout } from '@/components/AppLayout';
import { PriorityBadge } from '@/components/PriorityBadge';
import { StatusBadge } from '@/components/StatusBadge';
import { TaskDetailModal, Task } from '@/components/TaskDetailModal';
import { TaskFormModal } from '@/components/TaskFormModal';
import { PRIORITIES, STATUSES, StatusType } from '@/lib/constants';

interface UserProfile {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'employee';
  department?: string;
}

interface OverviewStats {
  totalEmployees: number;
  activeEmployees: number;
  totalTasks: number;
  notStartedTasks: number;
  startedTasks: number;
  halfwayTasks: number;
  completedTasks: number;
  vUrgentTasks: number;
  urgentTasks: number;
}

interface WorkloadRow {
  employee_id: number;
  employee_name: string;
  employee_email: string;
  department: string;
  is_active: number;
  total: number;
  not_started: number;
  started: number;
  halfway: number;
  completed: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  // Admin stats
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [workload, setWorkload] = useState<WorkloadRow[]>([]);

  // Tasks (for employee or preview)
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);

  // Modals
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);

  // Filters for employee dashboard
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Fetch Current Authenticated User
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
          if (data.hasNoWorkspace) {
            router.push('/workspaces/find');
            return;
          }
          setCurrentUser(data.user);
        } else {
          router.push('/login');
        }
      } catch {
        router.push('/login');
      } finally {
        setLoadingUser(false);
      }
    };

    checkAuth();
  }, [router]);

  // 2. Fetch Dashboard Data
  const fetchData = useCallback(async () => {
    if (!currentUser) return;

    if (currentUser.role === 'admin') {
      try {
        const statsRes = await fetch('/api/stats');
        const statsData = await statsRes.json();
        if (statsData.overview) setStats(statsData.overview);
        if (statsData.workload) setWorkload(statsData.workload);

        // Also fetch recent tasks for quick view
        const tasksRes = await fetch('/api/tasks');
        const tasksData = await tasksRes.json();
        if (tasksData.tasks) setTasks(tasksData.tasks);
      } catch (err) {
        console.error('Failed to fetch admin stats:', err);
      }
    } else {
      // Regular Employee: fetch their strictly assigned tasks
      try {
        setLoadingTasks(true);
        let url = '/api/tasks';
        const params = new URLSearchParams();
        if (statusFilter !== 'all') params.set('status', statusFilter);
        if (priorityFilter !== 'all') params.set('priority', priorityFilter);
        if (searchQuery) params.set('search', searchQuery);

        if (params.toString()) url += `?${params.toString()}`;

        const res = await fetch(url);
        const data = await res.json();
        if (data.tasks) setTasks(data.tasks);
      } catch (err) {
        console.error('Failed to fetch employee tasks:', err);
      } finally {
        setLoadingTasks(false);
      }
    }
  }, [currentUser, statusFilter, priorityFilter, searchQuery]);

  useEffect(() => {
    if (currentUser) {
      fetchData();
    }
  }, [currentUser, fetchData]);

  // Handle Quick Status Change
  const handleStatusChange = async (taskId: number, newStatus: StatusType) => {
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to update task status');
    }

    // Refresh state immediately
    await fetchData();

    // If detail modal is open for this task, update it
    if (selectedTask && selectedTask.id === taskId) {
      const updated = tasks.find((t) => t.id === taskId);
      if (updated) setSelectedTask({ ...updated, status: newStatus });
    }
  };

  const handleArchiveTask = async (taskId: number) => {
    const res = await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to archive task');
    }
    await fetchData();
  };

  if (loadingUser || !currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-medium text-slate-600">Loading your workspace...</p>
        </div>
      </div>
    );
  }

  // Calculate personal metrics for employee
  const empTotal = tasks.length;
  const empNotStarted = tasks.filter((t) => t.status === 'Not Started').length;
  const empStarted = tasks.filter((t) => t.status === 'Started').length;
  const empHalfway = tasks.filter((t) => t.status === 'Half-way').length;
  const empCompleted = tasks.filter((t) => t.status === 'Completed').length;

  return (
    <AppLayout
      user={currentUser}
      onOpenCreateTask={() => {
        setTaskToEdit(null);
        setIsFormOpen(true);
      }}
    >
      {/* EMPLOYEE DASHBOARD VIEW */}
      {currentUser.role === 'employee' ? (
        <div className="space-y-6">
          {/* Welcome Banner */}
          <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="relative z-10 max-w-2xl space-y-2">
              <span className="inline-block text-xs font-semibold uppercase tracking-widest text-indigo-300">
                Personal Workstation
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Good morning, {currentUser.name}!
              </h2>
              <p className="text-sm text-indigo-100">
                Here is your prioritized list of assigned work. Critical priorities (V. Urgent & Urgent) always appear first.
              </p>
            </div>
            <div className="relative z-10 shrink-0">
              <Link
                href="/my-tasks"
                className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-xs backdrop-blur-xs border border-white/20 shadow-xs transition-colors"
              >
                <span>View My Tasks (Active & History) →</span>
              </Link>
            </div>
            <div className="absolute right-0 bottom-0 translate-x-8 translate-y-8 w-64 h-64 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
          </div>

          {/* Employee Summary Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-xs font-medium text-slate-500 block">Total Assigned</span>
              <span className="text-2xl font-bold text-slate-900 mt-1 block">{empTotal}</span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center space-x-1.5 text-xs font-medium text-zinc-500">
                <CircleDashed className="w-3.5 h-3.5 text-zinc-400" />
                <span>Not Started</span>
              </div>
              <span className="text-2xl font-bold text-zinc-800 mt-1 block">{empNotStarted}</span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center space-x-1.5 text-xs font-medium text-sky-600">
                <PlayCircle className="w-3.5 h-3.5 text-sky-500" />
                <span>Started</span>
              </div>
              <span className="text-2xl font-bold text-sky-700 mt-1 block">{empStarted}</span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center space-x-1.5 text-xs font-medium text-purple-600">
                <Clock className="w-3.5 h-3.5 text-purple-500" />
                <span>Half-way</span>
              </div>
              <span className="text-2xl font-bold text-purple-700 mt-1 block">{empHalfway}</span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs col-span-2 sm:col-span-1">
              <div className="flex items-center space-x-1.5 text-xs font-medium text-emerald-600">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>Completed</span>
              </div>
              <span className="text-2xl font-bold text-emerald-700 mt-1 block">{empCompleted}</span>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative w-full md:w-80">
              <input
                type="text"
                placeholder="Search my tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <div className="flex items-center space-x-1 text-xs text-slate-500">
                <Filter className="w-3.5 h-3.5" />
                <span className="font-semibold">Priority:</span>
              </div>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">All Priorities</option>
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>

              <div className="flex items-center space-x-1 text-xs text-slate-500 ml-2">
                <span className="font-semibold">Status:</span>
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">All Statuses</option>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Assigned Work Header */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900">My Assigned Work</h3>
              <p className="text-xs text-slate-500">
                Sorted by: V. Urgent → Urgent → EOD → End of Week → 15 Days → End of Month
              </p>
            </div>
            <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200">
              {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
            </span>
          </div>

          {/* Task List / Cards */}
          {loadingTasks ? (
            <div className="py-12 text-center text-xs text-slate-500">Loading your tasks...</div>
          ) : tasks.length === 0 ? (
            <div className="py-16 text-center bg-white rounded-2xl border border-dashed border-slate-300 p-8">
              <CheckCircle2 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <h4 className="text-sm font-semibold text-slate-700">No tasks found</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                {searchQuery || statusFilter !== 'all' || priorityFilter !== 'all'
                  ? 'No tasks match your filter criteria.'
                  : 'You have no pending assigned work right now. Enjoy your day!'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-2xs hover:shadow-md transition-shadow flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div
                    className="flex-1 space-y-2 cursor-pointer"
                    onClick={() => {
                      setSelectedTask(task);
                      setIsDetailOpen(true);
                    }}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <PriorityBadge priority={task.priority} size="sm" />
                      <StatusBadge status={task.status} size="sm" />
                      {task.department && (
                        <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                          {task.department}
                        </span>
                      )}
                      {task.due_date && (
                        <span className="text-[11px] font-medium text-slate-600 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded">
                          Due: {task.due_date}
                        </span>
                      )}
                    </div>

                    <div>
                      <h4 className="text-base font-bold text-slate-900 group-hover:text-indigo-600">
                        {task.task_name}
                      </h4>
                      {task.description && (
                        <p className="text-xs text-slate-600 line-clamp-2 mt-0.5">
                          {task.description}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400">
                      <span>Assigned by: <strong className="text-slate-600">{task.created_by_name || 'Admin'}</strong></span>
                      <span>Last updated: {new Date(task.updated_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Right side actions */}
                  <div className="flex flex-wrap items-center gap-2.5 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
                    {/* Status Dropdown */}
                    <select
                      value={task.status}
                      onChange={(e) => handleStatusChange(task.id, e.target.value as StatusType)}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 bg-white shadow-2xs cursor-pointer focus:ring-2 focus:ring-indigo-500"
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>

                    {/* Work Link Button */}
                    {task.drive_link ? (
                      <a
                        href={task.drive_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs border border-indigo-200 transition-colors shrink-0"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Open Work ↗</span>
                      </a>
                    ) : (
                      <span className="text-[11px] text-slate-400 italic px-2">No link</span>
                    )}

                    <button
                      onClick={() => {
                        setSelectedTask(task);
                        setIsDetailOpen(true);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
                    >
                      Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* ADMIN DASHBOARD VIEW */
        <div className="space-y-8">
          {/* Header & Quick Action */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                Organization Operations Center
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Real-time tracking of team assignments, priority workload, and delivery metrics.
              </p>
            </div>
            <button
              onClick={() => {
                setTaskToEdit(null);
                setIsFormOpen(true);
              }}
              className="inline-flex items-center space-x-2 py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md transition-all cursor-pointer self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Task</span>
            </button>
          </div>

          {/* Key Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block">
                  Active Team Members
                </span>
                <span className="text-3xl font-extrabold text-slate-900 mt-1 block">
                  {stats?.activeEmployees ?? 0}
                </span>
                <span className="text-[11px] text-slate-400 mt-0.5 block">
                  Out of {stats?.totalEmployees ?? 0} registered
                </span>
              </div>
              <div className="h-12 w-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                <Users className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block">
                  Total Active Tasks
                </span>
                <span className="text-3xl font-extrabold text-slate-900 mt-1 block">
                  {stats?.totalTasks ?? 0}
                </span>
                <span className="text-[11px] text-slate-400 mt-0.5 block">
                  {stats?.completedTasks ?? 0} completed
                </span>
              </div>
              <div className="h-12 w-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <CheckCircle2 className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-red-100 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-xs font-medium text-red-600 uppercase tracking-wider block">
                  V. Urgent Tasks
                </span>
                <span className="text-3xl font-extrabold text-red-700 mt-1 block">
                  {stats?.vUrgentTasks ?? 0}
                </span>
                <span className="text-[11px] text-red-500 mt-0.5 block">
                  Requires immediate focus
                </span>
              </div>
              <div className="h-12 w-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-bold">
                <Flame className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-orange-100 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-xs font-medium text-orange-600 uppercase tracking-wider block">
                  Urgent Tasks
                </span>
                <span className="text-3xl font-extrabold text-orange-700 mt-1 block">
                  {stats?.urgentTasks ?? 0}
                </span>
                <span className="text-[11px] text-orange-500 mt-0.5 block">High attention</span>
              </div>
              <div className="h-12 w-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold">
                <AlertTriangle className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Team Workload Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Team Workload Distribution</h3>
                <p className="text-xs text-slate-500">
                  Current distribution of active tasks across employees
                </p>
              </div>
              <button
                onClick={() => router.push('/team')}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer"
              >
                Manage Employees →
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-6">Employee</th>
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center font-bold text-slate-800">Total Tasks</th>
                    <th className="py-3 px-4 text-center text-zinc-600">Not Started</th>
                    <th className="py-3 px-4 text-center text-sky-600">Started</th>
                    <th className="py-3 px-4 text-center text-purple-600">Half-way</th>
                    <th className="py-3 px-4 text-center text-emerald-600">Completed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                  {workload.map((emp) => (
                    <tr key={emp.employee_id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-6 font-semibold text-slate-900">
                        {emp.employee_name}
                        <span className="block text-[11px] text-slate-400 font-normal">
                          {emp.employee_email}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">{emp.department || '—'}</td>
                      <td className="py-3.5 px-4 text-center">
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
                      <td className="py-3.5 px-4 text-center font-black text-slate-900 text-sm">
                        {emp.total}
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-zinc-600">
                        {emp.not_started}
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-sky-600">
                        {emp.started}
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-purple-600">
                        {emp.halfway}
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-emerald-600">
                        {emp.completed}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick High-Priority Organization Tasks Preview */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Priority Tasks Queue (Top Overview)
                </h3>
                <p className="text-xs text-slate-500">
                  Tasks strictly ordered by priority: V. Urgent → Urgent → EOD → End of Week → 15 Days → End of Month
                </p>
              </div>
              <button
                onClick={() => router.push('/all-tasks')}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer"
              >
                View All {tasks.length} Tasks →
              </button>
            </div>

            <div className="space-y-2.5">
              {tasks.slice(0, 5).map((task) => (
                <div
                  key={task.id}
                  onClick={() => {
                    setSelectedTask(task);
                    setIsDetailOpen(true);
                  }}
                  className="p-3.5 rounded-xl border border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer transition-all"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <PriorityBadge priority={task.priority} size="sm" />
                      <StatusBadge status={task.status} size="sm" />
                      <span className="text-xs font-semibold text-slate-500">
                        Assigned to: <span className="text-indigo-700">{task.assigned_to_name}</span>
                      </span>
                    </div>
                    <div className="text-sm font-bold text-slate-900">{task.task_name}</div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    {task.drive_link && (
                      <a
                        href={task.drive_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center space-x-1 px-2.5 py-1 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Work Link</span>
                      </a>
                    )}
                    <span className="text-xs font-medium text-slate-400">
                      Due: {task.due_date || 'No date'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Task Detail Modal */}
      <TaskDetailModal
        isOpen={isDetailOpen}
        task={selectedTask}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedTask(null);
        }}
        currentUser={currentUser}
        onStatusChange={handleStatusChange}
        onEditTask={(t) => {
          setTaskToEdit(t);
          setIsFormOpen(true);
        }}
        onArchiveTask={handleArchiveTask}
        onTaskUpdated={(updated) => {
          setSelectedTask(updated);
          setTasks((prev) => prev.map((t) => (t.id === updated.id ? { ...t, ...updated } : t)));
        }}
      />

      {/* Task Form Modal (Create / Edit) */}
      <TaskFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setTaskToEdit(null);
        }}
        onSuccess={fetchData}
        taskToEdit={taskToEdit}
      />
    </AppLayout>
  );
}
