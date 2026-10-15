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
  ChevronRight,
  DollarSign,
  Receipt,
  CreditCard,
  FileCheck,
  Bell,
  Check,
  Building2,
  Search,
  Zap,
  BookOpen,
  Calendar,
  FolderKanban,
  Clock,
  Gauge,
  Boxes,
  Sun,
  Moon,
  Laptop,
  Share2,
} from 'lucide-react';
import { USER_PRESENCE_STATUSES, UserPresenceStatus } from '@/lib/constants';
import { WorkspaceSwitcher } from './WorkspaceSwitcher';
import { GlobalSearchModal } from './GlobalSearchModal';
import { GlobalTimerControl } from './GlobalTimerControl';

interface AppLayoutProps {
  user?: {
    id: number;
    name: string;
    email: string;
    role: 'admin' | 'employee';
    workspaceRole?: 'owner' | 'admin' | 'manager' | 'member' | 'guest';
    department?: string;
    animal_emoji?: string;
    selected_status?: string;
    can_reset_other_user_passwords?: boolean;
  } | null;
  children: React.ReactNode;
  onOpenCreateTask?: () => void;
  fullWidth?: boolean;
  noPadding?: boolean;
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

interface DepartmentSectionProps {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  items: Array<{
    label: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number | null;
  }>;
  currentPath: string;
  onNavigate: () => void;
}

const DepartmentSection: React.FC<DepartmentSectionProps> = ({
  title,
  isOpen,
  onToggle,
  items,
  currentPath,
  onNavigate,
}) => {
  const isAnyChildActive = items.some((item) => currentPath === item.href);
  const isExpanded = isOpen || isAnyChildActive;

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isExpanded}
        className={`w-full flex items-center justify-between px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded-md transition-colors cursor-pointer select-none ${
          isAnyChildActive
            ? 'text-indigo-300 bg-indigo-600/20'
            : 'text-slate-400 hover:text-white hover:bg-slate-800'
        }`}
      >
        <span className="flex items-center gap-1.5">
          {title}
        </span>
        {isExpanded ? (
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 transition-transform" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-slate-400 transition-transform" />
        )}
      </button>

