'use client';

import React, { useState, useEffect } from 'react';
import { ChevronDown, Plus, Check } from 'lucide-react';
import { CreateWorkspaceModal } from './CreateWorkspaceModal';

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

      {/* Centered Modal: Create New Workspace (Rendered via Portal over main application) */}
      <CreateWorkspaceModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </>
  );
};
