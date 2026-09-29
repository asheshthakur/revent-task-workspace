'use client';

import React, { useState, useEffect } from 'react';
import { X, AlertCircle, Loader2, KeyRound } from 'lucide-react';
import { ANIMAL_EMOJIS } from '@/lib/constants';

export interface Employee {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'employee';
  department: string;
  animal_emoji?: string;
  is_active: number;
  created_at: string;
  total_tasks?: number;
  not_started_tasks?: number;
  started_tasks?: number;
  halfway_tasks?: number;
  completed_tasks?: number;
}

interface EmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  employeeToEdit?: Employee | null;
  mode?: 'create' | 'edit' | 'password';
}

export const EmployeeModal: React.FC<EmployeeModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  employeeToEdit,
  mode = 'create',
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [department, setDepartment] = useState('');
  const [animalEmoji, setAnimalEmoji] = useState('🦊');
  const [role, setRole] = useState<'admin' | 'employee'>('employee');
  const [isActive, setIsActive] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    if (employeeToEdit) {
      setName(employeeToEdit.name || '');
      setEmail(employeeToEdit.email || '');
      setDepartment(employeeToEdit.department || '');
      setAnimalEmoji(employeeToEdit.animal_emoji || '🦊');
      setRole(employeeToEdit.role || 'employee');
      setIsActive(employeeToEdit.is_active === 1);
      setPassword('');
    } else {
      setName('');
      setEmail('');
      setPassword('');
      setDepartment('');
      setAnimalEmoji('🦊');
      setRole('employee');
      setIsActive(true);
    }
    setErrorMessage('');
  }, [isOpen, employeeToEdit]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    try {
      setIsSubmitting(true);

      if (mode === 'password' && employeeToEdit) {
        if (!password || password.length < 6) {
          setErrorMessage('Password must be at least 6 characters.');
          setIsSubmitting(false);
          return;
        }

        const res = await fetch(`/api/employees/${employeeToEdit.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ new_password: password, animal_emoji: animalEmoji }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to reset password');

        onSuccess();
        onClose();
        return;
      }

      if (mode === 'edit' && employeeToEdit) {
        const payload: any = {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          department: department.trim(),
          animal_emoji: animalEmoji,
          role,
          is_active: isActive,
        };
        if (password && password.trim()) {
          payload.new_password = password.trim();
        }

        const res = await fetch(`/api/employees/${employeeToEdit.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to update employee');

        onSuccess();
        onClose();
        return;
      }

      // Create mode
      if (!name.trim() || !email.trim() || !password.trim()) {
        setErrorMessage('Name, email, and initial password are required.');
        setIsSubmitting(false);
        return;
      }

      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password: password.trim(),
          department: department.trim(),
          animal_emoji: animalEmoji,
          role,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create employee');

      onSuccess();
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

      <div className="flex min-h-full items-center justify-center p-4 text-center">
        <div className="relative w-full max-w-lg transform overflow-hidden rounded-2xl bg-white text-left shadow-2xl transition-all border border-slate-200">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50">
            <h3 className="text-base font-bold text-slate-900">
              {mode === 'password'
                ? `Reset Password for ${employeeToEdit?.name}`
                : mode === 'edit'
                ? `Edit Employee Details: ${employeeToEdit?.name}`
                : 'Add New Employee'}
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

            {mode === 'password' ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    New Password *
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter new strong password (min 6 chars)"
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    />
                    <KeyRound className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                  </div>
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    The employee will be forced to log in again with this new password.
                  </span>
                </div>

                {/* Optional emoji selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Animal Emoji Avatar
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {ANIMAL_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setAnimalEmoji(emoji)}
                        className={`text-xl p-2 rounded-lg border transition-all ${
                          animalEmoji === emoji
                            ? 'border-indigo-600 bg-indigo-50 shadow-2xs scale-110'
                            : 'border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                {/* Email / Username */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Email / Login Username *
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="rahul@company.com"
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                {/* Password (required on create, optional on edit) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    {mode === 'create' ? 'Temporary Password *' : 'Change Password (leave empty to keep current)'}
                  </label>
                  <input
                    type="password"
                    required={mode === 'create'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={mode === 'create' ? 'Initial password' : 'New password (optional)'}
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                {/* Animal Emoji Avatar Selection */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Animal Emoji Avatar
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {ANIMAL_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setAnimalEmoji(emoji)}
                        className={`text-xl p-1.5 rounded-lg border transition-all ${
                          animalEmoji === emoji
                            ? 'border-indigo-600 bg-indigo-50 shadow-2xs scale-110'
                            : 'border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Department & Role */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Department
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
                      Access Role
                    </label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value as 'admin' | 'employee')}
                      className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden bg-white"
                    >
                      <option value="employee">Employee</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                </div>

                {/* Active / Inactive Status (Edit mode) */}
                {mode === 'edit' && (
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isActive}
                        onChange={(e) => setIsActive(e.target.checked)}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-xs font-semibold text-slate-800">
                        Account is Active
                      </span>
                    </label>
                    <p className="text-[11px] text-slate-500 mt-1 pl-6">
                      Deactivating revokes active sessions, blocks login, and removes from active assignments while preserving historical tasks.
                    </p>
                  </div>
                )}
              </>
            )}

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
                <span>
                  {mode === 'password'
                    ? 'Save New Password'
                    : mode === 'edit'
                    ? 'Update Employee'
                    : 'Add Employee'}
                </span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
