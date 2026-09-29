'use client';

import React, { useState, useEffect } from 'react';
import { X, AlertCircle, Loader2 } from 'lucide-react';
import { PRIORITIES, STATUSES, PriorityType, StatusType } from '@/lib/constants';
import { Task } from './TaskDetailModal';

interface EmployeeOption {
  id: number;
  name: string;
  department?: string;
  is_active: number;
  presenceStatus?: string;
}

export interface TaskInitialValues {
  taskName?: string;
  description?: string;
  assignedTo?: string | number;
  priority?: PriorityType;
  department?: string;
  dueDate?: string;
  invoiceId?: number;
}

interface TaskFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  onTaskSaved?: () => void | Promise<void>;
  taskToEdit?: Task | null;
  initialValues?: TaskInitialValues | null;
  currentUser?: any;
}

export const TaskFormModal: React.FC<TaskFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onTaskSaved,
  taskToEdit,
  initialValues,
  currentUser,
}) => {
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Form states
  const [taskName, setTaskName] = useState('');
  const [description, setDescription] = useState('');
  const [assignedTo, setAssignedTo] = useState<string>('');
  const [priority, setPriority] = useState<PriorityType>('Urgent');
  const [status, setStatus] = useState<StatusType>('Not Started');
  const [driveLink, setDriveLink] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [department, setDepartment] = useState('');

  // Fetch eligible employees and presence status whenever modal opens
  useEffect(() => {
    if (!isOpen) return;

    const fetchEmployees = async () => {
      try {
        setLoadingEmployees(true);
        // Fetch eligible active organisation members and presence info
        const [empRes, presenceRes] = await Promise.allSettled([
          fetch('/api/employees?active=true'),
          fetch('/api/presence'),
        ]);

        let empList: EmployeeOption[] = [];
        if (empRes.status === 'fulfilled' && empRes.value.ok) {
          const data = await empRes.value.json();
          if (Array.isArray(data.employees)) {
            empList = data.employees;
          }
        }

        // Map live presence status if available (purely informational)
        const presenceMap = new Map<number, string>();
        if (presenceRes.status === 'fulfilled' && presenceRes.value.ok) {
          try {
            const pData = await presenceRes.value.json();
            if (Array.isArray(pData.activeUsers)) {
              for (const u of pData.activeUsers) {
                presenceMap.set(u.id, u.effective_status || 'Online');
              }
            }
            if (Array.isArray(pData.offlineUsers)) {
              for (const u of pData.offlineUsers) {
                presenceMap.set(u.id, u.effective_status || 'Offline');
              }
            }
          } catch (e) {
            console.error('Error parsing presence data:', e);
          }
        }

        const enrichedEmployees = empList.map((emp) => ({
          ...emp,
          presenceStatus: presenceMap.get(emp.id) || (emp.is_active === 1 ? 'Offline' : 'Inactive'),
        }));

        setEmployees(enrichedEmployees);
        if (!taskToEdit && enrichedEmployees.length > 0 && !assignedTo) {
          setAssignedTo(String(enrichedEmployees[0].id));
        }
      } catch (err) {
        console.error('Error fetching employees:', err);
      } finally {
        setLoadingEmployees(false);
      }
    };

    fetchEmployees();

    if (taskToEdit) {
      setTaskName(taskToEdit.task_name);
      setDescription(taskToEdit.description || '');
      setAssignedTo(String(taskToEdit.assigned_to));
      setPriority(taskToEdit.priority as PriorityType);
      setStatus(taskToEdit.status as StatusType);
      setDriveLink(taskToEdit.drive_link || '');
      setDueDate(taskToEdit.due_date || '');
      setNotes(taskToEdit.notes || '');
      setDepartment(taskToEdit.department || '');
    } else if (initialValues) {
      setTaskName(initialValues.taskName || '');
      setDescription(initialValues.description || '');
      if (initialValues.assignedTo) setAssignedTo(String(initialValues.assignedTo));
      if (initialValues.priority) setPriority(initialValues.priority);
      setStatus('Not Started');
      setDriveLink('');
      setDueDate(initialValues.dueDate || '');
      setNotes('');
      setDepartment(initialValues.department || '');
    } else {
      setTaskName('');
      setDescription('');
      setPriority('Urgent');
      setStatus('Not Started');
      setDriveLink('');
      setDueDate('');
      setNotes('');
      setDepartment('');
    }
    setErrorMessage('');
  }, [isOpen, taskToEdit, initialValues]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!taskName.trim()) {
      setErrorMessage('Task name is required.');
      return;
    }
    if (!assignedTo) {
      setErrorMessage('Please select an eligible employee.');
      return;
    }

    if (driveLink && driveLink.trim()) {
      try {
        const parsed = new URL(driveLink.trim());
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
          setErrorMessage('Drive/work link must start with https:// or http://');
          return;
        }
      } catch {
        setErrorMessage('Please enter a valid URL (e.g. https://drive.google.com/...)');
        return;
      }
    }

    try {
      setIsSubmitting(true);
      const url = taskToEdit ? `/api/tasks/${taskToEdit.id}` : '/api/tasks';
      const method = taskToEdit ? 'PATCH' : 'POST';

      const payload = {
        task_name: taskName.trim(),
        description: description.trim(),
        assigned_to: parseInt(assignedTo, 10),
        priority,
        status,
        drive_link: driveLink.trim(),
        due_date: dueDate,
        notes: notes.trim(),
        department: department.trim(),
        invoice_id: initialValues?.invoiceId || null,
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save task');
      }

      if (onSuccess) onSuccess();
      if (onTaskSaved) await onTaskSaved();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An error occurred';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity" onClick={onClose} />

      <div className="flex min-h-full items-center justify-center p-4 sm:p-6">
        <div className="relative w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white shadow-2xl transition-all border border-slate-200">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50">
            <h3 className="text-base font-bold text-slate-900">
              {taskToEdit ? 'Edit & Reassign Task' : 'Create New Task'}
            </h3>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {errorMessage && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Task Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Task Name *
              </label>
              <input
                type="text"
                required
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
                placeholder="e.g. Create September LinkedIn Content Calendar"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Description
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide comprehensive details, deliverables, or background..."
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden resize-none"
              />
            </div>

            {/* Assigned To & Priority */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Assign To *
                </label>
                <select
                  required
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  disabled={loadingEmployees}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden bg-white"
                >
                  {loadingEmployees ? (
                    <option value="">Loading team members...</option>
                  ) : employees.length === 0 ? (
                    <option value="">No eligible employees found</option>
                  ) : (
                    employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} {emp.department ? `(${emp.department})` : ''} {emp.presenceStatus ? `• ${emp.presenceStatus}` : ''}
                      </option>
                    ))
                  )}
                </select>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  All eligible organisation members can be assigned tasks regardless of presence status.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Priority Hierarchy *
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as PriorityType)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden bg-white"
                >
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Ranked: V. Urgent → Urgent → EOD → End of Week → 15 Days → End of Month
                </span>
              </div>
            </div>

            {/* Status & Due Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as StatusType)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden bg-white"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Due Date
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden bg-white"
                >
                </input>
              </div>
            </div>

            {/* Google Drive / Work Link */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Google Drive / Work Link (URL)
              </label>
              <input
                type="url"
                value={driveLink}
                onChange={(e) => setDriveLink(e.target.value)}
                placeholder="https://drive.google.com/... or https://docs.google.com/..."
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Direct link to Google Drive, Docs, Sheets, Figma, or internal resources.
              </span>
            </div>

            {/* Department & Notes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Department (Optional)
                </label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="e.g. Marketing, Engineering"
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Additional Notes
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Brief internal context or handoff note"
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-2xs transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors flex items-center space-x-1.5 cursor-pointer"
              >
                {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{taskToEdit ? 'Save Changes' : 'Create Task'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
