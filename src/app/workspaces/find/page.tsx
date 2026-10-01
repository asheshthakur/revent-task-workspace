'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, Building2, Plus, ArrowRight, Loader2, KeyRound } from 'lucide-react';

interface WorkspaceItem {
  id: number;
  name: string;
  slug: string;
  logo?: string;
}

export default function FindWorkspacePage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<WorkspaceItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [inviteToken, setInviteToken] = useState('');

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (!data.authenticated) {
          router.push('/login');
          return;
        }
        setCurrentUser(data.user);
        // If user already has workspaces and an activeOrg, redirect to dashboard
        if (data.activeOrg && !data.hasNoWorkspace) {
          router.push('/dashboard');
        }
      })
      .catch(() => router.push('/login'));
  }, [router]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || searchQuery.trim().length < 2) return;
    setIsSearching(true);

    try {
      const res = await fetch(`/api/workspaces/search?q=${encodeURIComponent(searchQuery.trim())}`);
      const data = await res.json();
      setResults(data.workspaces || []);
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleJoinByToken = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteToken.trim()) return;
    window.location.href = `/invite/${inviteToken.trim()}`;
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-2">
        <h2 className="text-3xl font-extrabold text-white tracking-tight">
          Welcome to VEYA
        </h2>
        <p className="text-sm text-slate-400">
          Find your company workspace or create a new one to get started.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg space-y-6">
        {/* Search Workspace Card */}
        <div className="bg-slate-800/90 py-7 px-6 shadow-2xl rounded-2xl border border-slate-700/60 backdrop-blur-md space-y-5">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Search className="w-5 h-5 text-indigo-400" />
              <span>Find Your Workspace</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Search by your company or team name
            </p>
          </div>

          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="e.g. Acme, Revent, TechCorp"
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-hidden focus:border-indigo-500"
              />
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
            </div>
            <button
              type="submit"
              disabled={isSearching}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-colors cursor-pointer"
            >
              {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
            </button>
          </form>

          {results.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-700/60">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Matching Workspaces
              </span>
              <div className="divide-y divide-slate-700/60 rounded-xl bg-slate-900/60 border border-slate-700/60 overflow-hidden">
                {results.map((ws) => (
                  <div key={ws.id} className="p-3 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-lg bg-indigo-950/80 border border-indigo-700/60 flex items-center justify-center text-sm font-bold text-indigo-400">
                        {ws.name.slice(0, 1).toUpperCase()}
                      </div>
                      <div>
                        <span className="text-sm font-bold text-white block">{ws.name}</span>
                        <span className="text-[11px] text-slate-400 font-mono">{ws.slug}.veya.com</span>
                      </div>
                    </div>
                    <span className="text-[11px] text-slate-400 italic">
                      Invitation required to join
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Enter Invitation Token */}
        <div className="bg-slate-800/90 py-5 px-6 shadow-xl rounded-2xl border border-slate-700/60 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <KeyRound className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Have an invitation link or token?
              </span>
            </div>
          </div>
          <form onSubmit={handleJoinByToken} className="flex gap-2">
            <input
              type="text"
              value={inviteToken}
              onChange={(e) => setInviteToken(e.target.value)}
              placeholder="Paste invitation token here"
              className="flex-1 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-xs focus:outline-hidden focus:border-indigo-500 font-mono"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors cursor-pointer"
            >
              Accept Invite
            </button>
          </form>
        </div>

        {/* Create New Workspace Action */}
        <div className="bg-gradient-to-r from-indigo-950/50 to-slate-800/90 py-6 px-6 shadow-xl rounded-2xl border border-indigo-500/30 flex items-center justify-between">
          <div>
            <h4 className="text-sm font-bold text-white">Can't find your workspace?</h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Set up a new isolated organization workspace as Owner.
            </p>
          </div>
          <Link
            href="/onboarding"
            className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Workspace</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
