'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  CheckSquare,
  Users,
  Layers,
  BarChart3,
  History,
  Settings,
  PlusCircle,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  UserCheck,
  MessageSquare,
  ChevronDown,
  DollarSign,
  Receipt,
  CreditCard,
  FileCheck,
} from 'lucide-react';
import { USER_PRESENCE_STATUSES, UserPresenceStatus } from '@/lib/constants';
import { WorkspaceSwitcher } from './WorkspaceSwitcher';

interface AppLayoutProps {
  user: {
    id: number;
    name: string;
    email: string;
    role: 'admin' | 'employee';
    department?: string;
    animal_emoji?: string;
    selected_status?: string;
    can_reset_other_user_passwords?: boolean;
  };
  children: React.ReactNode;
  onOpenCreateTask?: () => void;
}

interface PresenceUser {
  id: number;
  name: string;
  email: string;
  department?: string;
  animal_emoji: string;
  effective_status: UserPresenceStatus;
  is_online: boolean;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ user, children, onOpenCreateTask }) => {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Presence & Chat states
  const [activeUsers, setActiveUsers] = useState<PresenceUser[]>([]);
  const [offlineUsers, setOfflineUsers] = useState<PresenceUser[]>([]);
  const [unreadChatCount, setUnreadChatCount] = useState<number>(0);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [mySelectedStatus, setMySelectedStatus] = useState<UserPresenceStatus>(
    (user.selected_status as UserPresenceStatus) || 'Online'
  );
  const presenceScrollRef = useRef<HTMLDivElement>(null);

  const handlePresenceWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const el = presenceScrollRef.current;
    if (!el) return;
    if (el.scrollHeight > el.clientHeight) {
      el.scrollTop += e.deltaY;
    }
  };

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('#top-profile-control') && !target.closest('#top-profile-dropdown')) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

  // Heartbeat & Presence Polling (Optimized 25s interval)
  useEffect(() => {
    let isMounted = true;

    const sendHeartbeatAndFetchPresence = async (newStatus?: UserPresenceStatus) => {
      try {
        const body: any = {};
        if (newStatus) {
          body.selected_status = newStatus;
        }
        // Send heartbeat
        await fetch('/api/presence', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        // Get fresh presence list & unread count
        const res = await fetch('/api/presence');
        const data = await res.json();
        if (isMounted) {
          if (data.activeUsers) setActiveUsers(data.activeUsers);
          if (data.offlineUsers) setOfflineUsers(data.offlineUsers);
          if (typeof data.unreadChatCount === 'number') {
            setUnreadChatCount(data.unreadChatCount);
          }
        }
      } catch (err) {
        console.error('Presence heartbeat error:', err);
      }
    };

    // Initial heartbeat
    sendHeartbeatAndFetchPresence();

    // Heartbeat every 25 seconds
    const interval = setInterval(() => {
      // Only send heartbeat if tab is visible to conserve free tier limits
      if (typeof document !== 'undefined' && !document.hidden) {
        sendHeartbeatAndFetchPresence();
      }
    }, 25000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const handleStatusChange = async (newStatus: UserPresenceStatus) => {
    setMySelectedStatus(newStatus);
    try {
      await fetch('/api/presence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selected_status: newStatus }),
      });
      const res = await fetch('/api/presence');
      const data = await res.json();
      if (data.activeUsers) {
        setActiveUsers(data.activeUsers);
        setOfflineUsers(data.offlineUsers || []);
      }
    } catch (err) {
      console.error('Status change error:', err);
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      window.location.href = '/login';
    } catch {
      setIsLoggingOut(false);
    }
  };

  const getStatusIndicator = (status: UserPresenceStatus) => {
    switch (status) {
      case 'Online':
        return <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-2xs shrink-0" title="Online" />;
      case 'Away':
        return <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-2xs shrink-0" title="Away" />;
      case 'DND':
        return <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-2xs shrink-0" title="DND" />;
      case 'Holiday':
        return (
          <span
            className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 shadow-2xs shrink-0"
            title="Holiday"
          />
        );
      case 'Offline':
      default:
        return <span className="w-2.5 h-2.5 rounded-full bg-slate-500 shadow-2xs shrink-0" title="Offline" />;
    }
  };

  const navItems = [
    {
      label: user.role === 'admin' ? 'Overview' : 'My Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
      show: true,
    },
    {
      label: 'My Tasks',
      href: '/my-tasks',
      icon: CheckSquare,
      show: user.role === 'employee',
    },
    {
      label: 'Chat',
      href: '/chat',
      icon: MessageSquare,
      badge: unreadChatCount > 0 ? unreadChatCount : null,
      show: true,
    },
    {
      label: 'Finance Overview',
      href: '/finance',
      icon: DollarSign,
      show: true,
    },
    {
      label: 'Invoice Tracker',
      href: '/finance/invoices',
      icon: Receipt,
      show: true,
    },
    {
      label: 'PDC Tracker',
      href: '/finance/pdcs',
      icon: FileCheck,
      show: true,
    },
    {
      label: 'Payments',
      href: '/finance/payments',
      icon: CreditCard,
      show: true,
    },
    {
      label: 'Clients',
      href: '/finance/clients',
      icon: Users,
      show: true,
    },
    {
      label: 'All Tasks',
      href: '/all-tasks',
      icon: Layers,
      show: user.role === 'admin',
    },
    {
      label: 'Team Directory',
      href: '/team',
      icon: Users,
      show: user.role === 'admin' || !!user.can_reset_other_user_passwords,
    },
    {
      label: 'Employee Analytics',
      href: '/analytics',
      icon: BarChart3,
      show: user.role === 'admin',
    },
    {
      label: 'Activity & Audit Log',
      href: '/audit-log',
      icon: History,
      show: user.role === 'admin',
    },
    {
      label: 'Account Settings',
      href: '/settings',
      icon: Settings,
      show: true,
    },
  ].filter((item) => item.show);

  const getPageTitle = () => {
    if (pathname === '/dashboard') {
      return user.role === 'admin' ? 'Organization Operations Center' : `Welcome back, ${user.name}`;
    }
    if (pathname === '/chat') return 'Real-Time Internal Chat';
    if (pathname === '/finance') return 'Finance Overview & KPIs';
    if (pathname === '/finance/invoices') return 'Internal Invoice Tracker';
    if (pathname === '/finance/pdcs') return 'Post-Dated Cheques (PDC) Tracker';
    if (pathname === '/finance/payments') return 'Recorded Client Payments';
    if (pathname === '/finance/clients') return 'Client Financial Profiles';
    if (pathname === '/all-tasks') return 'All Organization Tasks';
    if (pathname === '/team') return 'Employee & Team Management';
    if (pathname === '/analytics') return 'Employee & Team Performance Analytics';
    if (pathname === '/audit-log') return 'Organization Activity & Audit Log';
    if (pathname === '/settings') return 'Account Security & Password Settings';
    if (pathname === '/my-tasks') return 'My Assigned Work';
    return 'Workspace';
  };

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900">
      {/* Mobile backdrop */}
      {mobileNavOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs lg:hidden"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-slate-900 text-slate-100 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          mobileNavOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* VEYA BRANDING (Clean, Minimal, Professional B2B SaaS) */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <span className="font-extrabold text-lg tracking-wider text-white">
              VEYA
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-widest text-indigo-400 bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-800/60">
              Workspace
            </span>
          </div>
          <button
            onClick={() => setMobileNavOpen(false)}
            className="lg:hidden p-1 rounded-md text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Workspace Switcher */}
        <WorkspaceSwitcher />

        {/* Current User Quick Info with Animal Emoji Avatar & User-Controlled Status */}
        <div className="p-3.5 mx-3 my-3 rounded-xl bg-slate-800/80 border border-slate-700/60">
          <div className="flex items-center space-x-3">
            {/* Animal Emoji Avatar (replaces letter circle) */}
            <div className="h-10 w-10 rounded-full bg-slate-700 flex items-center justify-center text-xl shadow-inner shrink-0">
              {user.animal_emoji || '🦊'}
            </div>
            <div className="overflow-hidden flex-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm text-white truncate block">
                  {user.name}
                </span>
                {getStatusIndicator(mySelectedStatus)}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className={`inline-flex items-center text-[10px] font-semibold px-1.5 py-0.2 rounded-sm ${
                    user.role === 'admin'
                      ? 'bg-amber-500/20 text-amber-300'
                      : 'bg-indigo-500/20 text-indigo-300'
                  }`}
                >
                  {user.role}
                </span>
                {user.department && (
                  <span className="text-[10px] text-slate-400 truncate">
                    • {user.department}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* User Status Selector */}
          <div className="mt-3 pt-2.5 border-t border-slate-700/60 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              My Status:
            </span>
            <select
              value={mySelectedStatus}
              onChange={(e) => handleStatusChange(e.target.value as UserPresenceStatus)}
              className="text-[11px] font-semibold bg-slate-900 border border-slate-700 text-slate-200 rounded px-2 py-0.5 focus:outline-hidden cursor-pointer"
            >
              {USER_PRESENCE_STATUSES.map((st) => (
                <option key={st} value={st}>
                  {st === 'Online'
                    ? '🟢 Online'
                    : st === 'Away'
                    ? '🟡 Away'
                    : st === 'DND'
                    ? '🔴 DND'
                    : st === 'Holiday'
                    ? '🌈 Holiday'
                    : '⚪ Offline'}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Action Button: Create Task (AVAILABLE TO ALL AUTHENTICATED USERS) */}
        {onOpenCreateTask && (
          <div className="px-4 mb-2">
            <button
              onClick={onOpenCreateTask}
              className="w-full flex items-center justify-center space-x-2 py-2 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-sm transition-all focus:outline-hidden cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Create & Assign Task</span>
            </button>
          </div>
        )}

        {/* Navigation */}
        <nav className="px-3 py-1 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileNavOpen(false)}
                className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 font-semibold'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon
                    className={`w-3.5 h-3.5 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge && item.badge > 0 ? (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold bg-red-500 text-white rounded-full animate-pulse shadow-sm">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        {/* LIVE TEAM / ACTIVE NOW SECTION (PRESENCE SIDEBAR) */}
        <div
          ref={presenceScrollRef}
          onWheel={handlePresenceWheel}
          className="flex-1 min-h-0 px-3 py-3 overflow-y-auto overscroll-contain touch-pan-y border-t border-slate-800/80 mt-2 space-y-3"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {/* Active Now */}
          <div>
            <div className="flex items-center justify-between px-2 mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Active Now ({activeUsers.length})
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>

            {activeUsers.length === 0 ? (
              <div className="px-2 py-1 text-[11px] text-slate-500 italic">
                No other users currently active
              </div>
            ) : (
              <div className="space-y-1">
                {activeUsers.map((u) => (
                  <Link
                    key={u.id}
                    href={`/chat?userId=${u.id}`}
                    onClick={() => setMobileNavOpen(false)}
                    className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-slate-800/80 text-xs transition-colors group cursor-pointer"
                    title={`Message ${u.name}`}
                  >
                    <div className="flex items-center space-x-2 truncate">
                      <span className="text-sm shrink-0">{u.animal_emoji || '🦊'}</span>
                      <span className="text-slate-200 truncate font-medium group-hover:text-indigo-300 transition-colors">{u.name}</span>
                    </div>
                    <div className="flex items-center space-x-1.5 shrink-0 ml-2">
                      <span className="text-[10px] text-slate-400 capitalize">{u.effective_status}</span>
                      {getStatusIndicator(u.effective_status)}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Offline Users */}
          <div>
            <div className="px-2 mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Offline ({offlineUsers.length})
              </span>
            </div>

            <div className="space-y-0.5">
              {offlineUsers.slice(0, 8).map((u) => (
                <div
                  key={u.id}
                  className="flex items-center justify-between px-2 py-1 rounded text-xs opacity-60 hover:opacity-100 transition-opacity"
                >
                  <div className="flex items-center space-x-2 truncate">
                    <span className="text-sm shrink-0 grayscale">{u.animal_emoji || '🦊'}</span>
                    <span className="text-slate-400 truncate">{u.name}</span>
                  </div>
                  {getStatusIndicator('Offline')}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer / Logout */}
        <div className="p-3 border-t border-slate-800 space-y-1.5">
          <div className="text-[10px] text-slate-500 text-center truncate">
            {user.email}
          </div>
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="w-full flex items-center justify-center space-x-2 py-1.5 px-3 rounded-lg text-xs font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 border border-red-500/20 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{isLoggingOut ? 'Signing out...' : 'Sign out'}</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 shadow-2xs">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setMobileNavOpen(true)}
              className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-slate-900">
                {getPageTitle()}
              </h1>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {onOpenCreateTask && (
              <button
                onClick={onOpenCreateTask}
                className="hidden sm:inline-flex items-center space-x-1.5 py-1.5 px-3.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>+ Create Task</span>
              </button>
            )}
            <div className="h-8 w-px bg-slate-200 hidden sm:block" />

            {/* Redesigned Top-Right Profile Control & Compact Account Menu */}
            <div className="relative">
              <button
                id="top-profile-control"
                type="button"
                onClick={() => setIsProfileMenuOpen((prev) => !prev)}
                className="flex items-center space-x-2.5 p-1.5 rounded-xl hover:bg-slate-100 transition-colors text-left cursor-pointer border border-transparent hover:border-slate-200"
                aria-expanded={isProfileMenuOpen}
                aria-label="User account menu"
              >
                <div className="relative">
                  <div className="h-8 w-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-lg shadow-2xs shrink-0">
                    {user.animal_emoji || '🦊'}
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 p-0.5 bg-white rounded-full">
                    {getStatusIndicator(mySelectedStatus)}
                  </div>
                </div>
                <div className="hidden md:block">
                  <div className="flex items-center space-x-1.5">
                    <span className="font-bold text-xs text-slate-800 leading-none">{user.name}</span>
                    <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isProfileMenuOpen ? 'rotate-180' : ''}`} />
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium capitalize block mt-0.5">{user.role}</span>
                </div>
              </button>

              {/* Account Dropdown Panel */}
              {isProfileMenuOpen && (
                <div
                  id="top-profile-dropdown"
                  className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200/80 p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
                >
                  {/* User Identity Header */}
                  <div className="flex items-center space-x-3 pb-3.5 border-b border-slate-100">
                    <div className="h-12 w-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-2xl shadow-xs shrink-0">
                      {user.animal_emoji || '🦊'}
                    </div>
                    <div className="overflow-hidden flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-slate-900 truncate block">
                          {user.name}
                        </span>
                        <div className="flex items-center space-x-1">
                          {getStatusIndicator(mySelectedStatus)}
                          <span className="text-[10px] text-slate-500 font-medium">
                            {mySelectedStatus}
                          </span>
                        </div>
                      </div>
                      <span className="text-[11px] font-semibold text-indigo-600 capitalize block">
                        {user.role}
                      </span>
                      <span className="text-xs text-slate-500 truncate block font-mono mt-0.5">
                        {user.email}
                      </span>
                    </div>
                  </div>

                  {/* Actions: Settings & Logout */}
                  <div className="pt-2 space-y-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        router.push('/settings');
                      }}
                      className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer text-left"
                    >
                      <Settings className="w-4 h-4 text-slate-400 group-hover:text-indigo-600" />
                      <span>Account Settings</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleLogout}
                      disabled={isLoggingOut}
                      className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors cursor-pointer text-left disabled:opacity-50"
                    >
                      <LogOut className="w-4 h-4 text-red-500" />
                      <span>{isLoggingOut ? 'Signing out...' : 'Logout'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
