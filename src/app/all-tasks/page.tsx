'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  Filter,
  Plus,
  ExternalLink,
  Edit2,
  Trash2,
  Layers,
  ArrowRight,
  User,
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
}

interface EmployeeOption {
  id: number;
  name: string;
  department?: string;
  role?: string;
  is_active: number;
}

export default function AllTasksPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);

  // Modals
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [assignedToFilter, setAssignedToFilter] = useState('all');
  const [assignedByFilter, setAssignedByFilter] = useState('all');

  // Verify auth & admin status
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

  // Fetch all employees for both Assigned To and Assigned By dropdowns
  useEffect(() => {
    if (!currentUser || currentUser.role !== 'admin') return;

    const loadEmployees = async () => {
      try {
        const res = await fetch('/api/employees');
        const data = await res.json();
        if (data.employees) {
          setEmployees(data.employees);
        }
      } catch (err) {
        console.error('Error loading employees:', err);
      }
    };

    loadEmployees();
  }, [currentUser]);

  // Fetch all tasks with filters
  const fetchTasks = useCallback(async () => {
    if (!currentUser || currentUser.role !== 'admin') return;

    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (priorityFilter !== 'all') params.set('priority', priorityFilter);
      if (assignedToFilter !== 'all') params.set('assignedTo', assignedToFilter);
      if (assignedByFilter !== 'all') params.set('assignedBy', assignedByFilter);

      const url = `/api/tasks?${params.toString()}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.tasks) {
        setTasks(data.tasks);
      }
    } catch (err) {
      console.error('Error fetching tasks:', err);
    }
  }, [currentUser, search, statusFilter, priorityFilter, assignedToFilter, assignedByFilter]);

  useEffect(() => {
    if (currentUser) {
      fetchTasks();
    }
  }, [currentUser, fetchTasks]);

  const handleStatusChange = async (taskId: number, newStatus: StatusType) => {
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to update status');
    }

    await fetchTasks();
    if (selectedTask && selectedTask.id === taskId) {
      setSelectedTask((prev) => (prev ? { ...prev, status: newStatus } : null));
    }
  };

  const handleArchiveTask = async (taskId: number) => {
    const res = await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to archive task');
    }
    await fetchTasks();
  };

  if (loading || !currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <AppLayout
      user={currentUser}
      onOpenCreateTask={() => {
        setTaskToEdit(null);
        setIsFormOpen(true);
      }}
    >
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Layers className="w-6 h-6 text-indigo-600" />
              <span>All Organization Tasks</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Hierarchical view: V. Urgent → Urgent → EOD → End of Week → 15 Days → End of Month. Filter by Assigned By, Assigned To, Priority, and Status.
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
            <span>+ Create Task</span>
          </button>
        </div>

        {/* Multi-Parameter Filter Controls */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative w-full md:w-80">
              <input
                type="text"
                placeholder="Search tasks, descriptions, notes, names..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              {/* Filter by Assigned By */}
              <div className="flex items-center space-x-1.5">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Assigned By:
                </span>
                <select
                  value={assignedByFilter}
                  onChange={(e) => setAssignedByFilter(e.target.value)}
                  className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="all">All Assigners</option>
                  {employees.map((emp) => (
                    <option key={`by-${emp.id}`} value={emp.id}>
                      {emp.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filter by Assigned To */}
              <div className="flex items-center space-x-1.5">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Assigned To:
                </span>
                <select
                  value={assignedToFilter}
                  onChange={(e) => setAssignedToFilter(e.target.value)}
                  className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="all">All Employees</option>
                  {employees.map((emp) => (
                    <option key={`to-${emp.id}`} value={emp.id}>
                      {emp.name} {!emp.is_active ? '(Inactive)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filter by Priority */}
              <div className="flex items-center space-x-1.5">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Priority:
                </span>
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="all">All</option>
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filter by Status */}
              <div className="flex items-center space-x-1.5">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Status:
                </span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="all">All</option>
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {(assignedByFilter !== 'all' || assignedToFilter !== 'all' || priorityFilter !== 'all' || statusFilter !== 'all' || search) && (
            <div className="pt-2 flex items-center justify-between text-xs text-indigo-700 border-t border-slate-100">
              <span>Showing filtered results ({tasks.length} tasks matched)</span>
              <button
                onClick={() => {
                  setSearch('');
                  setStatusFilter('all');
                  setPriorityFilter('all');
                  setAssignedToFilter('all');
                  setAssignedByFilter('all');
                }}
                className="font-semibold hover:underline cursor-pointer"
              >
                Reset All Filters
              </button>
            </div>
          )}
        </div>

        {/* Task Table: Exposing BOTH Assigned By and Assigned To */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-6">Task</th>
                  <th className="py-3.5 px-4">Assigned To</th>
                  <th className="py-3.5 px-4">Assigned By</th>
                  <th className="py-3.5 px-4">Priority</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Due Date</th>
                  <th className="py-3.5 px-4">Drive / Work</th>
                  <th className="py-3.5 px-4 text-right pr-6">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {tasks.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      No tasks found matching your filters.
                    </td>
                  </tr>
                ) : (
                  tasks.map((task) => (
                    <tr
                      key={task.id}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                      onClick={() => {
                        setSelectedTask(task);
                        setIsDetailOpen(true);
                      }}
                    >
                      {/* Task Name & Desc */}
                      <td className="py-3.5 px-6 max-w-xs">
                        <span className="font-bold text-slate-900 block truncate">
                          {task.task_name}
                        </span>
                        {task.description && (
                          <span className="text-[11px] text-slate-500 block truncate">
                            {task.description}
                          </span>
                        )}
                      </td>

                      {/* Assigned To */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-bold text-slate-900 block">
                          {task.assigned_to_name || `User #${task.assigned_to}`}
                        </span>
                        {task.assigned_to_department && (
                          <span className="text-[10px] text-slate-400 block">
                            {task.assigned_to_department}
                          </span>
                        )}
                        {task.assigned_to_is_active === 0 && (
                          <span className="inline-block text-[9px] font-bold text-amber-700 bg-amber-100 px-1 rounded">
                            Inactive Employee
                          </span>
                        )}
                      </td>

                      {/* Assigned By */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-semibold text-slate-700 block">
                          {task.assigned_by_name || task.created_by_name || `User #${task.created_by}`}
                        </span>
                      </td>

                      {/* Priority */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <PriorityBadge priority={task.priority} size="sm" />
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <select
                          value={task.status}
                          onChange={(e) => handleStatusChange(task.id, e.target.value as StatusType)}
                          className="px-2 py-1 rounded-md border border-slate-200 text-xs font-semibold bg-white cursor-pointer shadow-2xs focus:ring-2 focus:ring-indigo-500"
                        >
                          {STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Due Date */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-600">
                        {task.due_date || '—'}
                      </td>

                      {/* Drive Link */}
                      <td className="py-3.5 px-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        {task.drive_link ? (
                          <a
                            href={task.drive_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center space-x-1 px-2.5 py-1 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs border border-indigo-200 transition-colors"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>Open Link</span>
                          </a>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">None</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right pr-6 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => {
                              setTaskToEdit(task);
                              setIsFormOpen(true);
                            }}
                            title="Edit / Reassign"
                            className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-200 transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={async () => {
                              if (window.confirm('Archive this task?')) {
                                await handleArchiveTask(task.id);
                              }
                            }}
                            title="Archive Task"
                            className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

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

      {/* Task Form Modal */}
      <TaskFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setTaskToEdit(null);
        }}
        onSuccess={fetchTasks}
        taskToEdit={taskToEdit}
      />
    </AppLayout>
  );
}
