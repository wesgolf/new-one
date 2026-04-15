import React, { useEffect, useState } from 'react';
import { Bot, Send } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import { fetchGoals, fetchIdeas, fetchReleases, fetchTasks } from '../lib/supabaseData';

interface CoachMessage {
  role: 'user' | 'assistant';
  content: string;
}

const STORAGE_KEY = 'artist_coach_messages';

export function ArtistCoach() {
  const [messages, setMessages] = useState<CoachMessage[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved) as CoachMessage[];
      } catch {
        return [];
      }
    }
    return [
      {
        role: 'assistant',
        content: 'Coach history is preserved here. Ask for release strategy, task prioritization, goal planning, or content timing help.',
      },
    ];
  });
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  }, [messages]);

  const getContext = async () => {
    const [tasks, ideas, releases, goals] = await Promise.all([fetchTasks(), fetchIdeas(), fetchReleases(), fetchGoals()]);
    return [
      `Tasks: ${tasks.slice(0, 6).map((task) => task.title).join(', ') || 'none'}`,
      `Ideas: ${ideas.slice(0, 6).map((idea) => `${idea.title} (${idea.status})`).join(', ') || 'none'}`,
      `Releases: ${releases.slice(0, 6).map((release) => release.title).join(', ') || 'none'}`,
      `Goals: ${goals.slice(0, 6).map((goal) => goal.title).join(', ') || 'none'}`,
    ].join('\n');
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const prompt = input.trim();
    if (!prompt) return;

    setMessages((current) => [...current, { role: 'user', content: prompt }]);
    setInput('');
    setLoading(true);

    try {
      const context = await getContext();
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        setMessages((current) => [
          ...current,
          {
            role: 'assistant',
            content: `Use this context to continue planning:\n\n${context}\n\nGemini is not configured in the browser, so the coach is currently returning structured context instead of generated advice.`,
          },
        ]);
        return;
      }

      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `You are Artist OS Coach. Use this context and answer concisely.\n\n${context}\n\nUser request: ${prompt}`,
      });

      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content: response.text || 'No response generated.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 pb-20">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-text-tertiary">Coach</p>
        <h1 className="mt-2 text-4xl font-bold text-text-primary">Conversation history</h1>
        <p className="mt-2 max-w-2xl text-text-secondary">
          The page has been cleaned up to focus on the actual conversation flow. The global assistant drawer links back here for longer-form history.
        </p>
      </header>

      <section className="rounded-[2rem] border border-border bg-white shadow-sm">
        <div className="border-b border-border px-6 py-5">
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-white">
            <Bot className="h-3.5 w-3.5" />
            Artist Coach
          </div>
        </div>
        <div className="space-y-4 px-6 py-6">
          {messages.map((message, index) => (
            <div key={`${message.role}-${index}`} className={message.role === 'assistant' ? 'mr-10' : 'ml-10'}>
              <div className={message.role === 'assistant' ? 'rounded-3xl rounded-tl-md bg-slate-100 px-4 py-3' : 'rounded-3xl rounded-tr-md bg-slate-950 px-4 py-3 text-white'}>
                <p className={message.role === 'assistant' ? 'text-sm leading-7 text-text-primary' : 'text-sm leading-7 text-white'}>
                  {message.content}
                </p>
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-border px-6 py-5">
          <form onSubmit={handleSubmit} className="space-y-3">
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask for strategic help, release planning, or next actions."
              className="min-h-32 w-full rounded-3xl border border-border bg-slate-50 px-4 py-3 text-sm text-text-primary outline-none"
            />
            <div className="flex justify-end">
              <button type="submit" className="btn-primary" disabled={loading}>
                <Send className="h-4 w-4" />
                {loading ? 'Thinking...' : 'Send'}
              </button>
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}
