'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  ExternalLink,
  Calendar,
  User,
  Clock,
  Building,
  FileText,
  AlertCircle,
  CheckCircle2,
  Edit2,
  Trash2,
  History,
  ArrowRight,
  MessageSquare,
  DollarSign,
} from 'lucide-react';
import { PriorityBadge } from './PriorityBadge';
import { StatusBadge } from './StatusBadge';
import { TaskDiscussion } from './TaskDiscussion';
import { PRIORITIES, STATUSES, PriorityType, StatusType } from '@/lib/constants';

export interface Task {
  id: number;
  task_name: string;
  description: string;
  assigned_to: number;
  assigned_to_name?: string;
  assigned_to_email?: string;
  assigned_to_department?: string;
  assigned_to_is_active?: number;
  created_by: number;
  created_by_name?: string;
  assigned_by_name?: string;
  assigned_by_email?: string;
  priority: string;
  priority_rank: number;
  status: string;
  drive_link?: string;
  due_date?: string;
  notes?: string;
  department?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string | null;
  invoice_id?: number | null;
  invoice_number?: string;
  invoice_total_amount?: number;
  client_name?: string;
}

interface AssignmentHistoryItem {
  id: number;
  task_id: number;
  assigned_by_user_id: number;
  assigned_by_name: string;
  assigned_to_user_id: number;
  assigned_to_name: string;
  assigned_at: string;
  notes?: string;
}

interface StatusHistoryItem {
  id: number;
  task_id: number;
  changed_by_user_id: number;
  changed_by_name: string;
  old_status: string;
  new_status: string;
  changed_at: string;
}

