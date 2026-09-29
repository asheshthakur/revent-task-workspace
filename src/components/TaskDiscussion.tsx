'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, CornerDownRight, Trash2, Edit2, Check, X, RefreshCw, MessageSquare } from 'lucide-react';

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

interface TaskDiscussionProps {
  taskId: number;
  taskName: string;
  currentUser: {
    id: number;
    name: string;
    role: 'admin' | 'employee';
  };
}

export const TaskDiscussion: React.FC<TaskDiscussionProps> = ({
  taskId,
  taskName,
  currentUser,
}) => {
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);

  // Edit message state
  const [editingMsgId, setEditingMsgId] = useState<number | null>(null);
  const [editInputText, setEditInputText] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isAutoScroll = useRef(true);

  // 1. Initialize or load task conversation
  const initTaskConversation = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/chat/task-conversation/${taskId}`);
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to initialize task discussion');
      }
      const data = await res.json();
      setConversationId(data.conversationId);
      return data.conversationId;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error loading task chat';
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  // 2. Fetch messages
  const fetchMessages = useCallback(async (cId: number, silent = false) => {
    try {
      const res = await fetch(`/api/chat/conversations/${cId}/messages?limit=60`);
      if (res.ok) {
        const data = await res.json();
        if (data.messages) {
          setMessages(data.messages);
          // Mark conversation as read
          fetch(`/api/chat/conversations/${cId}/read`, { method: 'POST' }).catch(() => {});
        }
      }
    } catch (err) {
      if (!silent) console.error('Error fetching task messages:', err);
    }
  }, []);

  useEffect(() => {
    let active = true;
    let timer: NodeJS.Timeout | null = null;

    initTaskConversation().then((cId) => {
      if (active && cId) {
        fetchMessages(cId);

        // Realtime adaptive poll every 3 seconds while viewing discussion tab
        timer = setInterval(() => {
          if (typeof document !== 'undefined' && !document.hidden) {
            fetchMessages(cId, true);
          }
        }, 3000);
      }
    });

    return () => {
      active = false;
      if (timer) clearInterval(timer);
    };
  }, [initTaskConversation, fetchMessages]);

  useEffect(() => {
    if (isAutoScroll.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Handle Send Message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || !conversationId || sending) return;

    const textToSend = inputText.trim();
    const replyTarget = replyTo;
    setInputText('');
    setReplyTo(null);
    setSending(true);

    try {
      const res = await fetch(`/api/chat/conversations/${conversationId}/messages`, {
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
        }
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to send message');
        setInputText(textToSend); // Restore text
      }
    } catch (err) {
      console.error('Send error:', err);
      setInputText(textToSend);
    } finally {
      setSending(false);
    }
  };

  // Handle Delete Message
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
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to delete message');
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  // Handle Edit Message
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
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to edit message');
      }
    } catch (err) {
      console.error('Edit error:', err);
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

  if (loading) {
    return (
      <div className="py-12 flex flex-col items-center justify-center text-slate-400 space-y-2">
        <RefreshCw className="w-5 h-5 animate-spin text-indigo-500" />
        <span className="text-xs">Loading task discussion...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600">
        {error}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[500px] border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
      {/* Discussion Header */}
      <div className="px-4 py-2.5 bg-white border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <MessageSquare className="w-4 h-4 text-indigo-600" />
          <span className="text-xs font-bold text-slate-800">
            Discussion for &quot;{taskName}&quot;
          </span>
          <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-semibold">
            {messages.length} messages
          </span>
        </div>
        <span className="text-[11px] text-slate-400">Real-time synced</span>
      </div>

      {/* Message List */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-1">
            <span className="text-3xl">💬</span>
            <p className="text-xs font-semibold text-slate-600">No messages in this discussion yet.</p>
            <p className="text-[11px]">Start the conversation with your team about this task below.</p>
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
                {/* Sender info */}
                <div className="flex items-center space-x-1.5 mb-1 px-1">
                  <span className="text-xs">{msg.sender_animal_emoji || '🦊'}</span>
                  <span className="text-[11px] font-semibold text-slate-700">
                    {isMe ? 'You' : msg.sender_name}
                  </span>
                  <span className="text-[10px] text-slate-400">{formatMsgTime(msg.created_at)}</span>
                  {msg.edited_at && !isDeleted && (
                    <span className="text-[9px] text-slate-400 italic">(edited)</span>
                  )}
                </div>

                {/* Reply preview if present */}
                {msg.reply_preview && (
                  <div className="text-[10px] text-slate-500 bg-slate-200/70 border-l-2 border-indigo-500 px-2 py-0.5 mb-1 rounded-r max-w-sm truncate">
                    ↳ {msg.reply_preview}
                  </div>
                )}

                {/* Message Bubble */}
                <div className="relative max-w-[85%] sm:max-w-md">
                  {editingMsgId === msg.id ? (
                    <div className="flex items-center space-x-1.5 p-1 bg-white border border-indigo-300 rounded-lg shadow-sm">
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
                      className={`px-3 py-2 rounded-2xl text-xs leading-relaxed break-words shadow-2xs ${
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

                  {/* Hover Actions (Reply, Edit, Delete) */}
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
          <div className="flex items-center justify-between bg-indigo-50 border-l-2 border-indigo-500 px-2.5 py-1 mb-2 rounded-r text-[11px] text-indigo-900">
            <span className="truncate">
              Replying to <strong>{replyTo.sender_name}</strong>: &quot;{replyTo.message.slice(0, 50)}&quot;
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
            placeholder="Type a message about this task... (Enter to send)"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={sending}
            className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-slate-50 focus:bg-white"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || sending}
            className="p-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg transition-colors cursor-pointer"
            title="Send Message"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
};
