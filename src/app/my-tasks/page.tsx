'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2,
  CircleDashed,
  ExternalLink,
  Search,
  History,
  Calendar,
  Layers,
  User,
  Plus,
  ArrowUpRight,
  Send,
  Clock,
  AlertTriangle,
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
  animal_emoji?: string;
}

export default function MyTasksPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  // Top-Level Task View: 'my_tasks' | 'assigned_by_me'
  const [taskView, setTaskView] = useState<'my_tasks' | 'assigned_by_me'>('my_tasks');

  // Sub-tabs for "My Tasks": 'active' | 'completed' | 'history'
  const [activeTab, setActiveTab] = useState<'active' | 'completed' | 'history'>('active');

  // Task lists
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);

  // Summary counts for My Tasks
  const [myTasksCounts, setMyTasksCounts] = useState<{ active: number; completed: number; history: number }>({
    active: 0,
    completed: 0,
    history: 0,
  });

  // Summary counts for Assigned by Me
  const [assignedCounts, setAssignedCounts] = useState<{
    total: number;
    active: number;
    completed: number;
    overdue: number;
  }>({
    total: 0,
    active: 0,
    completed: 0,
    overdue: 0,
  });

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [assignedByFilter, setAssignedByFilter] = useState('all');
  const [assignedToFilter, setAssignedToFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'priority' | 'due_date' | 'created_at' | 'assignee'>('priority');

  // Lists of unique users for filter dropdowns
  const [assigners, setAssigners] = useState<{ id: number; name: string }[]>([]);
  const [assignees, setAssignees] = useState<{ id: number; name: string }[]>([]);

  // Modals
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);

  // 1. Authenticate user
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
        setLoadingUser(false);
      }
    };
    checkAuth();
  }, [router]);

  // 2. Fetch counts for both My Tasks and Assigned by Me
  const fetchCounts = useCallback(async () => {
    try {
      const [activeRes, completedRes, historyRes, assignedRes] = await Promise.all([
        fetch('/api/tasks?mode=active'),
        fetch('/api/tasks?mode=completed'),
        fetch('/api/tasks?mode=history'),
        fetch('/api/tasks?view=assigned_by_me'),
      ]);

      const [activeData, completedData, historyData, assignedData] = await Promise.all([
        activeRes.json(),
        completedRes.json(),
        historyRes.json(),
        assignedRes.json(),
      ]);

      setMyTasksCounts({
        active: activeData.tasks?.length || 0,
        completed: completedData.tasks?.length || 0,
        history: historyData.tasks?.length || 0,
      });

      // Extract unique assigners from history for the filter dropdown
      if (historyData.tasks) {
        const map = new Map<number, string>();
        historyData.tasks.forEach((t: Task) => {
          if (t.created_by && t.created_by_name) {
            map.set(t.created_by, t.created_by_name);
          }
        });
        const list = Array.from(map.entries()).map(([id, name]) => ({ id, name }));
        setAssigners(list);
      }

      // Calculate stats for Assigned by Me
      if (assignedData.tasks) {
        const aList: Task[] = assignedData.tasks;
        const todayStr = new Date().toISOString().split('T')[0];
        let activeCount = 0;
        let completedCount = 0;
        let overdueCount = 0;

        const assigneeMap = new Map<number, string>();

        aList.forEach((t) => {
          if (t.status === 'Completed') {
            completedCount++;
          } else {
            activeCount++;
            if (t.due_date && t.due_date < todayStr) {
              overdueCount++;
            }
          }

          if (t.assigned_to && t.assigned_to_name) {
            assigneeMap.set(t.assigned_to, t.assigned_to_name);
          }
        });

        setAssignedCounts({
          total: aList.length,
          active: activeCount,
          completed: completedCount,
          overdue: overdueCount,
        });

        setAssignees(Array.from(assigneeMap.entries()).map(([id, name]) => ({ id, name })));
      }
    } catch (err) {
      console.error('Failed to fetch task counts:', err);
    }
  }, []);

  // 3. Fetch Tasks for current view and filters
  const fetchTasks = useCallback(async () => {
    if (!currentUser) return;
    try {
      setLoadingTasks(true);
      const params = new URLSearchParams();

      if (taskView === 'assigned_by_me') {
        params.set('view', 'assigned_by_me');
        if (assignedToFilter !== 'all') params.set('assignedTo', assignedToFilter);
      } else {
        params.set('mode', activeTab);
        if (assignedByFilter !== 'all') params.set('assignedBy', assignedByFilter);
      }

      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      if (statusFilter !== 'all' && statusFilter !== 'Overdue') {
        params.set('status', statusFilter);
      }
      if (priorityFilter !== 'all') params.set('priority', priorityFilter);

      const res = await fetch(`/api/tasks?${params.toString()}`);
      const data = await res.json();
      let list: Task[] = data.tasks || [];

      const todayStr = new Date().toISOString().split('T')[0];

      // Handle Overdue filter
      if (statusFilter === 'Overdue') {
        list = list.filter((t) => t.status !== 'Completed' && t.due_date && t.due_date < todayStr);
      }

      // Client-side date filter if specified
      if (dateFilter) {
        list = list.filter((t) => {
          const created = t.created_at ? t.created_at.slice(0, 10) : '';
          const due = t.due_date || '';
          const completed = t.completed_at ? t.completed_at.slice(0, 10) : '';
          return created === dateFilter || due === dateFilter || completed === dateFilter;
        });
      }

      // Sort client-side if requested
      if (sortBy === 'due_date') {
        list = [...list].sort((a, b) => (a.due_date || '9999').localeCompare(b.due_date || '9999'));
      } else if (sortBy === 'created_at') {
        list = [...list].sort((a, b) => b.created_at.localeCompare(a.created_at));
      } else if (sortBy === 'assignee') {
        list = [...list].sort((a, b) => (a.assigned_to_name || '').localeCompare(b.assigned_to_name || ''));
      }

      setTasks(list);
    } catch (err) {
      console.error('Failed to load tasks:', err);
    } finally {
      setLoadingTasks(false);
    }
  }, [
    currentUser,
    taskView,
    activeTab,
    searchQuery,
    statusFilter,
    priorityFilter,
    assignedByFilter,
    assignedToFilter,
    dateFilter,
    sortBy,
  ]);

  useEffect(() => {
    if (currentUser) {
      fetchCounts();
    }
  }, [currentUser, fetchCounts]);

  useEffect(() => {
    if (currentUser) {
      fetchTasks();
    }
  }, [currentUser, fetchTasks]);

  // Handle status change from task card or modal
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

    // Refresh current view & counts immediately
    await fetchTasks();
    await fetchCounts();

    if (selectedTask && selectedTask.id === taskId) {
      setSelectedTask((prev) => (prev ? { ...prev, status: newStatus } : null));
    }
  };

  const formatDate = (iso?: string | null) => {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return iso;
    }
  };

  const isOverdue = (task: Task) => {
    if (task.status === 'Completed' || !task.due_date) return false;
    const todayStr = new Date().toISOString().split('T')[0];
    return task.due_date < todayStr;
  };

  if (loadingUser || !currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-medium text-slate-600">Loading Tasks...</p>
        </div>
      </div>
    );
  }

  return (
    <AppLayout
      user={currentUser}
      onOpenCreateTask={() => setIsFormOpen(true)}
    >
      <div className="space-y-6">
        {/* TOP-LEVEL WORKSPACE TABS: [ My Tasks ] [ Assigned by Me ] */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200 shadow-2xs">
              <button
                onClick={() => {
                  setTaskView('my_tasks');
                  setStatusFilter('all');
                  setSearchQuery('');
                }}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                  taskView === 'my_tasks'
                    ? 'bg-white text-indigo-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>My Tasks</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  taskView === 'my_tasks' ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-200 text-slate-600'
                }`}>
                  {myTasksCounts.active}
                </span>
              </button>

              <button
                onClick={() => {
                  setTaskView('assigned_by_me');
                  setStatusFilter('all');
                  setSearchQuery('');
                }}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                  taskView === 'assigned_by_me'
                    ? 'bg-white text-indigo-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Send className="w-3.5 h-3.5" />
                <span>Assigned by Me</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  taskView === 'assigned_by_me' ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-200 text-slate-600'
                }`}>
                  {assignedCounts.total}
                </span>
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              {taskView === 'my_tasks'
                ? 'Tasks assigned to you. Track your active priorities, completed work, and assignment history.'
                : 'Tasks you have delegated or assigned to team members. Monitor their real-time execution status.'}
            </p>
          </div>

          <button
            onClick={() => setIsFormOpen(true)}
            className="inline-flex items-center space-x-2 py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md transition-all cursor-pointer self-start sm:self-auto shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>+ Create Task</span>
          </button>
        </div>

        {/* ----------------- VIEW 1: MY TASKS (Assigned TO Me) ----------------- */}
        {taskView === 'my_tasks' && (
          <>
            {/* Dynamic Summary Cards: Active | Completed | History */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <button
                onClick={() => {
                  setActiveTab('active');
                  setStatusFilter('all');
                }}
                className={`p-4 rounded-xl border text-left transition-all cursor-pointer shadow-2xs ${
                  activeTab === 'active'
                    ? 'bg-indigo-600 text-white border-indigo-700 shadow-md ring-2 ring-indigo-500/30'
                    : 'bg-white text-slate-800 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold uppercase tracking-wider ${activeTab === 'active' ? 'text-indigo-200' : 'text-slate-500'}`}>
                    Active Tasks
                  </span>
                  <CircleDashed className={`w-4 h-4 ${activeTab === 'active' ? 'text-indigo-200' : 'text-indigo-600'}`} />
                </div>
                <div className="mt-2 flex items-baseline space-x-2">
                  <span className="text-3xl font-extrabold tracking-tight">{myTasksCounts.active}</span>
                  <span className={`text-xs font-medium ${activeTab === 'active' ? 'text-indigo-100' : 'text-slate-400'}`}>
                    requires action
                  </span>
                </div>
              </button>

              <button
                onClick={() => {
                  setActiveTab('completed');
                  setStatusFilter('all');
                }}
                className={`p-4 rounded-xl border text-left transition-all cursor-pointer shadow-2xs ${
                  activeTab === 'completed'
                    ? 'bg-emerald-600 text-white border-emerald-700 shadow-md ring-2 ring-emerald-500/30'
                    : 'bg-white text-slate-800 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold uppercase tracking-wider ${activeTab === 'completed' ? 'text-emerald-100' : 'text-slate-500'}`}>
                    Completed
                  </span>
                  <CheckCircle2 className={`w-4 h-4 ${activeTab === 'completed' ? 'text-emerald-100' : 'text-emerald-600'}`} />
                </div>
                <div className="mt-2 flex items-baseline space-x-2">
                  <span className="text-3xl font-extrabold tracking-tight">{myTasksCounts.completed}</span>
                  <span className={`text-xs font-medium ${activeTab === 'completed' ? 'text-emerald-100' : 'text-slate-400'}`}>
                    finished tasks
                  </span>
                </div>
              </button>

              <button
                onClick={() => {
                  setActiveTab('history');
                  setStatusFilter('all');
                }}
                className={`p-4 rounded-xl border text-left transition-all cursor-pointer shadow-2xs ${
                  activeTab === 'history'
                    ? 'bg-slate-800 text-white border-slate-900 shadow-md ring-2 ring-slate-700/30'
                    : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold uppercase tracking-wider ${activeTab === 'history' ? 'text-slate-300' : 'text-slate-500'}`}>
                    Task History
                  </span>
                  <History className={`w-4 h-4 ${activeTab === 'history' ? 'text-slate-300' : 'text-slate-600'}`} />
                </div>
                <div className="mt-2 flex items-baseline space-x-2">
                  <span className="text-3xl font-extrabold tracking-tight">{myTasksCounts.history}</span>
                  <span className={`text-xs font-medium ${activeTab === 'history' ? 'text-slate-300' : 'text-slate-400'}`}>
                    all previous work
                  </span>
                </div>
              </button>
            </div>

            {/* Sub-section Navigation Tabs */}
            <div className="flex items-center space-x-2 border-b border-slate-200 pb-2">
              <button
                onClick={() => setActiveTab('active')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center space-x-2 ${
                  activeTab === 'active'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span>Active</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === 'active' ? 'bg-indigo-700 text-white' : 'bg-slate-200 text-slate-700'}`}>
                  {myTasksCounts.active}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('completed')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center space-x-2 ${
                  activeTab === 'completed'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span>Completed</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === 'completed' ? 'bg-emerald-700 text-white' : 'bg-slate-200 text-slate-700'}`}>
                  {myTasksCounts.completed}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('history')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center space-x-2 ${
                  activeTab === 'history'
                    ? 'bg-slate-800 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span>History</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === 'history' ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-700'}`}>
                  {myTasksCounts.history}
                </span>
              </button>
            </div>
          </>
        )}

        {/* ----------------- VIEW 2: ASSIGNED BY ME (Assigned BY Me) ----------------- */}
        {taskView === 'assigned_by_me' && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Total Delegated
              </span>
              <div className="text-2xl font-black text-slate-900">{assignedCounts.total}</div>
              <span className="text-[10px] text-slate-400">Tasks assigned by you</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-2xs bg-blue-50/20">
              <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider block mb-1">
                In Progress / Active
              </span>
              <div className="text-2xl font-black text-blue-900">{assignedCounts.active}</div>
              <span className="text-[10px] text-blue-600">Pending team completion</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-emerald-100 shadow-2xs bg-emerald-50/20">
              <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block mb-1">
                Completed
              </span>
              <div className="text-2xl font-black text-emerald-900">{assignedCounts.completed}</div>
              <span className="text-[10px] text-emerald-600">Successfully delivered</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-rose-100 shadow-2xs bg-rose-50/20">
              <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider block mb-1">
                Overdue
              </span>
              <div className="text-2xl font-black text-rose-900">{assignedCounts.overdue}</div>
              <span className="text-[10px] text-rose-600">Action required</span>
            </div>
          </div>
        )}

        {/* ----------------- COMMON FILTER BAR ----------------- */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
            {/* Search */}
            <div className="relative w-full md:w-80">
              <input
                type="text"
                placeholder={
                  taskView === 'assigned_by_me'
                    ? 'Search assigned tasks or assignee name...'
                    : activeTab === 'active'
                    ? 'Search active tasks...'
                    : activeTab === 'completed'
                    ? 'Search completed tasks...'
                    : 'Search task history...'
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto text-xs">
              {/* Status Filter for Assigned by Me or History */}
              {(taskView === 'assigned_by_me' || activeTab === 'history') && (
                <div className="flex items-center space-x-1.5">
                  <span className="font-semibold text-slate-500">Status:</span>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    <option value="all">All Statuses</option>
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                    {taskView === 'assigned_by_me' && <option value="Overdue">Overdue Only</option>}
                  </select>
                </div>
              )}

              {/* Assignee Filter in "Assigned by Me" */}
              {taskView === 'assigned_by_me' && assignees.length > 0 && (
                <div className="flex items-center space-x-1.5">
                  <span className="font-semibold text-slate-500">Assigned To:</span>
                  <select
                    value={assignedToFilter}
                    onChange={(e) => setAssignedToFilter(e.target.value)}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    <option value="all">All Assignees</option>
                    {assignees.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Priority Filter */}
              <div className="flex items-center space-x-1.5">
                <span className="font-semibold text-slate-500">Priority:</span>
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="all">All Priorities</option>
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              {/* Assigned By Filter (My Tasks -> History tab) */}
              {taskView === 'my_tasks' && activeTab === 'history' && assigners.length > 0 && (
                <div className="flex items-center space-x-1.5">
                  <span className="font-semibold text-slate-500">Assigned By:</span>
                  <select
                    value={assignedByFilter}
                    onChange={(e) => setAssignedByFilter(e.target.value)}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    <option value="all">Everyone</option>
                    {assigners.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Sort By in Assigned by Me */}
              {taskView === 'assigned_by_me' && (
                <div className="flex items-center space-x-1.5">
                  <span className="font-semibold text-slate-500">Sort:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    <option value="priority">Priority Rank</option>
                    <option value="due_date">Due Date</option>
                    <option value="created_at">Recently Created</option>
                    <option value="assignee">Assignee Name</option>
                  </select>
                </div>
              )}

              {/* Specific Date Filter */}
              <div className="flex items-center space-x-1.5">
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500"
                  title="Filter by exact date"
                />
              </div>

              {/* Reset Filters */}
              {(searchQuery || statusFilter !== 'all' || priorityFilter !== 'all' || dateFilter || assignedByFilter !== 'all' || assignedToFilter !== 'all') && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('all');
                    setPriorityFilter('all');
                    setDateFilter('');
                    setAssignedByFilter('all');
                    setAssignedToFilter('all');
                    setSortBy('priority');
                  }}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-bold px-2 py-1 hover:underline cursor-pointer"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Task List Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 capitalize">
              {taskView === 'assigned_by_me' && 'Tasks Assigned by You'}
              {taskView === 'my_tasks' && activeTab === 'active' && 'Currently Active Assigned Work'}
              {taskView === 'my_tasks' && activeTab === 'completed' && 'Completed Tasks Archive'}
              {taskView === 'my_tasks' && activeTab === 'history' && 'Historical Task Assignments & Completed Records'}
            </h3>
            <p className="text-xs text-slate-500">
              {taskView === 'assigned_by_me' && 'Live status monitoring of tasks assigned to colleagues.'}
              {taskView === 'my_tasks' && activeTab === 'active' && 'Ordered by priority: V. Urgent → Urgent → EOD → End of Week → 15 Days → End of Month'}
              {taskView === 'my_tasks' && activeTab === 'completed' && 'Permanent record of all work you have completed.'}
              {taskView === 'my_tasks' && activeTab === 'history' && 'Complete record of every task ever assigned to you.'}
            </p>
          </div>
          <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200">
            {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
          </span>
        </div>

        {/* Task Content List */}
        {loadingTasks ? (
          <div className="py-16 text-center text-xs text-slate-500">
            <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <span>Loading tasks...</span>
          </div>
        ) : tasks.length === 0 ? (
          <div className="py-16 text-center bg-white rounded-2xl border border-dashed border-slate-300 p-8 space-y-2">
            <CheckCircle2 className="w-10 h-10 text-slate-300 mx-auto" />
            <h4 className="text-sm font-semibold text-slate-700">No tasks in this section</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {searchQuery || priorityFilter !== 'all' || statusFilter !== 'all' || dateFilter
                ? 'No tasks match the filter criteria.'
                : taskView === 'assigned_by_me'
                ? 'You have not assigned any tasks to other team members yet. Click "+ Create Task" to assign one.'
                : activeTab === 'active'
                ? 'You have completed all your pending tasks! Great job.'
                : activeTab === 'completed'
                ? 'No completed tasks yet. Finish a task in Active to see it archived here.'
                : 'No historical tasks found.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => {
              const isCurrentlyAssignedToMe = task.assigned_to === currentUser.id;
              const overdue = isOverdue(task);

              return (
                <div
                  key={task.id}
                  className={`bg-white rounded-xl border p-4 sm:p-5 shadow-2xs hover:shadow-md transition-shadow flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    overdue ? 'border-rose-300 bg-rose-50/10' : 'border-slate-200'
                  }`}
                >
                  {/* Left Column: Details */}
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

                      {/* Overdue Badge */}
                      {overdue && (
                        <span className="text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-rose-500" />
                          <span>Overdue</span>
                        </span>
                      )}

                      {/* Historical indicator in My Tasks */}
                      {taskView === 'my_tasks' && !isCurrentlyAssignedToMe && (
                        <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                          Previously Assigned to You
                        </span>
                      )}

                      {task.department && (
                        <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                          {task.department}
                        </span>
                      )}

                      {task.due_date && (
                        <span className={`text-[11px] font-medium px-2 py-0.5 rounded flex items-center gap-1 border ${
                          overdue
                            ? 'bg-rose-50 text-rose-700 border-rose-200 font-bold'
                            : 'bg-slate-50 text-slate-600 border-slate-200'
                        }`}>
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>Due: {task.due_date}</span>
                        </span>
                      )}

                      {task.completed_at && (
                        <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          <span>Completed: {formatDate(task.completed_at)}</span>
                        </span>
                      )}
                    </div>

                    <div>
                      <h4 className="text-base font-bold text-slate-900 hover:text-indigo-600 transition-colors">
                        {task.task_name}
                      </h4>
                      {task.description && (
                        <p className="text-xs text-slate-600 line-clamp-2 mt-0.5">
                          {task.description}
                        </p>
                      )}
                    </div>

                    {/* Metadata Grid: Highlight Assigned To prominently */}
                    <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-[11px] text-slate-500">
                      <span className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Assigned to:</span>
                        <strong className="text-slate-900 font-bold">
                          {task.assigned_to_name ? (
                            task.assigned_to === currentUser.id ? 'You' : task.assigned_to_name
                          ) : (
                            `User #${task.assigned_to}`
                          )}
                        </strong>
                      </span>

                      <span>
                        Assigned by: <strong className="text-slate-700">
                          {task.created_by === currentUser.id ? 'You' : task.created_by_name || 'Admin'}
                        </strong>
                      </span>

                      <span>Created: <strong>{formatDate(task.created_at)}</strong></span>
                    </div>
                  </div>

                  {/* Right Column: Actions */}
                  <div className="flex flex-wrap items-center gap-2.5 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 shrink-0">
                    {/* Status updater (for assignee or assigner) */}
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

                    {/* Work / Drive Link */}
                    {task.drive_link ? (
                      <a
                        href={task.drive_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs border border-indigo-200 transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Open Work ↗</span>
                      </a>
                    ) : (
                      <span className="text-[11px] text-slate-400 italic px-2">No link</span>
                    )}

                    {/* Details Modal Button */}
                    <button
                      onClick={() => {
                        setSelectedTask(task);
                        setIsDetailOpen(true);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      Details & Discussion
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Existing Task Detail Modal (reused without modification) */}
      <TaskDetailModal
        task={selectedTask}
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedTask(null);
        }}
        currentUser={currentUser}
        onStatusChange={handleStatusChange}
      />

      {/* Task Creation Modal */}
      <TaskFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        currentUser={currentUser}
        onTaskSaved={async () => {
          await fetchTasks();
          await fetchCounts();
        }}
      />
    </AppLayout>
  );
}