interface TaskDetailModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  currentUser: {
    id: number;
    name: string;
    role: 'admin' | 'employee';
  };
  onStatusChange: (taskId: number, newStatus: StatusType) => Promise<void>;
  onEditTask?: (task: Task) => void;
  onArchiveTask?: (taskId: number) => Promise<void>;
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  task,
  isOpen,
  onClose,
  currentUser,
  onStatusChange,
  onEditTask,
  onArchiveTask,
}) => {
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusError, setStatusError] = useState('');
  const [activeTab, setActiveTab] = useState<'details' | 'history' | 'discussion'>('details');
  const [discussionUnread, setDiscussionUnread] = useState(0);

  const [assignmentHistory, setAssignmentHistory] = useState<AssignmentHistoryItem[]>([]);
  const [statusHistory, setStatusHistory] = useState<StatusHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Fetch full details and audit logs on task selection
  useEffect(() => {
    if (!isOpen || !task) return;
    setActiveTab('details');

    const fetchHistory = async () => {
      try {
        setLoadingHistory(true);
        const res = await fetch(`/api/tasks/${task.id}`);
        const data = await res.json();
        if (data.assignmentHistory) setAssignmentHistory(data.assignmentHistory);
        if (data.statusHistory) setStatusHistory(data.statusHistory);
      } catch (err) {
        console.error('Failed to load task history:', err);
      } finally {
        setLoadingHistory(false);
      }
    };

    const fetchDiscussionStats = async () => {
      try {
        const res = await fetch(`/api/chat/task-conversation/${task.id}`);
        if (res.ok) {
          const d = await res.json();
          if (typeof d.unreadCount === 'number') {
            setDiscussionUnread(d.unreadCount);
          }
        }
      } catch {
        // Ignore background unread check failure
      }
    };

    fetchHistory();
    fetchDiscussionStats();
  }, [isOpen, task]);

  if (!isOpen || !task) return null;

  const handleStatusSelect = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextStatus = e.target.value as StatusType;
    if (nextStatus === task.status) return;

    try {
      setIsUpdatingStatus(true);
      setStatusError('');
      await onStatusChange(task.id, nextStatus);

      // Refresh history list
      const res = await fetch(`/api/tasks/${task.id}`);
      const data = await res.json();
      if (data.statusHistory) setStatusHistory(data.statusHistory);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update status';
      setStatusError(msg);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Not set';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity" onClick={onClose} />

      <div className="flex min-h-full items-center justify-center p-4 sm:p-6 text-center">
        <div className="relative w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white text-left shadow-2xl transition-all border border-slate-200">
          {/* Header */}
          <div className="border-b border-slate-100 px-6 pt-5 pb-4 bg-slate-50/50">
            <div className="flex items-start justify-between">
              <div className="space-y-2 pr-6">
                <div className="flex flex-wrap items-center gap-2">
                  <PriorityBadge priority={task.priority} size="md" />
                  <StatusBadge status={task.status} size="md" />
                  {task.department && (
                    <span className="inline-flex items-center text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md font-medium">
                      <Building className="w-3 h-3 mr-1" />
                      {task.department}
                    </span>
                  )}
                </div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight leading-snug">
                  {task.task_name}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sub Tabs: Details vs Activity History */}
            <div className="flex items-center space-x-4 mt-4 pt-2 border-t border-slate-200/60">
              <button
                onClick={() => setActiveTab('details')}
                className={`text-xs font-bold pb-1 transition-colors border-b-2 cursor-pointer ${
                  activeTab === 'details'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Task Details
              </button>
              <button
                onClick={() => {
                  setActiveTab('discussion');
                  setDiscussionUnread(0);
                }}
                className={`text-xs font-bold pb-1 transition-colors border-b-2 cursor-pointer flex items-center space-x-1.5 ${
                  activeTab === 'discussion'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Discussion</span>
                {discussionUnread > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 text-[10px] font-bold bg-red-500 text-white rounded-full animate-pulse">
                    {discussionUnread}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`text-xs font-bold pb-1 transition-colors border-b-2 cursor-pointer flex items-center space-x-1.5 ${
                  activeTab === 'history'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>Assignment & Status History ({assignmentHistory.length + statusHistory.length})</span>
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="px-6 py-6 space-y-6 max-h-[70vh] overflow-y-auto">
            {activeTab === 'details' ? (
              <>
                {/* Linked Invoice Callout */}
                {task.invoice_id && (
                  <div className="p-4 rounded-xl bg-emerald-50/80 border border-emerald-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                    <div className="space-y-0.5 overflow-hidden">
                      <div className="flex items-center space-x-1.5">
                        <DollarSign className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider block">
                          Linked Finance Invoice
                        </span>
                      </div>
                      <span className="text-xs font-semibold text-emerald-800 block">
                        {task.invoice_number || `Invoice #${task.invoice_id}`}
                        {task.client_name ? ` • Client: ${task.client_name}` : ''}
                        {task.invoice_total_amount ? ` (AED ${Number(task.invoice_total_amount).toLocaleString()})` : ''}
                      </span>
                    </div>
                    <a
                      href={`/finance/invoices?id=${task.invoice_id}`}
                      className="inline-flex items-center justify-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition-colors shrink-0"
                    >
                      <span>View Invoice ↗</span>
                    </a>
                  </div>
                )}

                {/* Work Link Callout */}
                {task.drive_link ? (
                  <div className="p-4 rounded-xl bg-indigo-50/80 border border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                    <div className="space-y-0.5 overflow-hidden">
                      <span className="text-xs font-semibold text-indigo-900 uppercase tracking-wider block">
                        Associated Work / Drive Link
                      </span>
                      <span className="text-xs text-indigo-700 truncate block max-w-md font-mono">
                        {task.drive_link}
                      </span>
                    </div>
                    <a
                      href={task.drive_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center space-x-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs transition-colors shrink-0"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>Open Work ↗</span>
                    </a>
                  </div>
                ) : (
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-500 italic">
                    No Google Drive / work link provided for this task.
                  </div>
                )}

                {/* Description */}
                <div>
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Task Description
                  </h4>
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/70">
                    {task.description || 'No description provided.'}
                  </p>
                </div>

                {/* Notes if any */}
                {task.notes && (
                  <div>
                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                      Internal Notes & Instructions
                    </h4>
                    <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap bg-amber-50/50 p-3 rounded-lg border border-amber-200/50">
                      {task.notes}
                    </p>
                  </div>
                )}

                {/* Key Metadata Grid: BOTH Assigned To AND Assigned By explicitly */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 text-xs">
                  <div className="space-y-1 p-3 rounded-lg bg-slate-50 border border-slate-200/70">
                    <span className="text-slate-400 font-medium uppercase tracking-wider text-[10px]">
                      Assigned To (Responsible Employee):
                    </span>
                    <div className="flex items-center space-x-2 font-bold text-slate-900 text-sm">
                      <User className="w-4 h-4 text-indigo-600 shrink-0" />
                      <span>{task.assigned_to_name || `User #${task.assigned_to}`}</span>
                      {task.assigned_to_is_active === 0 && (
                        <span className="text-[10px] text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-sm font-medium">
                          Deactivated
                        </span>
                      )}
                    </div>
                    {task.assigned_to_email && (
                      <span className="text-[11px] text-slate-400 block">{task.assigned_to_email}</span>
                    )}
                  </div>

                  <div className="space-y-1 p-3 rounded-lg bg-slate-50 border border-slate-200/70">
                    <span className="text-slate-400 font-medium uppercase tracking-wider text-[10px]">
                      Assigned By (Manager / Creator):
                    </span>
                    <div className="flex items-center space-x-2 font-bold text-slate-900 text-sm">
                      <User className="w-4 h-4 text-slate-600 shrink-0" />
                      <span>{task.assigned_by_name || task.created_by_name || `User #${task.created_by}`}</span>
                    </div>
                    {task.assigned_by_email && (
                      <span className="text-[11px] text-slate-400 block">{task.assigned_by_email}</span>
                    )}
                  </div>

                  <div className="space-y-1">
                    <span className="text-slate-400 font-medium">Due Date:</span>
                    <div className="flex items-center space-x-1.5 font-semibold text-slate-800">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      <span>{formatDate(task.due_date)}</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-slate-400 font-medium">Last Updated:</span>
                    <div className="flex items-center space-x-1.5 text-slate-600">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{formatDateTime(task.updated_at)}</span>
                    </div>
                  </div>
                </div>

                {/* Quick Status Updater */}
                <div className="p-4 rounded-xl bg-slate-100/80 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <label className="text-xs font-bold text-slate-800 block">
                      Update Task Status
                    </label>
                    <span className="text-[11px] text-slate-500">
                      Changes immediately log into the status audit trail.
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <select
                      value={task.status}
                      onChange={handleStatusSelect}
                      disabled={isUpdatingStatus}
                      className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-800 shadow-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden cursor-pointer"
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    {isUpdatingStatus && (
                      <span className="text-xs text-indigo-600 animate-spin">●</span>
                    )}
                  </div>
                </div>

                {statusError && (
                  <div className="p-3 rounded-lg bg-red-50 text-red-700 text-xs flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{statusError}</span>
                  </div>
                )}
              </>
            ) : activeTab === 'history' ? (
              /* Activity & Assignment History View */
              <div className="space-y-6">
                {/* 1. Assignment History */}
                <div>
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Assignment & Reassignment Audit Trail</span>
                  </h4>

                  {assignmentHistory.length === 0 ? (
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-400 italic">
                      No reassignment history recorded for this task.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {assignmentHistory.map((item) => (
                        <div
                          key={item.id}
                          className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                        >
                          <div className="flex items-center space-x-2">
                            <span className="font-semibold text-slate-700">{item.assigned_by_name}</span>
                            <ArrowRight className="w-3.5 h-3.5 text-indigo-500" />
                            <span className="font-bold text-indigo-700">{item.assigned_to_name}</span>
                            {item.notes && (
                              <span className="text-slate-400 text-[11px]">({item.notes})</span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-400 whitespace-nowrap">
                            {formatDateTime(item.assigned_at)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 2. Status History */}
                <div>
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-purple-600" />
                    <span>Status Progression History</span>
                  </h4>

                  {statusHistory.length === 0 ? (
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-400 italic">
                      No status transitions recorded yet.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {statusHistory.map((item) => (
                        <div
                          key={item.id}
                          className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                        >
                          <div className="flex items-center space-x-2">
                            <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-medium text-[11px]">
                              {item.old_status}
                            </span>
                            <ArrowRight className="w-3 h-3 text-slate-400" />
                            <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 font-bold text-[11px]">
                              {item.new_status}
                            </span>
                            <span className="text-slate-500 text-[11px]">
                              by <strong className="text-slate-700">{item.changed_by_name}</strong>
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400 whitespace-nowrap">
                            {formatDateTime(item.changed_at)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <TaskDiscussion
                  taskId={task.id}
                  taskName={task.task_name}
                  currentUser={currentUser}
                />
              </div>
            )}
          </div>

          {/* Footer actions */}
          <div className="border-t border-slate-100 px-6 py-4 bg-slate-50 flex items-center justify-between">
            <div>
              {currentUser.role === 'admin' && onArchiveTask && (
                <button
                  type="button"
                  onClick={async () => {
                    if (window.confirm('Are you sure you want to archive this task? Historical records will still be preserved.')) {
                      await onArchiveTask(task.id);
                      onClose();
                    }
                  }}
                  className="inline-flex items-center space-x-1.5 text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 px-2.5 py-1.5 rounded-md transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Archive Task</span>
                </button>
              )}
            </div>

            <div className="flex items-center space-x-2">
              {currentUser.role === 'admin' && onEditTask && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onEditTask(task);
                  }}
                  className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold shadow-2xs transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit / Reassign</span>
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold shadow-xs transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
