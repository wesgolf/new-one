import React, { useState, useEffect, useRef } from 'react';
import {
  BookOpen,
  Brain,
  CheckCircle2,
  Database,
  Edit2,
  ExternalLink,
  FileText,
  Globe,
  Image as ImageIcon,
  Link as LinkIcon,
  Loader2,
  Menu,
  MessageSquare,
  Plus,
  Send,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';
import { requestCache } from '../lib/requestCache';
import { getCurrentAuthUser } from '../lib/auth';
import { fetchServerJsonWithFallback } from '../lib/serverApi';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'motion/react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  role: 'user' | 'assistant';
  content: string;
  sources?: string[];
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  /** AI-generated condensed summary of the conversation. Updated periodically. */
  summary: string | null;
  createdAt: number;
  updatedAt: number;
}

interface Resource {
  id: string;
  title: string;
  content: string;
  type: 'text' | 'image' | 'webpage' | 'pdf';
  url?: string;
  category: string;
}

interface CoachSessionRow {
  id: string;
  user_id: string;
  title: string;
  summary: string | null;
  conversation: {
    id?: string;
    title?: string;
    summary?: string | null;
    createdAt?: number;
    updatedAt?: number;
    messages?: Message[];
  } | null;
  created_at: string;
  updated_at: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'coach_sessions_v3';

interface PromptStarter { icon: string; label: string; prompt: string; }

const PROMPT_STARTERS: PromptStarter[] = [
  { icon: '📊', label: 'Break down top content', prompt: 'Break down why my best content is outperforming the rest and what I should double down on.' },
  { icon: '📅', label: 'Plan next 3 posts',       prompt: "Help me plan my next 3 social media posts based on what's been working." },
  { icon: '🎧', label: 'Analyze my latest track', prompt: 'Give me honest feedback on my latest release — what worked, what to improve, and what to do next.' },
  { icon: '🎯', label: 'Set monthly goals',        prompt: 'Help me set 3 clear, measurable goals for this month as an independent artist.' },
  { icon: '📈', label: 'Grow my fanbase',          prompt: "What's the single most effective move I can make right now to grow my fanbase?" },
  { icon: '🚀', label: 'Write a release plan',     prompt: 'Help me write a detailed release plan for my next drop.' },
];

// Summarize every N user messages (after the threshold)
const SUMMARY_EVERY_N_USER_MESSAGES = 4;
// Always include this many recent messages regardless of summary
const RECENT_MESSAGES_WINDOW = 6;

// ─── Storage helpers ──────────────────────────────────────────────────────────

function loadSessions(): ChatSession[] {
  try {
    // Try new key first
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);

    // Migrate from v2 — add missing fields
    const oldRaw = localStorage.getItem('coach_sessions_v2');
    if (oldRaw) {
      const old = JSON.parse(oldRaw) as Omit<ChatSession, 'summary' | 'updatedAt'>[];
      const migrated: ChatSession[] = old.map((s) => ({
        ...s,
        summary: null,
        updatedAt: s.createdAt,
      }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      return migrated;
    }
  } catch { /* */ }
  return [];
}

function saveSessions(sessions: ChatSession[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

function serializeSession(session: ChatSession) {
  return {
    id: session.id,
    title: session.title,
    summary: session.summary,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    messages: session.messages,
  };
}

function deserializeSession(row: CoachSessionRow): ChatSession {
  const payload = row.conversation ?? {};
  return {
    id: row.id,
    title: payload.title ?? row.title ?? 'New chat',
    messages: Array.isArray(payload.messages) ? payload.messages : [],
    summary: row.summary ?? payload.summary ?? null,
    createdAt: typeof payload.createdAt === 'number' ? payload.createdAt : Date.parse(row.created_at),
    updatedAt: typeof payload.updatedAt === 'number' ? payload.updatedAt : Date.parse(row.updated_at),
  };
}

function newSession(): ChatSession {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    title: 'New chat',
    messages: [
      {
        role: 'assistant',
        content: "I reviewed your recent activity. Ask me anything or pick a suggestion to get started.",
      },
    ],
    summary: null,
    createdAt: now,
    updatedAt: now,
  };
}

// ─── Date grouping utils ──────────────────────────────────────────────────────

function formatRelativeTime(ts: number): string {
  const now = Date.now();
  const diff = now - ts;
  const mins = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);

  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;

  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

type DateGroup = 'Today' | 'Yesterday' | 'This week' | 'Older';

function getDateGroup(ts: number): DateGroup {
  const now = new Date();
  const d = new Date(ts);
  const isToday = d.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();
  const daysAgo = (now.getTime() - ts) / 86_400_000;

  if (isToday) return 'Today';
  if (isYesterday) return 'Yesterday';
  if (daysAgo < 7) return 'This week';
  return 'Older';
}

function groupSessions(sessions: ChatSession[]): Array<{ group: DateGroup; items: ChatSession[] }> {
  const groups: Record<DateGroup, ChatSession[]> = {
    Today: [], Yesterday: [], 'This week': [], Older: [],
  };
  for (const s of sessions) {
    groups[getDateGroup(s.updatedAt)].push(s);
  }
  return (['Today', 'Yesterday', 'This week', 'Older'] as DateGroup[])
    .filter((g) => groups[g].length > 0)
    .map((g) => ({ group: g, items: groups[g] }));
}

export function ArtistCoach() {
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    const s = loadSessions();
    return s.length ? s : [newSession()];
  });
  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
    const loaded = loadSessions();
    return loaded.length ? loaded[0].id : '';
  });

  const activeSession = sessions.find((s) => s.id === activeSessionId) ?? sessions[0];
  const messages = activeSession?.messages ?? [];

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [resources, setResources] = useState<Resource[]>([]);
  const [isAddingResource, setIsAddingResource] = useState(false);
  const [editingResourceId, setEditingResourceId] = useState<string | null>(null);
  const [editingResource, setEditingResource] = useState<Partial<Resource>>({});
  const [deletingResourceId, setDeletingResourceId] = useState<string | null>(null);
  const [newResource, setNewResource] = useState({
    title: '',
    content: '',
    category: 'General',
    type: 'text' as 'text' | 'image' | 'webpage' | 'pdf',
    url: '',
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'knowledge'>('chat');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [coachUserId, setCoachUserId] = useState<string | null>(null);
  const [sessionsHydrated, setSessionsHydrated] = useState(false);
  const [resourceNotice, setResourceNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastSyncedPayloadRef = useRef<string>('');

  useEffect(() => { fetchResources(); }, []);

  useEffect(() => {
    saveSessions(sessions);
  }, [sessions]);

  useEffect(() => {
    let cancelled = false;

    const hydrateSessions = async () => {
      try {
        const user = await getCurrentAuthUser();
        if (cancelled) return;

        if (!user) {
          setCoachUserId(null);
          setSessionsHydrated(true);
          return;
        }

        setCoachUserId(user.id);

        const { data, error } = await supabase
          .from('coach_sessions')
          .select('*')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false });

        if (error) {
          console.error('[CoachSessions] Failed to load sessions from Supabase:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code,
          });
          setSessionsHydrated(true);
          return;
        }

        const remoteSessions = (data ?? []).map((row) => deserializeSession(row as CoachSessionRow));
        const localSessions = loadSessions();

        if (!cancelled && remoteSessions.length > 0) {
          setSessions(remoteSessions);
          setActiveSessionId((currentId) => {
            if (remoteSessions.some((session) => session.id === currentId)) return currentId;
            return remoteSessions[0].id;
          });
        } else if (!cancelled && localSessions.length > 0) {
          await upsertSessionsToSupabase(localSessions, user.id);
        }
      } finally {
        if (!cancelled) setSessionsHydrated(true);
      }
    };

    hydrateSessions();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!sessionsHydrated || !coachUserId) return;

    const serialized = JSON.stringify(
      sessions.map((session) => ({
        id: session.id,
        title: session.title,
        summary: session.summary,
        updatedAt: session.updatedAt,
        messageCount: session.messages.length,
      })),
    );

    if (serialized === lastSyncedPayloadRef.current) return;
    lastSyncedPayloadRef.current = serialized;

    void upsertSessionsToSupabase(sessions, coachUserId);
  }, [sessions, sessionsHydrated, coachUserId]);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length, loading]);

  const updateSession = (id: string, update: Partial<ChatSession>) => {
    setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, ...update } : s)));
  };

  const upsertSessionsToSupabase = async (nextSessions: ChatSession[], userId: string) => {
    if (!nextSessions.length) return;

    const payload = nextSessions.map((session) => ({
      id: session.id,
      user_id: userId,
      title: session.title,
      summary: session.summary,
      conversation: serializeSession(session),
      created_at: new Date(session.createdAt).toISOString(),
      updated_at: new Date(session.updatedAt).toISOString(),
    }));

    const { error } = await supabase.from('coach_sessions').upsert(payload, {
      onConflict: 'id',
    });

    if (error) {
      console.error('[CoachSessions] Failed to upsert sessions:', {
        count: payload.length,
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      return;
    }

    console.log('[CoachSessions] Synced sessions to Supabase:', payload.length);
  };

  const deleteSessionFromSupabase = async (sessionId: string) => {
    if (!coachUserId) return;

    const { error } = await supabase
      .from('coach_sessions')
      .delete()
      .eq('id', sessionId)
      .eq('user_id', coachUserId);

    if (error) {
      console.error('[CoachSessions] Failed to delete session from Supabase:', {
        sessionId,
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      return;
    }

    console.log('[CoachSessions] Deleted session from Supabase:', sessionId);
  };

  const createNewSession = () => {
    const s = newSession();
    setSessions((prev) => [s, ...prev]);
    setActiveSessionId(s.id);
    setActiveTab('chat');
    setSidebarOpen(false);
  };

  const switchToSession = (id: string) => {
    setActiveSessionId(id);
    setInput('');
    setSidebarOpen(false);
  };

  const deleteSession = (id: string) => {
    setDeletingId(null);
    void deleteSessionFromSupabase(id);
    setSessions((prev) => {
      const filtered = prev.filter((s) => s.id !== id);
      if (filtered.length === 0) {
        const s = newSession();
        setActiveSessionId(s.id);
        return [s];
      }
      if (id === activeSessionId) setActiveSessionId(filtered[0].id);
      return filtered;
    });
  };

  const fetchResources = async () => {
    const user = await getCurrentAuthUser();
    if (!user) {
      setResources([]);
      return;
    }
    const { data, error } = await supabase
      .from('bot_resources')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (error) {
      setResourceNotice({ type: 'error', message: `Knowledge load failed: ${error.message}` });
      return;
    }
    if (data) {
      setResources(
        (data as any[]).map((resource) => ({
          ...resource,
          url: resource.source_url ?? null,
        })),
      );
    }
  };

  // ── Summary generation ────────────────────────────────────────────────────

  /**
   * Asynchronously generates a condensed summary of the conversation and saves
   * it to the session. Runs in background — does not block the chat.
   */
  const generateSessionSummary = async (sessionId: string, allMessages: Message[]) => {
    const userMessages = allMessages.filter((m) => m.role === 'user');
    // Only summarize after enough conversation exists
    if (userMessages.length < 3) return;
    // Re-summarize every SUMMARY_EVERY_N_USER_MESSAGES user turns
    if (userMessages.length % SUMMARY_EVERY_N_USER_MESSAGES !== 0) return;

    setSummarizing(true);
    try {
      const transcript = allMessages
        .map((m) => `${m.role === 'user' ? 'Artist' : 'Coach'}: ${m.content}`)
        .join('\n');

      const { summary } = await fetchServerJsonWithFallback<{ summary?: string | null }>(
        '/api/coach/summarize',
        'coach-summarize',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transcript }),
        },
      );
      if (summary) updateSession(sessionId, { summary });
    } catch (err) {
      console.debug('[coach] Summary generation skipped:', err);
    } finally {
      setSummarizing(false);
    }
  };

  // ── Context fetching ───────────────────────────────────────────────────────
  //
  // Calls /api/coach/context — a server-side endpoint that runs Postgres FTS
  // (search_records RPC) and targeted queries for analytics snapshots and
  // calendar events, all scoped to the authenticated user via their JWT.
  //
  // The server enforces a 3 000-char budget so the AI never receives a full
  // database dump. Sensitive field values are never logged server-side.
  //
  // Results are cached for 60 s (requestCache) so rapid follow-ups within the
  // same conversation share one context round-trip.

  const CONTEXT_TIMEOUT = 15_000; // 15 seconds

  const getContext = async (query: string, entityIds: string[] = []): Promise<string> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONTEXT_TIMEOUT);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return '';

      const cacheKey = `coach:context:${query.slice(0, 80)}`;

      const result = await requestCache.get(
        cacheKey,
        async () => {
          const json = await fetchServerJsonWithFallback<{ context?: string }>(
            '/api/coach/context',
            'coach-context',
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${session.access_token}`,
              },
              body: JSON.stringify({ question: query, page: 'coach', entityIds }),
              signal: controller.signal,
            },
          );
          return (json.context ?? '') as string;
        },
        60_000, // 60-second TTL
      );

      return result as string;
    } catch (error: unknown) {
      if ((error as Error).name === 'AbortError') {
        console.warn('[coach] Context retrieval timed out — proceeding without context.');
        return '';
      }
      console.warn('[coach] Context retrieval failed:', (error as Error).message);
      return ''; // non-fatal: the coach can still respond without context
    } finally {
      clearTimeout(timeoutId);
    }
  };

  // ── Message sending ───────────────────────────────────────────────────────

  const handleSendMessage = async (e: React.FormEvent | null, prefill?: string) => {
    e?.preventDefault();
    const text = (prefill ?? input).trim();
    if (!text || loading) return;

    const sessionId = activeSession.id;
    const userMsg: Message = { role: 'user', content: text };
    const isFirstUserMessage = messages.filter((m) => m.role === 'user').length === 0;
    setInput('');

    const updatedMessages = [...messages, userMsg];
    updateSession(sessionId, {
      messages: updatedMessages,
      updatedAt: Date.now(),
      ...(isFirstUserMessage && {
        title: text.slice(0, 48) + (text.length > 48 ? '…' : ''),
      }),
    });
    setLoading(true);

    try {
      const contextText = await getContext(text, []);
      const session = sessions.find((s) => s.id === sessionId);
      const recentMessages = updatedMessages.slice(-RECENT_MESSAGES_WINDOW);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20_000);

      let payload: { text?: string };
      try {
        payload = await fetchServerJsonWithFallback<{ text?: string }>(
          '/api/coach/chat',
          'coach-chat',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              messages: recentMessages,
              contextText,
              summary: session?.summary ?? null,
            }),
            signal: controller.signal,
          },
        );
      } finally {
        clearTimeout(timeout);
      }
      const aiContent = payload.text;
      const finalMessages = [...updatedMessages, {
        role: 'assistant' as const,
        content: aiContent ?? "I couldn't process that — please try again.",
      }];
      updateSession(sessionId, { messages: finalMessages, updatedAt: Date.now() });

      // Trigger background summary generation (non-blocking)
      generateSessionSummary(sessionId, finalMessages);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error('[coach] AI error:', message);
      updateSession(sessionId, {
        messages: [...updatedMessages, {
          role: 'assistant',
          content: `Sorry, I hit an error: ${message}. Please try again.`,
        }],
      });
    } finally {
      setLoading(false);
    }
  };

  // ── Resource handlers (unchanged) ─────────────────────────────────────────

  const handleAddResource = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setResourceNotice({ type: 'error', message: 'You must be signed in to save a knowledge resource.' });
      return;
    }
    setIsUploading(true);
    setResourceNotice(null);
    let finalUrl = newResource.url;
    try {
      if (selectedFile && (newResource.type === 'image' || newResource.type === 'pdf')) {
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;
        const { error: uploadError } = await supabase.storage.from('bot_resources').upload(filePath, selectedFile);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('bot_resources').getPublicUrl(filePath);
        finalUrl = publicUrl;
      }
      const normalizedContent = newResource.content.trim() || (
        finalUrl
          ? `${newResource.type.toUpperCase()} reference: ${newResource.title.trim()} ${finalUrl}`.trim()
          : `${newResource.type.toUpperCase()} reference: ${newResource.title.trim()}`.trim()
      );
      const { error } = await supabase.from('bot_resources').insert([{
        ...newResource,
        content: normalizedContent,
        source_url: finalUrl || null,
        storage_path: finalUrl ? finalUrl.split('/').slice(-2).join('/') : null,
        mime_type: selectedFile?.type ?? null,
        parse_status: 'ready',
        parse_error: null,
        content_excerpt: normalizedContent.slice(0, 240),
        user_id: user.id,
      }]);
      if (error) throw error;
      setNewResource({ title: '', content: '', category: 'General', type: 'text', url: '' });
      setSelectedFile(null);
      setIsAddingResource(false);
      setResourceNotice({ type: 'success', message: 'Knowledge resource saved.' });
      requestCache.invalidate('coach:kb');
      fetchResources();
    } catch (err) {
      console.error('Upload error:', err);
      setResourceNotice({
        type: 'error',
        message: err instanceof Error ? `Knowledge save failed: ${err.message}` : 'Knowledge save failed.',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveEditResource = async (id: string) => {
    const user = await getCurrentAuthUser();
    const payload: Record<string, unknown> = { ...editingResource };
    if ('url' in payload) {
      payload.source_url = payload.url ?? null;
      delete payload.url;
    }
    if (typeof payload.content === 'string') {
      payload.content_excerpt = payload.content.slice(0, 240);
    }
    const { error } = await supabase
      .from('bot_resources')
      .update(payload)
      .eq('id', id)
      .eq('user_id', user?.id ?? '');
    if (!error) {
      setEditingResourceId(null);
      setResourceNotice({ type: 'success', message: 'Knowledge resource updated.' });
      requestCache.invalidate('coach:kb');
      fetchResources();
    } else {
      setResourceNotice({ type: 'error', message: `Knowledge update failed: ${error.message}` });
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
      if (file.type.startsWith('image/')) setNewResource((p) => ({ ...p, type: 'image' }));
      else if (file.type === 'application/pdf') setNewResource((p) => ({ ...p, type: 'pdf' }));
    }
  };

  const handleDeleteResource = async (id: string) => {
    const user = await getCurrentAuthUser();
    const { error } = await supabase
      .from('bot_resources')
      .delete()
      .eq('id', id)
      .eq('user_id', user?.id ?? '');
    if (!error) {
      setResourceNotice({ type: 'success', message: 'Knowledge resource deleted.' });
      requestCache.invalidate('coach:kb');
      fetchResources();
    } else {
      setResourceNotice({ type: 'error', message: `Knowledge delete failed: ${error.message}` });
    }
  };

  // ── Sidebar component ─────────────────────────────────────────────────────

  const grouped = groupSessions([...sessions].sort((a, b) => b.updatedAt - a.updatedAt));

  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0 border-b border-slate-100">
        {!sidebarCollapsed && <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">History</p>}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setSidebarCollapsed((value) => !value)}
            className="hidden rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-800 md:inline-flex"
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? <Menu className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
          </button>
          {!sidebarCollapsed && (
            <button
              onClick={createNewSession}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition-colors"
              title="New chat"
            >
              <Plus className="h-3 w-3" /> New
            </button>
          )}
        </div>
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto py-2 space-y-0.5">
        {grouped.length === 0 ? (
          <p className="px-4 py-6 text-center text-xs text-slate-400">No chats yet.</p>
        ) : (
          grouped.map(({ group, items }) => (
            <div key={group} className="mb-1">
              <p className="px-4 pt-3 pb-1.5 text-[9px] font-bold uppercase tracking-[0.15em] text-slate-400">{group}</p>
              {items.map((s) => {
                const lastMsg = s.messages[s.messages.length - 1];
                const isActive = s.id === activeSessionId;
                const isDeleting = deletingId === s.id;
                return (
                  <div
                    key={s.id}
                    onClick={() => !isDeleting && switchToSession(s.id)}
                    className={cn(
                      'group relative mx-2 flex cursor-pointer items-start gap-2.5 rounded-xl px-3 py-2.5 transition-all',
                      isActive
                        ? 'bg-white shadow-sm ring-1 ring-slate-100'
                        : 'hover:bg-white/70',
                    )}
                  >
                    <MessageSquare
                      className={cn('mt-0.5 h-3 w-3 shrink-0 transition-colors', isActive ? 'text-blue-500' : 'text-slate-300')}
                    />
                    {!sidebarCollapsed && <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-1">
                        <p className="truncate text-[11px] font-semibold leading-tight text-slate-800">{s.title}</p>
                        <span className="shrink-0 text-[9px] text-slate-400 mt-0.5">{formatRelativeTime(s.updatedAt)}</span>
                      </div>
                      {lastMsg && (
                        <p className="mt-0.5 line-clamp-1 text-[10px] text-slate-400">
                          {lastMsg.role === 'assistant' ? '↩ ' : ''}{lastMsg.content.slice(0, 60)}
                        </p>
                      )}
                      {s.summary && (
                        <div className="mt-1 flex items-center gap-1">
                          <Sparkles className="h-2.5 w-2.5 text-blue-400 shrink-0" />
                          <p className="line-clamp-1 text-[9px] text-blue-400">Summarized</p>
                        </div>
                      )}
                    </div>}
                    <div className="ml-auto shrink-0" onClick={(e) => e.stopPropagation()}>
                      {isDeleting ? (
                        <div className="flex items-center gap-1">
                        <button
                          onClick={() => deleteSession(s.id)}
                          className="rounded-md bg-rose-500 px-2 py-0.5 text-[9px] font-bold text-white hover:bg-rose-600"
                        >
                          Delete
                        </button>
                        <button
                          onClick={() => setDeletingId(null)}
                          className="rounded-md bg-slate-100 px-2 py-0.5 text-[9px] font-bold text-slate-600 hover:bg-slate-200"
                        >
                          Cancel
                        </button>
                      </div>
                      ) : (
                        <button
                          onClick={() => setDeletingId(s.id)}
                          className={cn(
                            'rounded-md p-1 text-slate-300 transition-colors hover:text-rose-500',
                            sidebarCollapsed ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
                          )}
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-[calc(100vh-88px)] flex-col gap-0 overflow-hidden rounded-[1.5rem] border border-slate-100 bg-white shadow-sm">

      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5 shrink-0">
        <div className="flex items-center gap-3">
          {/* Mobile sidebar toggle */}
          {activeTab === 'chat' && (
            <button
              onClick={() => setSidebarOpen((v) => !v)}
              className="md:hidden rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            >
              <Menu className="h-4 w-4" />
            </button>
          )}
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900">
            <Brain className="h-4 w-4 text-white" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold text-slate-900 leading-none">Artist Coach</p>
              {summarizing && (
                <span className="flex items-center gap-1 rounded-full border border-blue-100 bg-blue-50 px-2 py-0.5 text-[9px] font-semibold text-blue-500">
                  <Sparkles className="h-2.5 w-2.5 animate-pulse" /> Summarizing
                </span>
              )}
            </div>
            {activeTab === 'chat' && activeSession && (
              <p className="mt-0.5 text-[10px] text-slate-400 truncate max-w-[220px]">{activeSession.title}</p>
            )}
            {activeTab !== 'chat' && (
              <p className="text-[10px] text-slate-400 mt-0.5">AI mentorship trained on your data</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'chat' && (
            <button
              onClick={createNewSession}
              className="hidden md:flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-bold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
            >
              <Plus className="h-3 w-3" /> New chat
            </button>
          )}
          <div className="flex rounded-xl border border-slate-100 bg-slate-50 p-0.5">
            <button
              onClick={() => setActiveTab('chat')}
              className={cn('flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest transition-all', activeTab === 'chat' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600')}
            >
              <MessageSquare className="h-3 w-3" /> Chat
            </button>
            <button
              onClick={() => setActiveTab('knowledge')}
              className={cn('flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest transition-all', activeTab === 'knowledge' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600')}
            >
              <Database className="h-3 w-3" /> Knowledge
            </button>
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 relative">

        {/* ── Chat tab ─────────────────────────────────────────────────── */}
        {activeTab === 'chat' && (
          <>
            {/* Desktop sidebar */}
            <div className={cn('hidden shrink-0 flex-col border-r border-slate-100 bg-slate-50/60 md:flex', sidebarCollapsed ? 'w-[72px]' : 'w-64')}>
              <SidebarContent />
            </div>

            {/* Mobile sidebar drawer */}
            <AnimatePresence>
              {sidebarOpen && (
                <>
                  {/* Backdrop */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 z-20 bg-slate-900/30 md:hidden"
                    onClick={() => setSidebarOpen(false)}
                  />
                  {/* Drawer */}
                  <motion.div
                    initial={{ x: '-100%' }}
                    animate={{ x: 0 }}
                    exit={{ x: '-100%' }}
                    transition={{ type: 'spring', damping: 28, stiffness: 260 }}
                    className="absolute left-0 top-0 bottom-0 z-30 w-72 bg-white shadow-xl md:hidden"
                    style={{ borderRadius: '0 1.25rem 1.25rem 0' }}
                  >
                    <SidebarContent />
                  </motion.div>
                </>
              )}
            </AnimatePresence>

            {/* Chat area */}
            <div
              className="flex min-h-0 flex-1 flex-col relative overflow-hidden"
              style={{ background: 'linear-gradient(160deg,#f6f8ff 0%,#ffffff 55%,#fafafa 100%)' }}
            >
              {/* Ambient glows */}
              <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="absolute -top-20 right-4 h-64 w-64 rounded-full bg-blue-500/[0.045] blur-3xl" />
                <div className="absolute bottom-12 left-1/3 h-40 w-40 rounded-full bg-blue-400/[0.03] blur-3xl" />
              </div>

              {/* Context summary pill */}
              {activeSession?.summary && (
                <div className="relative shrink-0 border-b border-blue-100/60 px-5 py-2.5 bg-gradient-to-r from-blue-50/80 to-transparent">
                  <div className="flex items-start gap-2">
                    <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-blue-400" />
                    <p className="line-clamp-2 text-[11px] leading-relaxed text-blue-600/80">{activeSession.summary}</p>
                  </div>
                </div>
              )}

              {/* ── Welcome screen (fresh chat) ── */}
              {messages.length === 1 && !loading && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.28, ease: 'easeOut' }}
                  className="relative shrink-0 px-5 pt-7 pb-5"
                >
                  {/* Briefing card */}
                  <div className="flex items-start gap-3 mb-5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-900 shadow-md mt-0.5">
                      <Brain className="h-3.5 w-3.5 text-white" />
                    </div>
                    <div className="max-w-sm rounded-2xl rounded-tl-sm border border-slate-100 bg-white/95 px-5 py-4 shadow-sm backdrop-blur-sm">
                      <p className="text-[13px] text-slate-500 mb-3.5 leading-relaxed">I reviewed your recent activity.</p>
                      <div className="mb-3.5 rounded-xl bg-slate-50 border border-slate-100 px-3.5 py-3">
                        <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400 mb-1.5">Biggest opportunity</p>
                        <div className="flex items-start gap-2">
                          <span className="text-blue-500 font-bold shrink-0 text-sm leading-snug">→</span>
                          <p className="text-[13px] font-semibold text-slate-800 leading-snug">Your DJ clips are outperforming everything else</p>
                        </div>
                      </div>
                      <p className="text-[13px] text-slate-600 leading-relaxed">What would you like to work on?</p>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex-1 h-px bg-slate-100" />
                    <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-300">Suggestions</span>
                    <div className="flex-1 h-px bg-slate-100" />
                  </div>

                  {/* Action chips */}
                  <div className="flex flex-wrap gap-2">
                    {PROMPT_STARTERS.map((p) => (
                      <button
                        key={p.label}
                        onClick={() => handleSendMessage(null, p.prompt)}
                        className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 active:scale-[0.97] transition-all"
                      >
                        <span className="text-sm leading-none">{p.icon}</span>
                        {p.label}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Spacer in welcome state so input sits naturally */}
              {messages.length === 1 && !loading && <div className="flex-1" />}

              {/* ── Active chat thread ── */}
              {(messages.length > 1 || loading) && (
                <div ref={scrollRef} className="relative flex-1 overflow-y-auto px-5 py-5 space-y-4">
                  {messages.map((msg, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.18 }}
                      className={cn('flex gap-3', msg.role === 'user' ? 'justify-end' : '')}
                    >
                      {msg.role === 'assistant' && (
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-slate-900 shadow-sm mt-0.5">
                          <Brain className="h-3.5 w-3.5 text-white" />
                        </div>
                      )}
                      <div className={cn(
                        'max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
                        msg.role === 'assistant'
                          ? 'rounded-tl-sm bg-white/95 border border-slate-100 text-slate-800 shadow-sm backdrop-blur-sm'
                          : 'rounded-tr-sm bg-slate-900 text-white shadow-md',
                      )}>
                        <div className={cn('prose prose-sm max-w-none', msg.role === 'user' ? 'prose-invert' : 'prose-slate')}>
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  {loading && (
                    <div className="flex gap-3">
                      <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-slate-900 mt-0.5">
                        <Brain className="h-3.5 w-3.5 text-white" />
                      </div>
                      <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm border border-slate-100 bg-white/95 px-4 py-3 shadow-sm backdrop-blur-sm">
                        {[0, 1, 2].map((d) => (
                          <div key={d} className="h-1.5 w-1.5 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: `${d * 150}ms` }} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Input */}
              <div className="relative shrink-0 border-t border-slate-100/80 bg-white/80 backdrop-blur-sm">
                <form onSubmit={handleSendMessage} className="px-4 py-3">
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Ask your coach anything…"
                      className="flex-1 rounded-2xl border border-slate-200 bg-slate-50/80 py-3 pl-5 pr-14 text-sm outline-none focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-100/70 transition-all placeholder:text-slate-400"
                    />
                    <button
                      type="submit"
                      disabled={loading || !input.trim()}
                      className="absolute right-2 rounded-xl bg-slate-900 p-2.5 text-white shadow transition-colors hover:bg-blue-600 disabled:opacity-40"
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </>
        )}

        {/* ── Knowledge tab ──────────────────────────────────────────────── */}
        {activeTab === 'knowledge' && (
          <div
            className="flex-1 overflow-y-auto"
            style={{ background: 'linear-gradient(160deg,#f6f8ff 0%,#ffffff 55%,#fafafa 100%)' }}
          >
            <div className="p-5 space-y-4">
              {resourceNotice && (
                <div className={cn(
                  'rounded-2xl border px-4 py-3 text-sm',
                  resourceNotice.type === 'success'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'border-rose-200 bg-rose-50 text-rose-700',
                )}>
                  {resourceNotice.message}
                </div>
              )}
              <div className="rounded-2xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-xs leading-relaxed text-blue-700">
                The coach prompt uses your recent messages, the saved session summary, indexed notes from your knowledge base, recent releases, recent analytics snapshots, and upcoming calendar items. PDFs, images, and websites are stored as references plus your notes right now; they are not OCRed or scraped into full prompt text yet.
              </div>
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900">Knowledge Base</h3>
                  {resources.length > 0 && (
                    <span className="rounded-md border border-slate-200 bg-white/80 px-1.5 py-0.5 text-[10px] font-bold text-slate-500">{resources.length}</span>
                  )}
                </div>
                <button
                  onClick={() => setIsAddingResource(true)}
                  className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-[11px] font-bold text-white shadow-sm hover:bg-blue-600 active:scale-[0.97] transition-all"
                >
                  <Plus className="h-3.5 w-3.5" /> Add
                </button>
              </div>

              {resources.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 py-16 text-center">
                  <Database className="mb-3 h-8 w-8 text-slate-200" />
                  <p className="text-sm font-semibold text-slate-400">No resources yet</p>
                  <p className="mt-1 text-xs text-slate-400">Add notes, links, or files to train the coach.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {resources.map((resource) => {
                    const isEditing = editingResourceId === resource.id;
                    const isDeleting = deletingResourceId === resource.id;
                    return (
                      <div
                        key={resource.id}
                        className={cn(
                          'relative flex flex-col rounded-2xl border bg-white/80 p-4 backdrop-blur-sm transition-all',
                          isEditing
                            ? 'border-blue-200 shadow-[0_0_0_3px_rgba(59,130,246,0.07)] ring-1 ring-blue-100'
                            : 'border-slate-100/80 shadow-sm hover:border-slate-200 hover:shadow-md',
                        )}
                      >
                        {isEditing ? (
                          /* ── Edit state ── */
                          <div className="flex flex-col gap-3">
                            <input
                              autoFocus
                              className="w-full rounded-xl border border-blue-200 bg-blue-50/50 px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100/70 transition-all"
                              value={editingResource.title ?? ''}
                              onChange={(e) => setEditingResource((p) => ({ ...p, title: e.target.value }))}
                              placeholder="Title"
                            />
                            <textarea
                              rows={5}
                              className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs leading-relaxed text-slate-700 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100/60 transition-all"
                              value={editingResource.content ?? ''}
                              onChange={(e) => setEditingResource((p) => ({ ...p, content: e.target.value }))}
                              placeholder="Content…"
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleSaveEditResource(resource.id)}
                                className="flex-1 rounded-xl bg-slate-900 py-2 text-[11px] font-bold text-white hover:bg-blue-600 active:scale-[0.98] transition-all"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => { setEditingResourceId(null); setEditingResource({}); }}
                                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-[11px] font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* ── View state ── */
                          <>
                            {/* Meta + actions row */}
                            <div className="mb-2.5 flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
                                <span className="shrink-0 rounded-md border border-slate-100 bg-slate-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-400">{resource.category}</span>
                                {resource.type !== 'text' && (
                                  <span className="shrink-0 rounded-md border border-blue-100 bg-blue-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-blue-500">{resource.type}</span>
                                )}
                              </div>
                              {/* Action buttons — always visible */}
                              {isDeleting ? (
                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    onClick={() => { handleDeleteResource(resource.id); setDeletingResourceId(null); }}
                                    className="rounded-lg bg-rose-500 px-2.5 py-1 text-[10px] font-bold text-white hover:bg-rose-600 transition-colors"
                                  >
                                    Delete
                                  </button>
                                  <button
                                    onClick={() => setDeletingResourceId(null)}
                                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-0.5 shrink-0">
                                  <button
                                    onClick={() => { setEditingResourceId(resource.id); setEditingResource({ title: resource.title, content: resource.content }); }}
                                    className="rounded-lg p-1.5 text-slate-300 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                                    title="Edit"
                                  >
                                    <Edit2 className="h-3.5 w-3.5" />
                                  </button>
                                  {resource.url && (
                                    <a
                                      href={resource.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="rounded-lg p-1.5 text-slate-300 hover:bg-slate-100 hover:text-blue-500 transition-colors"
                                    >
                                      <ExternalLink className="h-3.5 w-3.5" />
                                    </a>
                                  )}
                                  <button
                                    onClick={() => setDeletingResourceId(resource.id)}
                                    className="rounded-lg p-1.5 text-slate-300 hover:bg-rose-50 hover:text-rose-500 transition-colors"
                                    title="Delete"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              )}
                            </div>
                            <h4 className="mb-1.5 text-sm font-semibold text-slate-900 leading-snug">{resource.title}</h4>
                            {resource.type === 'image' && resource.url && (
                              <div className="mb-2 aspect-video overflow-hidden rounded-xl border border-slate-100">
                                <img src={resource.url} alt={resource.title} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                              </div>
                            )}
                            <p className="line-clamp-3 text-xs leading-relaxed text-slate-500">{resource.content}</p>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Add Resource Modal ──────────────────────────────────────────── */}
      <AnimatePresence>
        {isAddingResource && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="w-full max-w-lg overflow-hidden rounded-[2rem] border border-slate-100 bg-white shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
                <h3 className="text-lg font-bold text-slate-900">Add knowledge resource</h3>
                <button onClick={() => setIsAddingResource(false)} className="rounded-xl p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-700 transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <form onSubmit={handleAddResource} className="space-y-4 p-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Title</label>
                    <input required type="text" value={newResource.title} onChange={(e) => setNewResource({ ...newResource, title: e.target.value })} placeholder="e.g. 2025 Marketing Strategy" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-100 transition-all" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Category</label>
                    <select value={newResource.category} onChange={(e) => setNewResource({ ...newResource, category: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-100 transition-all">
                      <option>Strategy</option><option>Technical</option><option>Inspiration</option><option>Marketing</option><option>General</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Type</label>
                  <div className="grid grid-cols-4 gap-2">
                    {([
                      { id: 'text', icon: FileText, label: 'Text' },
                      { id: 'image', icon: ImageIcon, label: 'Image' },
                      { id: 'webpage', icon: Globe, label: 'Web' },
                      { id: 'pdf', icon: FileText, label: 'PDF' },
                    ] as const).map((t) => (
                      <button key={t.id} type="button" onClick={() => setNewResource({ ...newResource, type: t.id })} className={cn('flex flex-col items-center gap-1.5 rounded-xl border p-3 transition-all', newResource.type === t.id ? 'border-slate-900 bg-slate-900 text-white shadow-sm' : 'border-slate-100 bg-white text-slate-400 hover:border-slate-200')}>
                        <t.icon className="h-4 w-4" />
                        <span className="text-[10px] font-bold uppercase tracking-tighter">{t.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                {(newResource.type === 'image' || newResource.type === 'pdf') && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Upload file</label>
                    <div onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop} className={cn('relative flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-8 transition-all', dragActive ? 'border-blue-400 bg-blue-50' : 'border-slate-200 bg-slate-50', selectedFile ? 'border-emerald-400 bg-emerald-50' : '')}>
                      <input type="file" onChange={(e) => e.target.files && setSelectedFile(e.target.files[0])} className="absolute inset-0 cursor-pointer opacity-0" accept={newResource.type === 'image' ? 'image/*' : 'application/pdf'} />
                      {selectedFile ? (
                        <><div className="rounded-xl bg-emerald-500 p-3"><CheckCircle2 className="h-6 w-6 text-white" /></div><div className="text-center"><p className="text-sm font-bold text-slate-900">{selectedFile.name}</p><p className="text-[10px] uppercase tracking-widest text-slate-400">File selected</p></div></>
                      ) : (
                        <><div className="rounded-xl bg-white p-3 shadow-sm"><Upload className="h-6 w-6 text-slate-400" /></div><div className="text-center"><p className="text-sm font-bold text-slate-900">Click or drag to upload</p><p className="text-[10px] uppercase tracking-widest text-slate-400">{newResource.type === 'image' ? 'PNG, JPG, GIF' : 'PDF only'}</p></div></>
                      )}
                    </div>
                  </div>
                )}
                {newResource.type === 'webpage' && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">URL</label>
                    <div className="relative">
                      <LinkIcon className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input required type="url" value={newResource.url} onChange={(e) => setNewResource({ ...newResource, url: e.target.value })} placeholder="https://…" className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-blue-100 transition-all" />
                    </div>
                  </div>
                )}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{newResource.type === 'text' ? 'Content' : 'Notes / description'}</label>
                  <textarea required={newResource.type === 'text'} rows={4} value={newResource.content} onChange={(e) => setNewResource({ ...newResource, content: e.target.value })} placeholder={newResource.type === 'text' ? 'Paste your notes here…' : 'Add context for the coach…'} className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-100 transition-all" />
                  {newResource.type !== 'text' && (
                    <p className="text-[11px] text-slate-400">
                      Add a short summary here. The coach indexes these notes now; it does not yet read the full PDF, image, or webpage automatically.
                    </p>
                  )}
                </div>
                <button type="submit" disabled={isUploading} className="btn-primary w-full py-3">
                  {isUploading ? <><Loader2 className="h-4 w-4 animate-spin" /> Uploading…</> : 'Save to knowledge base'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