      {isExpanded && (
        <div className="space-y-0.5 pl-2">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = currentPath === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 font-semibold'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="flex items-center space-x-2.5 truncate">
                  <Icon
                    className={`w-3.5 h-3.5 shrink-0 ${
                      isActive ? 'text-indigo-400' : 'text-slate-400'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge && item.badge > 0 ? (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold bg-red-500 text-white rounded-full animate-pulse shadow-xs">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const AppLayout: React.FC<AppLayoutProps> = ({
  user: rawUser,
  children,
  onOpenCreateTask,
  fullWidth = false,
  noPadding = false,
}) => {
  const user = rawUser || {
    id: 0,
    name: 'Loading...',
    email: '',
    role: 'employee',
    workspaceRole: 'member',
    animal_emoji: '🦊',
    selected_status: 'Online',
  };
  const pathname = usePathname();
  const router = useRouter();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Presence & Chat & Notification states
  const [activeUsers, setActiveUsers] = useState<PresenceUser[]>([]);
  const [offlineUsers, setOfflineUsers] = useState<PresenceUser[]>([]);
  const [unreadChatCount, setUnreadChatCount] = useState<number>(0);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [mySelectedStatus, setMySelectedStatus] = useState<UserPresenceStatus>(
    (user.selected_status as UserPresenceStatus) || 'Online'
  );
  // Notifications state
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState<number>(0);
  const [isNotificationMenuOpen, setIsNotificationMenuOpen] = useState(false);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  // Global Search state
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Department collapse state in browser localStorage
  const [openDepartments, setOpenDepartments] = useState<Record<string, boolean>>({
    operations: true,
    finance: true,
  });

  useEffect(() => {
    try {
      const stored = localStorage.getItem('veya_sidebar_depts');
      if (stored) {
        setOpenDepartments((prev) => ({ ...prev, ...JSON.parse(stored) }));
      }
    } catch {
      // LocalStorage not available or restricted
    }
  }, []);

  const toggleDepartment = (deptKey: string) => {
    setOpenDepartments((prev) => {
      const next = { ...prev, [deptKey]: !prev[deptKey] };
      try {
        localStorage.setItem('veya_sidebar_depts', JSON.stringify(next));
      } catch {
        // LocalStorage not available
      }
      return next;
    });
  };

  // Global Cmd+K keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close dropdowns when clicking outside and register SW
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('#top-profile-control') && !target.closest('#top-profile-dropdown')) {
        setIsProfileMenuOpen(false);
      }
      if (!target.closest('#top-notification-bell') && !target.closest('#top-notifications-dropdown')) {
        setIsNotificationMenuOpen(false);
      }
    };
    document.addEventListener('click', handleOutsideClick);

    // Register service worker if available in browser
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.warn('SW registration skipped:', err);
      });
    }

    // Listen for desktop deep link navigation
    if (typeof window !== 'undefined' && (window as any).reventDesktop?.onNavigate) {
      (window as any).reventDesktop.onNavigate((url: string) => {
        if (url) router.push(url);
      });
    }

    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoadingNotifications(true);
      const res = await fetch('/api/notifications?limit=15');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        const unread = data.unreadCount || 0;
        setUnreadNotificationCount(unread);

        // Update desktop badge if running in Electron desktop app
        if (typeof window !== 'undefined' && (window as any).reventDesktop?.setBadgeCount) {
          (window as any).reventDesktop.setBadgeCount(unread);
        }
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoadingNotifications(false);
    }
  };

  const handleMarkAllNotificationsRead = async () => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllAsRead: true }),
      });
      setUnreadNotificationCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const handleNotificationClick = async (notif: any) => {
    try {
      if (!notif.is_read) {
        await fetch('/api/notifications', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notificationId: notif.id }),
        });
        setUnreadNotificationCount((prev) => Math.max(0, prev - 1));
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, is_read: 1 } : n))
        );
      }
    } catch (err) {
      console.error('Error updating notification read state:', err);
    } finally {
      setIsNotificationMenuOpen(false);
      if (notif.target_url) {
        router.push(notif.target_url);
      }
    }
  };

  // Heartbeat & Presence & Notification Polling (25s interval)
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

    // Initial heartbeat & notification fetch
    sendHeartbeatAndFetchPresence();
    fetchNotifications();

    // Heartbeat every 25 seconds
    const interval = setInterval(() => {
      // Only send heartbeat if tab is visible to conserve free tier limits
      if (typeof document !== 'undefined' && !document.hidden) {
        sendHeartbeatAndFetchPresence();
        fetchNotifications();
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

  const wRole = user.workspaceRole || (user.role === 'admin' ? 'admin' : 'member');
  const isGuest = wRole === 'guest';
  const canFinance = !isGuest && (wRole === 'owner' || wRole === 'admin');
  const canAllTasks = !isGuest && (wRole === 'owner' || wRole === 'admin' || wRole === 'manager');
  const canAutomations = !isGuest;
  const canWorkspaceSettings = !isGuest && (wRole === 'owner' || wRole === 'admin');
  const canAnalytics = !isGuest && (wRole === 'owner' || wRole === 'admin' || wRole === 'manager');
  const canTeamDirectory = !isGuest;

  const guestNavItems = [
    {
      label: 'Shared Projects',
      href: '/client/projects',
      icon: FolderKanban,
      show: true,
      badge: null as number | null,
    },
    {
      label: 'Shared Pages',
      href: '/client/pages',
      icon: BookOpen,
      show: true,
      badge: null as number | null,
    },
  ];

  const coreNavItems = isGuest
    ? guestNavItems
    : [
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
          show: user.role === 'employee' || wRole === 'manager',
        },
        {
          label: 'Chat',
          href: '/chat',
          icon: MessageSquare,
          badge: unreadChatCount > 0 ? unreadChatCount : null,
          show: true,
        },
        {
          label: 'Pages',
          href: '/pages',
          icon: BookOpen,
          show: true,
        },
        {
          label: 'Clients',
          href: '/finance/clients',
          icon: Users,
          show: true,
        },
        {
          label: 'Projects',
          href: '/projects',
          icon: FolderKanban,
          show: true,
        },
        {
          label: 'Time',
          href: '/time',
          icon: Clock,
          show: true,
        },
        {
          label: 'Workload',
          href: '/workload',
          icon: Gauge,
          show: true,
        },
        {
          label: 'Reports',
          href: '/reports',
          icon: BarChart3,
          show: true,
        },
        {
          label: 'Calendar',
          href: '/calendar',
          icon: Calendar,
          show: true,
        },
      ].filter((item) => item.show);

  // Department definitions
  const operationsDept = {
    key: 'operations',
    name: 'OPERATIONS',
    items: isGuest
      ? []
      : [
          {
            label: 'Automations',
            href: '/automations',
            icon: Zap,
            show: canAutomations,
          },
        ].filter((item) => item.show),
  };

  const financeDept = {
    key: 'finance',
    name: 'FINANCE',
    items: isGuest
      ? []
      : [
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
        ].filter((item) => item.show),
  };

  const marketingDept = {
    key: 'marketing',
    name: 'MARKETING',
    items: isGuest
      ? []
      : [
          {
            label: 'Social Economy',
            href: '/marketing/social-economy',
            icon: Share2,
            show: true,
          },
        ].filter((item) => item.show),
  };

  // Administration / Workspace management (for admin / manager / owner)
  const managementNavItems = [
    {
      label: 'All Tasks',
      href: '/all-tasks',
      icon: Layers,
      show: canAllTasks,
    },
    {
      label: 'Team Directory',
      href: '/team',
      icon: Users,
      show: canTeamDirectory && (user.role === 'admin' || !!user.can_reset_other_user_passwords || wRole === 'manager'),
    },
    {
      label: 'Employee Analytics',
      href: '/analytics',
      icon: BarChart3,
      show: canAnalytics,
    },
    {
      label: 'Activity & Audit Log',
      href: '/audit-log',
      icon: History,
      show: canAnalytics,
    },
    {
      label: 'Workspace Settings',
      href: '/settings/workspace',
      icon: Building2,
      show: canWorkspaceSettings,
    },
  ].filter((item) => item.show);

  const settingsNavItems = [
    {
      label: 'Account Settings',
      href: '/settings',
      icon: Settings,
      show: true,
    },
    {
      label: 'Integrations',
      href: '/settings/integrations',
      icon: Boxes,
      show: true,
    },
  ].filter((item) => item.show);

  const getPageTitle = () => {
    if (pathname === '/dashboard') {
      return user.role === 'admin' ? 'Organization Operations Center' : `Welcome back, ${user.name}`;
    }
    if (pathname === '/client/projects' || pathname?.startsWith('/client/projects')) return 'Client Portal — Shared Projects';
    if (pathname === '/client/pages' || pathname?.startsWith('/client/pages')) return 'Client Portal — Shared Documentation';
    if (pathname === '/chat') return 'Real-Time Internal Chat';
    if (pathname === '/pages' || pathname?.startsWith('/pages')) return 'VEYA Pages & Knowledge';
    if (pathname === '/projects' || pathname?.startsWith('/projects')) return 'Projects & Milestones';
    if (pathname === '/time' || pathname?.startsWith('/time')) return 'Time Tracking & Timesheets';
    if (pathname === '/workload' || pathname?.startsWith('/workload')) return 'Workload & Team Capacity';
    if (pathname === '/reports' || pathname?.startsWith('/reports')) return 'Operational Reporting & Intelligence';
    if (pathname === '/calendar' || pathname?.startsWith('/calendar')) return 'Workspace Calendar & Meetings';
    if (pathname === '/finance') return 'Finance Overview & KPIs';
    if (pathname === '/finance/invoices') return 'Internal Invoice Tracker';
    if (pathname === '/finance/pdcs') return 'Post-Dated Cheques (PDC) Tracker';
    if (pathname === '/finance/payments') return 'Recorded Client Payments';
    if (pathname === '/finance/clients') return 'Client Financial Profiles';
    if (pathname === '/all-tasks') return 'All Organization Tasks';
    if (pathname === '/team') return 'Employee & Team Management';
    if (pathname === '/analytics') return 'Employee & Team Performance Analytics';
    if (pathname === '/audit-log') return 'Organization Activity & Audit Log';
    if (pathname === '/settings/workspace') return 'Workspace Settings & Team Members';
    if (pathname === '/settings/integrations') return 'Google & Microsoft Integrations';
    if (pathname === '/settings') return 'Account Security & Personal Settings';
    if (pathname === '/my-tasks') return 'My Assigned Work';
    return 'Workspace';
  };

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900">
      {/* Mobile backdrop */}
      {mobileNavOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs lg:hidden"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-slate-900 text-slate-100 flex flex-col transition-transform duration-200 ease-in-out border-r border-slate-800 lg:translate-x-0 ${
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
            <div className="h-10 w-10 rounded-full bg-slate-700/80 border border-slate-600/60 flex items-center justify-center text-xl shadow-inner shrink-0">
              {user.animal_emoji || '🦊'}
            </div>
            <div className="overflow-hidden flex-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm text-slate-100 truncate block">
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

        {/* Action Button: Create Task (AVAILABLE TO NON-GUEST AUTHENTICATED USERS) */}
        {!isGuest && onOpenCreateTask && (
          <div className="px-4 mb-2">
            <button
              onClick={onOpenCreateTask}
              className="w-full flex items-center justify-center space-x-2 py-2 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-xs transition-all focus:outline-hidden cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5 text-current" />
              <span>Create & Assign Task</span>
            </button>
          </div>
        )}

        {/* Navigation & Presence Unified Scrollable Body (Strictly ONE continuous scroll context) */}
        <div className="flex-1 min-h-0 overflow-y-auto px-3 py-2 space-y-4">
          {/* 1. Core Workspace Navigation */}
          <div className="space-y-1">
            <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {isGuest ? 'Client Portal' : 'Workspace'}
            </div>
            {coreNavItems.map((item) => {
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
                    <span className="px-1.5 py-0.5 text-[10px] font-bold bg-red-500 text-white rounded-full animate-pulse shadow-xs">
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </div>

          {/* 2. Operations Department */}
          {operationsDept.items.length > 0 && (
            <div className="pt-2 border-t border-slate-800">
              <DepartmentSection
                title={operationsDept.name}
                isOpen={!!openDepartments[operationsDept.key]}
                onToggle={() => toggleDepartment(operationsDept.key)}
                items={operationsDept.items}
                currentPath={pathname}
                onNavigate={() => setMobileNavOpen(false)}
              />
            </div>
          )}

          {/* 3. Finance Department */}
          {financeDept.items.length > 0 && (
            <div className="pt-2 border-t border-slate-800">
              <DepartmentSection
                title={financeDept.name}
                isOpen={!!openDepartments[financeDept.key]}
                onToggle={() => toggleDepartment(financeDept.key)}
                items={financeDept.items}
                currentPath={pathname}
                onNavigate={() => setMobileNavOpen(false)}
              />
            </div>
          )}

          {/* 4. Marketing Department */}
          {marketingDept.items.length > 0 && (
            <div className="pt-2 border-t border-slate-800">
              <DepartmentSection
                title={marketingDept.name}
                isOpen={!!openDepartments[marketingDept.key]}
                onToggle={() => toggleDepartment(marketingDept.key)}
                items={marketingDept.items}
                currentPath={pathname}
                onNavigate={() => setMobileNavOpen(false)}
              />
            </div>
          )}

          {/* 5. Workspace Management (Admin / Manager / Owner) */}
          {managementNavItems.length > 0 && (
            <div className="pt-2 border-t border-slate-800 space-y-1">
              <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Administration
              </div>
              {managementNavItems.map((item) => {
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
                  </Link>
                );
              })}
            </div>
          )}

          {/* 5. Account Settings */}
          <div className="pt-2 border-t border-slate-800 space-y-1">
            <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Account
            </div>
            {settingsNavItems.map((item) => {
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
                </Link>
              );
            })}
          </div>

          {/* 6. LIVE TEAM / ACTIVE NOW & OFFLINE (Natural Flow, Single Scroll Context - HIDDEN FOR GUESTS) */}
          {!isGuest && (
            <div className="pt-3 border-t border-slate-800 space-y-3">
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
                          <span className="text-slate-200 truncate font-medium group-hover:text-indigo-300 transition-colors">
                            {u.name}
                          </span>
                        </div>
                        <div className="flex items-center space-x-1.5 shrink-0 ml-2">
                          <span className="text-[10px] text-slate-400 capitalize">
                            {u.effective_status}
                          </span>
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
          )}
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
            {/* Global Search Button */}
            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              className="flex items-center space-x-2 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-100 hover:bg-slate-200 text-xs font-medium text-slate-600 transition-all cursor-pointer shadow-2xs group"
              title="Search VEYA (Cmd + K)"
            >
              <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 transition-colors" />
              <span className="hidden md:inline">Search VEYA...</span>
              <kbd className="hidden sm:inline-block px-1.5 py-0.2 text-[10px] font-mono text-slate-500 bg-white border border-slate-200 rounded shadow-2xs">
                ⌘K
              </kbd>
            </button>

            {/* Global Timer Control (Persistent Live Ticker & Quick Controls) */}
            {!isGuest && <GlobalTimerControl />}

            {onOpenCreateTask && (
              <button
                onClick={onOpenCreateTask}
                className="hidden sm:inline-flex items-center space-x-1.5 py-1.5 px-3.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5 text-current" />
                <span>+ Create Task</span>
              </button>
            )}
            <div className="h-8 w-px bg-slate-200 hidden sm:block" />

            {/* Notification Bell Dropdown */}
            <div className="relative">
              <button
                id="top-notification-bell"
                type="button"
                onClick={() => {
                  setIsNotificationMenuOpen((prev) => !prev);
                  if (!isNotificationMenuOpen) {
                    fetchNotifications();
                  }
                }}
                className="relative p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer border border-transparent hover:border-slate-200"
                aria-label="Notifications"
                title="Notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadNotificationCount > 0 && (
                  <span className="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-red-500 rounded-full ring-2 ring-white animate-in zoom-in-50 duration-150">
                    {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown Panel */}
              {isNotificationMenuOpen && (
                <div
                  id="top-notifications-dropdown"
                  className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-200/80 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150"
                >
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/70">
                    <div className="flex items-center space-x-2">
                      <Bell className="w-4 h-4 text-indigo-600" />
                      <span className="font-bold text-xs text-slate-800">Notifications</span>
                      {unreadNotificationCount > 0 && (
                        <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-indigo-100 text-indigo-700 rounded-full">
                          {unreadNotificationCount} new
                        </span>
                      )}
                    </div>
                    {unreadNotificationCount > 0 && (
                      <button
                        type="button"
                        onClick={handleMarkAllNotificationsRead}
                        className="text-[11px] font-medium text-indigo-600 hover:text-indigo-800 transition-colors flex items-center space-x-1 cursor-pointer"
                      >
                        <Check className="w-3 h-3" />
                        <span>Mark all read</span>
                      </button>
                    )}
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                    {loadingNotifications && notifications.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-400">Loading notifications...</div>
                    ) : notifications.length === 0 ? (
                      <div className="p-8 text-center">
                        <Bell className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="text-xs font-medium text-slate-600">No notifications yet</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">We'll alert you when tasks, chats, or updates happen.</p>
                      </div>
                    ) : (
                      notifications.map((notif) => (
                        <div
                          key={notif.id}
                          onClick={() => handleNotificationClick(notif)}
                          className={`p-3.5 hover:bg-slate-50 transition-colors cursor-pointer flex items-start space-x-3 text-left ${
                            !notif.is_read ? 'bg-indigo-50/40' : ''
                          }`}
                        >
                          <div className="text-xl shrink-0 mt-0.5">
                            {notif.actor_animal_emoji || '🔔'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className={`text-xs truncate ${!notif.is_read ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>
                                {notif.title}
                              </p>
                              {!notif.is_read && (
                                <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0 ml-2" />
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-snug">
                              {notif.body}
                            </p>
                            <span className="text-[10px] text-slate-400 mt-1 block">
                              {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(notif.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="p-2 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between px-4">
                    <Link
                      href="/settings"
                      onClick={() => setIsNotificationMenuOpen(false)}
                      className="text-[11px] text-slate-500 hover:text-indigo-600 font-medium transition-colors"
                    >
                      Notification Preferences
                    </Link>
                  </div>
                </div>
              )}
            </div>

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
        <main
          className={`flex-1 flex flex-col w-full ${
            noPadding ? 'p-0' : 'p-4 sm:p-6 lg:p-8'
          } ${fullWidth ? 'max-w-none' : 'max-w-7xl mx-auto'}`}
        >
          {children}
        </main>
      </div>

      {/* Global Search Command Modal */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />
    </div>
  );
};
