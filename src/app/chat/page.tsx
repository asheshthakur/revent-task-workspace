'use client';

import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Search,
  Plus,
  Send,
  Users,
  CornerDownRight,
  Trash2,
  Edit2,
  Check,
  X,
  ExternalLink,
  MessageSquare,
  RefreshCw,
  MoreVertical,
  CheckCircle2,
  Clock,
  ArrowLeft,
  UserPlus,
} from 'lucide-react';
import { AppLayout } from '@/components/AppLayout';
import { PriorityBadge } from '@/components/PriorityBadge';
import { StatusBadge } from '@/components/StatusBadge';
import { ANIMAL_EMOJIS, PriorityType, StatusType } from '@/lib/constants';

interface UserProfile {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'employee';
  department?: string;
  animal_emoji?: string;
  selected_status?: string;
}

interface Member {
  id: number;
  name: string;
  email: string;
  role: string;
  department?: string;
  animal_emoji: string;
  selected_status: string;
  joined_at?: string;
  last_read_at?: string;
}

interface Conversation {
  id: number;
  type: 'direct' | 'group' | 'task';
  name: string;
  avatar_emoji: string;
  task_id?: number | null;
  task_name?: string | null;
  task_status?: string | null;
  task_priority?: string | null;
  created_by: number;
  created_at: string;
  updated_at: string;
  last_message_text?: string;
  last_message_at?: string;
  unread_count: number;
  members: Member[];
  other_user?: Member | null;
}

interface Message {
  id: number;
  conversation_id: number;
  sender_user_id: number;
  message: string;
  reply_to_id: number | null;
  reply_preview: string;
  is_deleted: number;
  created_at: string;
  edited_at: string | null;
  sender_name: string;
  sender_email: string;
  sender_animal_emoji: string;
  sender_selected_status: string;
}

interface EmployeeOption {
  id: number;
  name: string;
  email: string;
  department?: string;
  animal_emoji: string;
  is_active: number;
}

function ChatContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const targetUserIdParam = searchParams.get('userId');

  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  // Conversations & Selected Conversation
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [selectedConvId, setSelectedConvId] = useState<number | null>(null);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);

  // Messages in active conversation
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);

  // Edit message
  const [editingMsgId, setEditingMsgId] = useState<number | null>(null);
  const [editInputText, setEditInputText] = useState('');

  // Modals & Panels
  const [isNewDirectOpen, setIsNewDirectOpen] = useState(false);
  const [isNewGroupOpen, setIsNewGroupOpen] = useState(false);
  const [isGroupInfoOpen, setIsGroupInfoOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Filter & Search
  const [convFilter, setConvFilter] = useState<'all' | 'direct' | 'group' | 'task'>('all');
  const [convSearch, setConvSearch] = useState('');
  const [globalSearchTerm, setGlobalSearchTerm] = useState('');
  const [globalSearchResults, setGlobalSearchResults] = useState<any[]>([]);
  const [searchingGlobal, setSearchingGlobal] = useState(false);

  // Employees for creating chats
  const [allEmployees, setAllEmployees] = useState<EmployeeOption[]>([]);

  // Form states for New Group
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupEmoji, setNewGroupEmoji] = useState('📣');
  const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>([]);
  const [creatingGroup, setCreatingGroup] = useState(false);

  // Presence map for live indicators (id -> effective status)
  const [presenceMap, setPresenceMap] = useState<Record<number, { isOnline: boolean; status: string }>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isAutoScroll = useRef(true);

  // 1. Auth check
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

  // 2. Fetch presence map
  const fetchPresence = useCallback(async () => {
    try {
      const res = await fetch('/api/presence');
      if (res.ok) {
        const data = await res.json();
        const map: Record<number, { isOnline: boolean; status: string }> = {};
        if (data.activeUsers) {
          data.activeUsers.forEach((u: any) => {
            map[u.id] = { isOnline: true, status: u.effective_status };
          });
        }
        if (data.offlineUsers) {
          data.offlineUsers.forEach((u: any) => {
            map[u.id] = { isOnline: false, status: 'Offline' };
          });
        }
        setPresenceMap(map);
      }
    } catch {
      // Ignore presence poll error
    }
  }, []);

  // 3. Fetch all active employees (for new chat modals)
  const fetchEmployees = useCallback(async () => {
    try {
      const res = await fetch('/api/employees');
      if (res.ok) {
        const data = await res.json();
        if (data.employees) {
          setAllEmployees(data.employees.filter((e: any) => e.is_active === 1));
        }
      }
    } catch (err) {
      console.error('Failed to load employees for chat:', err);
    }
  }, []);

  // 4. Fetch Conversations
  const fetchConversations = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoadingConvs(true);
      const res = await fetch('/api/chat/conversations');
      if (res.ok) {
        const data = await res.json();
        if (data.conversations) {
          setConversations(data.conversations);
        }
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      if (!silent) setLoadingConvs(false);
    }
  }, []);

  // 5. Fetch Messages for active conversation
  const fetchMessages = useCallback(async (cId: number, silent = false) => {
    try {
      if (!silent) setLoadingMessages(true);
      const res = await fetch(`/api/chat/conversations/${cId}/messages?limit=60`);
      if (res.ok) {
        const data = await res.json();
        if (data.messages) {
          setMessages(data.messages);

          // Mark conversation as read
          fetch(`/api/chat/conversations/${cId}/read`, { method: 'POST' }).catch(() => {});
          // Update local unread count
          setConversations((prev) =>
            prev.map((c) => (c.id === cId ? { ...c, unread_count: 0 } : c))
          );
        }
      }
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      if (!silent) setLoadingMessages(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    if (currentUser) {
      fetchConversations();
      fetchEmployees();
      fetchPresence();

      // Poll presence and conversation unread counts every 10s
      const pollTimer = setInterval(() => {
        if (typeof document !== 'undefined' && !document.hidden) {
          fetchConversations(true);
          fetchPresence();
        }
      }, 10000);

      return () => clearInterval(pollTimer);
    }
  }, [currentUser, fetchConversations, fetchEmployees, fetchPresence]);

  // Handle URL param: targetUserId
  useEffect(() => {
    if (!targetUserIdParam || !currentUser || allEmployees.length === 0) return;

    const targetId = parseInt(targetUserIdParam, 10);
    if (isNaN(targetId) || targetId === currentUser.id) return;

    // Trigger direct chat
    const startDirectChat = async () => {
      try {
        const res = await fetch('/api/chat/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'direct', targetUserId: targetId }),
        });
        if (res.ok) {
          const data = await res.json();
          await fetchConversations(true);
          setSelectedConvId(data.conversationId);
        }
      } catch (err) {
        console.error('Error starting direct chat:', err);
      }
    };

    startDirectChat();
  }, [targetUserIdParam, currentUser, allEmployees, fetchConversations]);

  // When selectedConvId changes, fetch messages and sync activeConv
  useEffect(() => {
    if (!selectedConvId) {
      setActiveConv(null);
      setMessages([]);
      return;
    }

    const current = conversations.find((c) => c.id === selectedConvId) || null;
    setActiveConv(current);
    fetchMessages(selectedConvId);

    // Fast polling while active in this conversation (3s)
    const activeMsgPoll = setInterval(() => {
      if (typeof document !== 'undefined' && !document.hidden) {
        fetchMessages(selectedConvId, true);
      }
    }, 2500);

    return () => clearInterval(activeMsgPoll);
  }, [selectedConvId, conversations, fetchMessages]);

  // Auto scroll to bottom
  useEffect(() => {
    if (isAutoScroll.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Send message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || !selectedConvId || sending) return;

    const textToSend = inputText.trim();
    const replyTarget = replyTo;
    setInputText('');
    setReplyTo(null);
    setSending(true);

    try {
      const res = await fetch(`/api/chat/conversations/${selectedConvId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          reply_to_id: replyTarget ? replyTarget.id : null,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.message) {
          setMessages((prev) => [...prev, data.message]);
          isAutoScroll.current = true;
          // Refresh conversations list to update preview and order
          fetchConversations(true);
        }
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to send message');
        setInputText(textToSend);
      }
    } catch (err) {
      console.error('Error sending message:', err);
      setInputText(textToSend);
    } finally {
      setSending(false);
    }
  };

  // Delete message
  const handleDeleteMessage = async (msgId: number) => {
    if (!window.confirm('Delete this message?')) return;
    try {
      const res = await fetch(`/api/chat/messages/${msgId}`, { method: 'DELETE' });
      if (res.ok) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msgId ? { ...m, is_deleted: 1, message: 'This message was deleted' } : m
          )
        );
        fetchConversations(true);
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to delete message');
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  // Edit message
  const handleStartEdit = (msg: Message) => {
    setEditingMsgId(msg.id);
    setEditInputText(msg.message);
  };

  const handleSaveEdit = async (msgId: number) => {
    if (!editInputText.trim()) return;
    try {
      const res = await fetch(`/api/chat/messages/${msgId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: editInputText.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msgId ? { ...m, message: data.message, edited_at: data.edited_at } : m
          )
        );
        setEditingMsgId(null);
        fetchConversations(true);
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to edit message');
      }
    } catch (err) {
      console.error('Edit error:', err);
    }
  };

  // Create Direct Chat
  const handleSelectDirectUser = async (targetId: number) => {
    try {
      setIsNewDirectOpen(false);
      const res = await fetch('/api/chat/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'direct', targetUserId: targetId }),
      });
      if (res.ok) {
        const data = await res.json();
        await fetchConversations(true);
        setSelectedConvId(data.conversationId);
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to start direct conversation');
      }
    } catch (err) {
      console.error('Direct chat error:', err);
    }
  };

  // Create Group Chat
  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim() || selectedMemberIds.length === 0 || creatingGroup) return;

    try {
      setCreatingGroup(true);
      const res = await fetch('/api/chat/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'group',
          name: newGroupName.trim(),
          avatarEmoji: newGroupEmoji,
          memberIds: selectedMemberIds,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setIsNewGroupOpen(false);
        setNewGroupName('');
        setSelectedMemberIds([]);
        await fetchConversations(true);
        setSelectedConvId(data.conversationId);
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to create group');
      }
    } catch (err) {
      console.error('Create group error:', err);
    } finally {
      setCreatingGroup(false);
    }
  };

  // Global Message Search
  const handleGlobalSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!globalSearchTerm.trim()) return;

    try {
      setSearchingGlobal(true);
      const res = await fetch(`/api/chat/search?q=${encodeURIComponent(globalSearchTerm.trim())}`);
      if (res.ok) {
        const data = await res.json();
        setGlobalSearchResults(data.results || []);
      }
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setSearchingGlobal(false);
    }
  };

  const getStatusDot = (userId?: number) => {
    if (!userId) return null;
    const p = presenceMap[userId];
    if (!p || !p.isOnline) {
      return <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0" title="Offline" />;
    }
    switch (p.status) {
      case 'Online':
        return <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-2xs shrink-0" title="Online" />;
      case 'Away':
        return <span className="w-2 h-2 rounded-full bg-amber-400 shadow-2xs shrink-0" title="Away" />;
      case 'DND':
        return <span className="w-2 h-2 rounded-full bg-red-500 shadow-2xs shrink-0" title="DND" />;
      case 'Holiday':
        return (
          <span
            className="w-2 h-2 rounded-full bg-gradient-to-r from-pink-500 to-indigo-500 shadow-2xs shrink-0"
            title="Holiday"
          />
        );
      default:
        return <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0" title="Offline" />;
    }
  };

  const formatMsgTime = (iso: string) => {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const formatRelativeTime = (iso?: string) => {
    if (!iso) return '';
    try {
      const diffMs = Date.now() - new Date(iso).getTime();
      const mins = Math.floor(diffMs / 60000);
      if (mins < 1) return 'just now';
      if (mins < 60) return `${mins}m ago`;
      const hrs = Math.floor(mins / 60);
      if (hrs < 24) return `${hrs}h ago`;
      const days = Math.floor(hrs / 24);
      return `${days}d ago`;
    } catch {
      return '';
    }
  };

  // Filter conversations
  const filteredConversations = conversations.filter((c) => {
    if (convFilter !== 'all' && c.type !== convFilter) return false;
    if (convSearch.trim()) {
      const q = convSearch.toLowerCase();
      const matchName = c.name?.toLowerCase().includes(q);
      const matchMsg = c.last_message_text?.toLowerCase().includes(q);
      return matchName || matchMsg;
    }
    return true;
  });

  if (loadingUser || !currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-slate-400 font-medium">Loading Workspace Chat...</span>
        </div>
      </div>
    );
  }

  return (
    <AppLayout user={currentUser}>
      <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] overflow-hidden bg-slate-100">
        <div className="flex-1 flex min-h-0 bg-white shadow-xs border-t border-slate-200">
          {/* ================= LEFT CONVERSATION SIDEBAR ================= */}
          <div
            className={`w-full md:w-80 lg:w-96 flex flex-col border-r border-slate-200 bg-white ${
              selectedConvId ? 'hidden md:flex' : 'flex'
            }`}
          >
            {/* Top Toolbar */}
            <div className="p-3 border-b border-slate-100 space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-indigo-600" />
                  <span>Conversations</span>
                </h2>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => setIsSearchOpen(true)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                    title="Search Messages"
                  >
                    <Search className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setIsNewDirectOpen(true)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                    title="New 1-on-1 Message"
                  >
                    <UserPlus className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setIsNewGroupOpen(true)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                    title="New Group Chat"
                  >
                    <Users className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Search Conversations Input */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter chats or messages..."
                  value={convSearch}
                  onChange={(e) => setConvSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              {/* Filter Pills */}
              <div className="flex items-center space-x-1 text-[11px] font-semibold pt-1">
                {(['all', 'direct', 'group', 'task'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setConvFilter(filter)}
                    className={`px-2 py-0.5 rounded-md capitalize transition-colors cursor-pointer ${
                      convFilter === filter
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                    }`}
                  >
                    {filter === 'direct' ? '1-on-1' : filter === 'task' ? 'Tasks' : filter}
                  </button>
                ))}
              </div>
            </div>

            {/* Conversation List */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
              {loadingConvs && conversations.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-slate-400 space-y-2">
                  <RefreshCw className="w-5 h-5 animate-spin text-indigo-500" />
                  <span className="text-xs">Loading conversations...</span>
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="py-12 px-6 text-center text-slate-400 space-y-2">
                  <span className="text-3xl block">💬</span>
                  <p className="text-xs font-semibold text-slate-700">No conversations found</p>
                  <p className="text-[11px]">Start a 1-on-1 chat or create a team group above.</p>
                </div>
              ) : (
                filteredConversations.map((conv) => {
                  const isSelected = selectedConvId === conv.id;
                  const otherUserId = conv.type === 'direct' ? conv.other_user?.id : undefined;

                  return (
                    <button
                      key={conv.id}
                      onClick={() => setSelectedConvId(conv.id)}
                      className={`w-full text-left p-3 flex items-start space-x-3 transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-50/80 border-r-2 border-indigo-600'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      {/* Avatar with Presence Indicator */}
                      <div className="relative shrink-0">
                        <div className="h-10 w-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xl shadow-2xs">
                          {conv.avatar_emoji || (conv.type === 'task' ? '📋' : '🦊')}
                        </div>
                        {conv.type === 'direct' && otherUserId && (
                          <div className="absolute -bottom-0.5 -right-0.5 p-0.5 bg-white rounded-full">
                            {getStatusDot(otherUserId)}
                          </div>
                        )}
                      </div>

                      {/* Info & Last message */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="font-bold text-xs text-slate-900 truncate block">
                            {conv.name}
                          </span>
                          <span className="text-[10px] text-slate-400 whitespace-nowrap ml-1">
                            {formatRelativeTime(conv.last_message_at || conv.updated_at)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-1">
                          <p className="text-xs text-slate-500 truncate">
                            {conv.last_message_text || (
                              <span className="italic text-slate-400">No messages yet</span>
                            )}
                          </p>
                          {conv.unread_count > 0 && (
                            <span className="px-1.5 py-0.2 text-[10px] font-bold bg-red-500 text-white rounded-full animate-pulse shadow-xs shrink-0">
                              {conv.unread_count}
                            </span>
                          )}
                        </div>

                        {/* Task Tag */}
                        {conv.type === 'task' && conv.task_name && (
                          <div className="mt-1 flex items-center space-x-1.5">
                            <span className="text-[9px] uppercase font-bold px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-700">
                              {conv.task_status || 'Task'}
                            </span>
                            {conv.task_priority && (
                              <span className="text-[9px] font-medium text-slate-400">
                                • {conv.task_priority}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* ================= MAIN CHAT AREA ================= */}
          <div
            className={`flex-1 flex flex-col bg-slate-50 min-w-0 ${
              !selectedConvId ? 'hidden md:flex' : 'flex'
            }`}
          >
            {activeConv ? (
              <>
                {/* Active Chat Header */}
                <div className="px-4 py-3 bg-white border-b border-slate-200 flex items-center justify-between shadow-2xs">
                  <div className="flex items-center space-x-3 truncate">
                    <button
                      onClick={() => setSelectedConvId(null)}
                      className="md:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 cursor-pointer"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>

                    <div className="h-9 w-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xl shrink-0">
                      {activeConv.avatar_emoji || '💬'}
                    </div>

                    <div className="truncate">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-bold text-sm text-slate-900 truncate">
                          {activeConv.name}
                        </h3>
                        {activeConv.type === 'direct' && activeConv.other_user?.id && (
                          <div className="flex items-center space-x-1 text-[11px] text-slate-500">
                            {getStatusDot(activeConv.other_user.id)}
                            <span className="capitalize">
                              {presenceMap[activeConv.other_user.id]?.status || 'Offline'}
                            </span>
                          </div>
                        )}
                      </div>

                      {activeConv.type === 'group' && (
                        <p className="text-[11px] text-slate-400 truncate">
                          {activeConv.members?.length || 0} members: {activeConv.members?.map((m) => m.name).join(', ')}
                        </p>
                      )}

                      {activeConv.type === 'task' && activeConv.task_id && (
                        <div className="flex items-center space-x-2 text-[11px] text-indigo-600">
                          <span>Associated Task #{activeConv.task_id}</span>
                          <button
                            onClick={() => router.push(`/all-tasks`)}
                            className="hover:underline flex items-center space-x-0.5 cursor-pointer"
                          >
                            <span>View Task</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Header Actions */}
                  {activeConv.type === 'group' && (
                    <button
                      onClick={() => setIsGroupInfoOpen(true)}
                      className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                      title="Group Details"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Messages Thread */}
                <div className="flex-1 p-4 overflow-y-auto space-y-3.5">
                  {loadingMessages && messages.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-slate-400 space-y-2">
                      <RefreshCw className="w-5 h-5 animate-spin text-indigo-500" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-1">
                      <span className="text-4xl">👋</span>
                      <p className="text-sm font-semibold text-slate-700">No messages in this chat yet</p>
                      <p className="text-xs">Say hello or share project updates below.</p>
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isMe = msg.sender_user_id === currentUser.id;
                      const isDeleted = msg.is_deleted === 1;

                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group`}
                        >
                          {/* Sender Info */}
                          <div className="flex items-center space-x-1.5 mb-1 px-1">
                            <span className="text-xs">{msg.sender_animal_emoji || '🦊'}</span>
                            <span className="text-[11px] font-semibold text-slate-700">
                              {isMe ? 'You' : msg.sender_name}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {formatMsgTime(msg.created_at)}
                            </span>
                            {msg.edited_at && !isDeleted && (
                              <span className="text-[9px] text-slate-400 italic">(edited)</span>
                            )}
                          </div>

                          {/* Reply Quote */}
                          {msg.reply_preview && (
                            <div className="text-[11px] text-slate-500 bg-slate-200/60 border-l-2 border-indigo-500 px-2 py-0.5 mb-1 rounded-r max-w-sm truncate">
                              ↳ {msg.reply_preview}
                            </div>
                          )}

                          {/* Message Bubble */}
                          <div className="relative max-w-[85%] sm:max-w-md">
                            {editingMsgId === msg.id ? (
                              <div className="flex items-center space-x-1.5 p-1 bg-white border border-indigo-400 rounded-lg shadow-sm">
                                <input
                                  type="text"
                                  value={editInputText}
                                  onChange={(e) => setEditInputText(e.target.value)}
                                  className="text-xs px-2 py-1 flex-1 border-0 focus:outline-hidden"
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveEdit(msg.id);
                                    if (e.key === 'Escape') setEditingMsgId(null);
                                  }}
                                />
                                <button
                                  onClick={() => handleSaveEdit(msg.id)}
                                  className="p-1 text-emerald-600 hover:bg-emerald-50 rounded cursor-pointer"
                                  title="Save edit"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => setEditingMsgId(null)}
                                  className="p-1 text-slate-400 hover:bg-slate-100 rounded cursor-pointer"
                                  title="Cancel"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <div
                                className={`px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed break-words shadow-2xs ${
                                  isDeleted
                                    ? 'bg-slate-200/60 text-slate-500 italic border border-slate-300/40'
                                    : isMe
                                    ? 'bg-indigo-600 text-white rounded-br-xs'
                                    : 'bg-white text-slate-800 border border-slate-200/80 rounded-bl-xs'
                                }`}
                              >
                                {msg.message}
                              </div>
                            )}

                            {/* Floating Action Menu (Reply, Edit, Delete) */}
                            {!isDeleted && editingMsgId !== msg.id && (
                              <div
                                className={`absolute top-0 ${
                                  isMe ? '-left-16' : '-right-16'
                                } hidden group-hover:flex items-center space-x-0.5 bg-white border border-slate-200 rounded-md p-0.5 shadow-xs z-10`}
                              >
                                <button
                                  onClick={() => setReplyTo(msg)}
                                  className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded cursor-pointer"
                                  title="Reply"
                                >
                                  <CornerDownRight className="w-3 h-3" />
                                </button>
                                {isMe && (
                                  <button
                                    onClick={() => handleStartEdit(msg)}
                                    className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded cursor-pointer"
                                    title="Edit"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                )}
                                {(isMe || currentUser.role === 'admin') && (
                                  <button
                                    onClick={() => handleDeleteMessage(msg.id)}
                                    className="p-1 text-slate-400 hover:text-red-600 hover:bg-slate-50 rounded cursor-pointer"
                                    title="Delete"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input & Reply Area */}
                <div className="p-3 bg-white border-t border-slate-200">
                  {replyTo && (
                    <div className="flex items-center justify-between bg-indigo-50 border-l-2 border-indigo-500 px-3 py-1.5 mb-2 rounded-r text-xs text-indigo-900">
                      <span className="truncate">
                        Replying to <strong>{replyTo.sender_name}</strong>: &quot;{replyTo.message.slice(0, 60)}&quot;
                      </span>
                      <button
                        onClick={() => setReplyTo(null)}
                        className="text-slate-400 hover:text-slate-600 ml-2 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
                    <input
                      type="text"
                      placeholder={`Message ${activeConv.name}... (Press Enter to send)`}
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      disabled={sending}
                      className="flex-1 px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    />
                    <button
                      type="submit"
                      disabled={!inputText.trim() || sending}
                      className="p-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl transition-colors cursor-pointer shadow-xs"
                      title="Send Message"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                </div>
              </>
            ) : (
              /* No Active Chat Selected State */
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400 space-y-3">
                <div className="h-16 w-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-3xl shadow-sm text-indigo-600">
                  💬
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Select a Conversation</h3>
                  <p className="text-xs text-slate-500 max-w-sm mt-1">
                    Choose an existing chat from the left or start a new 1-on-1 discussion with any team member.
                  </p>
                </div>
                <div className="flex items-center space-x-2 pt-2">
                  <button
                    onClick={() => setIsNewDirectOpen(true)}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer shadow-xs"
                  >
                    + Direct Message
                  </button>
                  <button
                    onClick={() => setIsNewGroupOpen(true)}
                    className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-lg transition-colors cursor-pointer"
                  >
                    + New Group
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ================= MODAL 1: NEW DIRECT MESSAGE ================= */}
      {isNewDirectOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-indigo-600" />
                <span>Message a Team Member</span>
              </h3>
              <button
                onClick={() => setIsNewDirectOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 max-h-80 overflow-y-auto space-y-1">
              {allEmployees
                .filter((e) => e.id !== currentUser.id)
                .map((emp) => (
                  <button
                    key={emp.id}
                    onClick={() => handleSelectDirectUser(emp.id)}
                    className="w-full p-2.5 rounded-xl flex items-center justify-between hover:bg-indigo-50/70 text-left transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center text-xl shrink-0">
                        {emp.animal_emoji || '🦊'}
                      </div>
                      <div>
                        <span className="font-bold text-xs text-slate-900 group-hover:text-indigo-600 block">
                          {emp.name}
                        </span>
                        <span className="text-[11px] text-slate-400 block">
                          {emp.department || emp.email}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      {getStatusDot(emp.id)}
                      <span className="text-[10px] text-slate-400 capitalize">
                        {presenceMap[emp.id]?.status || 'Offline'}
                      </span>
                    </div>
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 2: CREATE GROUP CHAT ================= */}
      {isNewGroupOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600" />
                <span>Create Group Conversation</span>
              </h3>
              <button
                onClick={() => setIsNewGroupOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateGroup} className="p-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Group Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Marketing Team, Project Apollo"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Select Group Emoji
                </label>
                <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 border border-slate-200 rounded-lg">
                  {['📣', '🚀', '💡', '🔥', '🎯', '✨', '⚡', '📊', '💼', '🤝'].map((emoji) => (
                    <button
                      type="button"
                      key={emoji}
                      onClick={() => setNewGroupEmoji(emoji)}
                      className={`h-8 w-8 rounded-lg flex items-center justify-center text-lg transition-transform cursor-pointer ${
                        newGroupEmoji === emoji
                          ? 'bg-indigo-600 text-white scale-110 shadow-xs'
                          : 'hover:bg-slate-200'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Add Members ({selectedMemberIds.length} selected)
                </label>
                <div className="max-h-40 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-lg p-1">
                  {allEmployees
                    .filter((e) => e.id !== currentUser.id)
                    .map((emp) => {
                      const isChecked = selectedMemberIds.includes(emp.id);
                      return (
                        <label
                          key={emp.id}
                          className="flex items-center justify-between p-2 hover:bg-slate-50 rounded cursor-pointer"
                        >
                          <div className="flex items-center space-x-2">
                            <span>{emp.animal_emoji || '🦊'}</span>
                            <span className="text-xs font-medium text-slate-800">{emp.name}</span>
                          </div>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedMemberIds((prev) => [...prev, emp.id]);
                              } else {
                                setSelectedMemberIds((prev) => prev.filter((id) => id !== emp.id));
                              }
                            }}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                        </label>
                      );
                    })}
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewGroupOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newGroupName.trim() || selectedMemberIds.length === 0 || creatingGroup}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer shadow-xs"
                >
                  {creatingGroup ? 'Creating...' : 'Create Group'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL 3: GLOBAL MESSAGE SEARCH ================= */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col max-h-[80vh]">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Search className="w-4 h-4 text-indigo-600" />
                <span>Search Authorized Messages</span>
              </h3>
              <button
                onClick={() => setIsSearchOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleGlobalSearch} className="p-4 border-b border-slate-100 flex gap-2">
              <input
                type="text"
                placeholder="Type keyword, phrase, or sender name..."
                value={globalSearchTerm}
                onChange={(e) => setGlobalSearchTerm(e.target.value)}
                autoFocus
                className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
              <button
                type="submit"
                disabled={!globalSearchTerm.trim() || searchingGlobal}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-lg cursor-pointer"
              >
                {searchingGlobal ? 'Searching...' : 'Search'}
              </button>
            </form>

            <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
              {globalSearchResults.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  {searchingGlobal ? 'Searching messages...' : 'No search results to display.'}
                </div>
              ) : (
                globalSearchResults.map((res) => (
                  <button
                    key={res.message_id}
                    onClick={() => {
                      setIsSearchOpen(false);
                      setSelectedConvId(res.conversation_id);
                    }}
                    className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-indigo-50/60 text-left transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                      <span className="font-bold text-indigo-700">
                        {res.conversation_name || (res.conversation_type === 'task' ? `Task: ${res.task_name}` : 'Conversation')}
                      </span>
                      <span>{formatMsgTime(res.created_at)}</span>
                    </div>
                    <div className="flex items-center space-x-1.5 text-xs text-slate-800">
                      <span>{res.sender_animal_emoji || '🦊'}</span>
                      <strong className="font-semibold">{res.sender_name}:</strong>
                      <span className="truncate">{res.message}</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
          <div className="flex flex-col items-center space-y-3">
            <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-slate-400 font-medium">Loading Workspace Chat...</span>
          </div>
        </div>
      }
    >
      <ChatContent />
    </Suspense>
  );
}
