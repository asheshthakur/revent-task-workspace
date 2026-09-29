'use client';

import React, { useState, useEffect } from 'react';
import { ChevronDown, Plus, Check, Building2 } from 'lucide-react';

interface Organisation {
  id: number;
  name: string;
  slug: string;
  logo?: string;
  role: string;
  department?: string;
}

interface WorkspaceSwitcherProps {
  onWorkspaceChange?: () => void;
}

export const WorkspaceSwitcher: React.FC<WorkspaceSwitcherProps> = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeOrg, setActiveOrg] = useState<Organisation | null>(null);
  const [allOrgs, setAllOrgs] = useState<Organisation[]>([]);
  const [isSwitching, setIsSwitching] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [newDepartment, setNewDepartment] = useState('');
  const [createError, setCreateError] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const fetchWorkspaces = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        if (data.activeOrg) setActiveOrg(data.activeOrg);
        if (data.allOrgs) setAllOrgs(data.allOrgs);
      }
    } catch (err) {
      console.error('Failed to load workspaces:', err);
    }
  };

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  const handleSwitchWorkspace = async (orgId: number) => {
    if (activeOrg?.id === orgId) {
      setIsOpen(false);
      return;
    }
    setIsSwitching(true);
    try {
      const res = await fetch('/api/workspaces/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organisationId: orgId }),
      });
      if (res.ok) {
        setIsOpen(false);
        // Full page reload so all scoped task lists, stats, chat, presence reload cleanly
        window.location.reload();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to switch workspace');
        setIsSwitching(false);
      }
    } catch {
      alert('Network error switching workspace');
      setIsSwitching(false);
    }
  };

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName.trim()) return;
    setIsCreating(true);
    setCreateError('');

    try {
      const res = await fetch('/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newOrgName.trim(),
          department: newDepartment.trim() || 'Leadership',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        // Automatically switch to the newly created workspace
        await fetch('/api/workspaces/switch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ organisationId: data.organisation.id }),
        });
        window.location.reload();
      } else {
        const data = await res.json();
        setCreateError(data.error || 'Failed to create workspace');
        setIsCreating(false);
      }
    } catch {
      setCreateError('An error occurred. Please try again.');
      setIsCreating(false);
    }
  };

  return (
    <>
      <div className="relative px-3 py-2 border-b border-slate-800">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between p-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-left transition-colors border border-slate-700/50"
        >
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="w-7 h-7 rounded-md bg-indigo-600 flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-xs">
              {activeOrg?.name ? activeOrg.name.charAt(0).toUpperCase() : 'V'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-white truncate">
                {activeOrg?.name || 'Loading workspace...'}
              </div>
              <div className="text-[10px] text-slate-400 capitalize">
                {activeOrg?.role || 'Member'}
              </div>
            </div>
          </div>
          <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
        </button>

        {isOpen && (
          <>
            <div className="fixed inset-0 z-50" onClick={() => setIsOpen(false)} />
            <div className="absolute left-3 right-3 top-full mt-1.5 z-50 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-1.5 backdrop-blur-md">
              <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800 mb-1">
                Your Workspaces ({allOrgs.length})
              </div>

              <div className="max-h-56 overflow-y-auto space-y-1">
                {allOrgs.map((org) => {
                  const isCurrent = activeOrg?.id === org.id;
                  return (
                    <button
                      key={org.id}
                      onClick={() => handleSwitchWorkspace(org.id)}
                      disabled={isSwitching}
                      className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left text-xs transition-colors ${
                        isCurrent
                          ? 'bg-indigo-950/70 text-indigo-200 font-semibold border border-indigo-800/60'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center space-x-2 min-w-0">
                        <div
                          className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold shrink-0 ${
                            isCurrent
                              ? 'bg-indigo-600 text-white'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {org.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 truncate">
                          <div className="truncate">{org.name}</div>
                          <div className="text-[10px] text-slate-400 capitalize">
                            {org.role}
                          </div>
                        </div>
                      </div>
                      {isCurrent && <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>

              <div className="border-t border-slate-800 mt-1 pt-1">
                <button
                  onClick={() => {
                    setIsOpen(false);
                    setIsCreateModalOpen(true);
                  }}
                  className="w-full flex items-center space-x-2 px-2.5 py-2 rounded-lg text-left text-xs text-indigo-300 hover:bg-indigo-950/50 hover:text-indigo-200 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create New Workspace</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modal: Create New Workspace */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 text-slate-900 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Create New Workspace</h3>
                <p className="text-xs text-slate-500">Organize projects & team members into a dedicated tenant</p>
              </div>
            </div>

            {createError && (
              <div className="p-3 mb-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateWorkspace} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Workspace / Organization Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Acme Digital, Beta Consulting"
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Your Department / Title in this Workspace
                </label>
                <input
                  type="text"
                  placeholder="e.g. Executive, Product, Engineering"
                  value={newDepartment}
                  onChange={(e) => setNewDepartment(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating || !newOrgName.trim()}
                  className="px-4 py-2 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors shadow-sm disabled:opacity-50"
                >
                  {isCreating ? 'Creating...' : 'Create & Switch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
