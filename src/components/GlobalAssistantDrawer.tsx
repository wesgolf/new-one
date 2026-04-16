import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Bot,
  CalendarPlus,
  CheckSquare,
  ChevronRight,
  MessageSquareMore,
  Music2,
  Send,
  Sparkles,
  X,
} from 'lucide-react';
import { parseAssistantIntent } from '../lib/assistantActions';
import { dispatchAssistantAction } from '../lib/commandBus';
import type { AssistantAction } from '../types/domain';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  actions?: AssistantAction[];
}

const STORAGE_KEY = 'artist_os_assistant_drawer_messages';

function labelForPath(pathname: string) {
  if (pathname.startsWith('/calendar')) return 'calendar';
  if (pathname.startsWith('/ideas')) return 'ideas';
  if (pathname.startsWith('/releases')) return 'releases';
  if (pathname.startsWith('/tasks')) return 'tasks';
  if (pathname.startsWith('/network')) return 'network';
  return 'dashboard';
}

export function GlobalAssistantDrawer() {
  const location = useLocation();
  const navigate = useNavigate();
  const pageContext = labelForPath(location.pathname);
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
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
        content: 'Assistant actions are available on every page. Ask to create a task, open a release, or schedule something.',
      },
    ];
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
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

  const runAction = (action: AssistantAction) => {
    if (action.type === 'navigate' && action.payload?.to) {
      navigate(action.payload.to);
      setOpen(false);
      return;
    }

    dispatchAssistantAction(action);
    setOpen(false);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;

    const parsed = parseAssistantIntent(trimmed, pageContext);
    const nextMessages: Message[] = [
      ...messages,
      { role: 'user', content: trimmed },
      { role: 'assistant', content: parsed.summary, actions: parsed.actions },
    ];

    setMessages(nextMessages);
    setInput('');
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
                                {action.requiresConfirmation ? 'Requires confirmation on the target page.' : 'Runs immediately.'}
                              </p>
                            </div>
                            <ChevronRight className="h-4 w-4 text-text-tertiary" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="border-t border-border px-5 py-4">
                <form onSubmit={handleSubmit} className="space-y-3">
                  <textarea
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    placeholder='Try "book studio Friday 2pm" or "create a task for artwork delivery".'
                    className="min-h-28 w-full rounded-3xl border border-border bg-slate-50 px-4 py-3 text-sm text-text-primary outline-none focus:border-slate-400 focus:bg-white"
                  />
                  <div className="flex items-center justify-between">
                    <Link to="/coach" className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                      <Sparkles className="h-4 w-4" />
                      Full Coach History
                    </Link>
                    <button type="submit" className="btn-primary">
                      <Send className="h-4 w-4" />
                      Suggest Action
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
