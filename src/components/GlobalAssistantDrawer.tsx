import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Bot,
  CalendarPlus,
  CheckSquare,
  ChevronRight,
  Loader2,
  MessageSquareMore,
  Music2,
  Send,
  Sparkles,
  X,
} from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import { dispatchAssistantAction } from '../lib/commandBus';
import { useAssistantContext } from '../context/AssistantContext';
import type { AssistantAction } from '../types/domain';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  actions?: AssistantAction[];
}

const STORAGE_KEY = 'artist_os_assistant_drawer_messages';

export function GlobalAssistantDrawer() {
  const { open, setOpen, pageContext } = useAssistantContext();
  const navigate = useNavigate();
  const [input, setInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved) as Message[];
      } catch {
        return [];
      }
    }

    return [
      {
        role: 'assistant',
        content: "I'm your AI assistant. Tell me what you need — I can create tasks, schedule events, open pages, and more.",
      },
    ];
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const quickActions = useMemo(
    () => [
      {
        label: 'Add calendar event',
        icon: CalendarPlus,
        action: {
          type: 'create_calendar_event',
          label: 'Create calendar event',
          payload: { startsAt: new Date().toISOString() },
          requiresConfirmation: true,
        } satisfies AssistantAction,
      },
      {
        label: 'Create task',
        icon: CheckSquare,
        action: {
          type: 'create_task',
          label: 'Create task draft',
          payload: { title: '' },
          requiresConfirmation: true,
        } satisfies AssistantAction,
      },
      {
        label: 'Open releases',
        icon: Music2,
        action: {
          type: 'navigate',
          label: 'Navigate to releases',
          payload: { to: '/releases' },
        } satisfies AssistantAction,
      },
    ],
    []
  );

  // Map action types to the page they need to be on for dispatch to be handled
  const ACTION_PAGE_MAP: Partial<Record<string, string>> = {
    create_task:           '/tasks',
    create_calendar_event: '/calendar',
    open_content_scheduler:'/content',
    open_release:          '/releases',
  };

  const runAction = (action: AssistantAction) => {
    if (action.type === 'navigate' && action.payload?.to) {
      navigate(action.payload.to as string);
      setOpen(false);
      return;
    }

    const targetPage = ACTION_PAGE_MAP[action.type];
    if (targetPage) {
      // Navigate to the page that has the subscriber, then dispatch after mount
      navigate(targetPage);
      setOpen(false);
      setTimeout(() => dispatchAssistantAction(action), 300);
    } else {
      dispatchAssistantAction(action);
      setOpen(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || aiLoading) return;

    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: trimmed }]);
    setAiLoading(true);

    const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;

    if (!apiKey) {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'Gemini API key not configured (VITE_GEMINI_API_KEY). Set it in your .env to enable AI actions.',
        },
      ]);
      setAiLoading(false);
      return;
    }

    try {
      const ai = new GoogleGenAI({ apiKey });

      const systemPrompt = `You are an AI assistant embedded in an artist management app called Artist OS.
The user is currently on the "${pageContext}" page.
Today is ${new Date().toDateString()}.

Parse the user's message and respond with a JSON object:
{
  "reply": "a short natural-language confirmation of what you're doing (1-2 sentences)",
  "actions": [
    {
      "type": "create_task | create_calendar_event | open_content_scheduler | navigate",
      "label": "human-readable label",
      "payload": {
        "title": "...",       // for tasks/events
        "startsAt": "ISO string", // for calendar events
        "to": "/path"         // for navigate actions
      },
      "requiresConfirmation": true
    }
  ]
}

Available action types:
- create_task: create a new task/to-do
- create_calendar_event: schedule something on the calendar
- open_content_scheduler: open content/post scheduler
- navigate: go to a page (/dashboard, /releases, /calendar, /tasks, /goals, /analytics, /content, /coach, /strategy, /network)

If nothing actionable is detected, set actions to [].
Always respond with valid JSON only — no markdown, no extra text.`;

      const result = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: 'application/json',
          temperature: 0.3,
        },
        contents: [{ role: 'user', parts: [{ text: trimmed }] }],
      });

      const raw = result.text?.trim() ?? '{}';
      let parsed: { reply?: string; actions?: AssistantAction[] } = {};
      try {
        parsed = JSON.parse(raw);
      } catch {
        parsed = { reply: raw };
      }

      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: parsed.reply || 'Done.',
          actions: parsed.actions ?? [],
        },
      ]);
    } catch (err) {
      console.error('[Assistant] Gemini error:', err);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, I had trouble connecting to my brain. Please try again.',
        },
      ]);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-4 z-40 inline-flex h-14 w-14 items-center justify-center rounded-full bg-slate-950 text-white shadow-xl shadow-slate-900/20 hover:scale-[1.02]"
        aria-label="Open assistant"
      >
        <MessageSquareMore className="h-6 w-6" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/35 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-label="Close assistant overlay"
          />

          <aside className="absolute right-0 top-0 h-full w-full max-w-xl border-l border-border bg-white shadow-2xl">
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white">
                    <Bot className="h-3.5 w-3.5" />
                    Assistant
                  </div>
                  <p className="mt-2 text-sm text-text-secondary">
                    Context-aware command layer for {pageContext}.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg p-2 text-text-tertiary hover:bg-slate-100 hover:text-text-primary"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="border-b border-border px-5 py-4">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {quickActions.map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => runAction(item.action)}
                      className="rounded-2xl border border-border bg-slate-50 px-3 py-3 text-left hover:border-slate-300 hover:bg-white"
                    >
                      <item.icon className="mb-3 h-4 w-4 text-slate-700" />
                      <p className="text-sm font-semibold text-text-primary">{item.label}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
                {messages.map((message, index) => (
                  <div
                    key={`${message.role}-${index}`}
                    className={message.role === 'assistant' ? 'mr-8' : 'ml-8'}
                  >
                    <div
                      className={
                        message.role === 'assistant'
                          ? 'rounded-3xl rounded-tl-md bg-slate-100 px-4 py-3'
                          : 'rounded-3xl rounded-tr-md bg-blue-600 px-4 py-3 text-white'
                      }
                    >
                      <p className={message.role === 'assistant' ? 'text-sm text-text-primary' : 'text-sm text-white'}>
                        {message.content}
                      </p>
                    </div>

                    {message.actions && message.actions.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {message.actions.map((action, actionIndex) => (
                          <button
                            key={`${action.label}-${actionIndex}`}
                            type="button"
                            onClick={() => runAction(action)}
                            className="flex w-full items-center justify-between rounded-2xl border border-border px-4 py-3 text-left hover:border-slate-300 hover:bg-slate-50"
                          >
                            <div>
                              <p className="text-sm font-semibold text-text-primary">{action.label}</p>
                              <p className="text-xs text-text-tertiary">
                                {action.requiresConfirmation ? 'Tap to open on the target page.' : 'Runs immediately.'}
                              </p>
                            </div>
                            <ChevronRight className="h-4 w-4 text-text-tertiary" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {aiLoading && (
                  <div className="mr-8">
                    <div className="inline-flex items-center gap-2 rounded-3xl rounded-tl-md bg-slate-100 px-4 py-3">
                      <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
                      <p className="text-sm text-slate-500">Thinking…</p>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="border-t border-border px-5 py-4">
                <form onSubmit={handleSubmit} className="space-y-3">
                  <textarea
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmit(e as unknown as React.FormEvent);
                      }
                    }}
                    placeholder='Try "create a task for artwork delivery" or "schedule a studio session Friday 2pm".'
                    className="min-h-28 w-full rounded-3xl border border-border bg-slate-50 px-4 py-3 text-sm text-text-primary outline-none focus:border-slate-400 focus:bg-white"
                  />
                  <div className="flex items-center justify-between">
                    <Link to="/coach" className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                      <Sparkles className="h-4 w-4" />
                      Full Coach History
                    </Link>
                    <button type="submit" disabled={aiLoading} className="btn-primary disabled:opacity-50">
                      {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      {aiLoading ? 'Thinking…' : 'Ask AI'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
