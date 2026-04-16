import React, { useState } from 'react';
import { addDays, format, nextFriday, nextMonday, nextSaturday, nextSunday, nextThursday, nextTuesday, nextWednesday } from 'date-fns';
import { ArrowRight, Sparkles } from 'lucide-react';

// ── Intent types ──────────────────────────────────────────────────────────────

export type IntentResult =
  | { intent: 'create_event'; date: string; time?: string; title: string }
  | { intent: 'create_task';  date: string; time?: string; title: string }
  | { intent: 'schedule_post'; date: string; time?: string }
  | { intent: 'unknown'; original: string };

// ── Date / time parsers ───────────────────────────────────────────────────────

function resolveDate(text: string): string | null {
  const lower = text.toLowerCase();
  const today = new Date();
  const ref = (d: Date) => format(d, 'yyyy-MM-dd');

  if (/\btoday\b/.test(lower))     return ref(today);
  if (/\btomorrow\b/.test(lower))  return ref(addDays(today, 1));
  if (/\bmonday\b/.test(lower))    return ref(nextMonday(today));
  if (/\btuesday\b/.test(lower))   return ref(nextTuesday(today));
  if (/\bwednesday\b/.test(lower)) return ref(nextWednesday(today));
  if (/\bthursday\b/.test(lower))  return ref(nextThursday(today));
  if (/\bfriday\b/.test(lower))    return ref(nextFriday(today));
  if (/\bsaturday\b/.test(lower))  return ref(nextSaturday(today));
  if (/\bsunday\b/.test(lower))    return ref(nextSunday(today));
  if (/\bnext week\b/.test(lower)) return ref(addDays(today, 7));

  // Month + day: "April 20" / "Apr 20"
  const mdMatch = lower.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})\b/);
  if (mdMatch) {
    const months: Record<string, number> = {
      jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
      jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
    };
    const m = months[mdMatch[1].slice(0, 3).toLowerCase()];
    const d = parseInt(mdMatch[2], 10);
    const y = today.getFullYear();
    const resolved = new Date(y, m, d);
    if (resolved < today) resolved.setFullYear(y + 1);
    return ref(resolved);
  }

  return null;
}

function resolveTime(text: string): string | null {
  const m = text.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = m[2] ? parseInt(m[2], 10) : 0;
  const ampm = m[3]?.toLowerCase();
  if (ampm === 'pm' && h < 12) h += 12;
  if (ampm === 'am' && h === 12) h = 0;
  if (h > 23 || h < 0) return null;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

function stripDateTimeWords(text: string): string {
  return text
    .replace(/\bnext week\b/gi, '')
    .replace(/\b(today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi, '')
    .replace(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{1,2}\b/gi, '')
    .replace(/\b\d{1,2}(?::\d{2})?\s*(?:am|pm)\b/gi, '')
    .replace(/\bat\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

// ── Public parser ─────────────────────────────────────────────────────────────

export function parseCalendarIntent(input: string): IntentResult {
  const lower = input.toLowerCase().trim();
  const today = format(new Date(), 'yyyy-MM-dd');
  const date = resolveDate(input) ?? today;
  const time = resolveTime(input) ?? undefined;

  // Schedule post
  if (/\b(schedule|post|reel|story|teaser|clip|tiktok|instagram|tweet)\b/.test(lower)) {
    return { intent: 'schedule_post', date, time };
  }

  // Task / reminder
  if (/\b(task|remind|to-?do|finish|complete|submit|send)\b/.test(lower)) {
    const title = stripDateTimeWords(
      input.replace(/\b(task|remind me to|to-do|todo|finish|complete|submit|send)\b/gi, '').trim()
    ) || input;
    return { intent: 'create_task', date, time, title };
  }

  // Custom event: book, studio, session, meeting, call, etc.
  if (/\b(book|studio|session|meeting|call|interview|show|gig|rehearsal|event|block)\b/.test(lower)) {
    const title = stripDateTimeWords(
      input.replace(/\b(book|schedule|add|set|block off)\b/gi, '').trim()
    ) || input;
    return { intent: 'create_event', date, time, title };
  }

  return { intent: 'unknown', original: input };
}

// ── Component ─────────────────────────────────────────────────────────────────

const EXAMPLES = [
  'book studio Friday 2pm',
  'schedule teaser reel next Wednesday 6pm',
  'task: email distributor by tomorrow',
];

interface Props {
  onIntent: (result: IntentResult) => void;
}

export function CalendarAIAssistant({ onIntent }: Props) {
  const [input, setInput]     = useState('');
  const [preview, setPreview] = useState<IntentResult | null>(null);

  const handleChange = (val: string) => {
    setInput(val);
    setPreview(val.trim().length > 4 ? parseCalendarIntent(val) : null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    onIntent(parseCalendarIntent(input));
    setInput('');
    setPreview(null);
  };

  const intentLabel = preview
    ? preview.intent === 'create_event'   ? 'Event'
    : preview.intent === 'create_task'    ? 'Task'
    : preview.intent === 'schedule_post'  ? 'Post'
    : null
    : null;

  return (
    <div className="rounded-[1.75rem] border border-slate-100 bg-white px-5 py-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="shrink-0 rounded-xl bg-blue-50 p-2">
          <Sparkles className="h-4 w-4 text-blue-600" />
        </div>
        <form onSubmit={handleSubmit} className="flex min-w-0 flex-1 items-center gap-3">
          <input
            className="min-w-0 flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
            placeholder="Quick plan — 'book studio Friday 2pm' or 'schedule reel next Tuesday 6pm'…"
            value={input}
            onChange={(e) => handleChange(e.target.value)}
          />
          {intentLabel && preview && (
            <span className="shrink-0 rounded-lg border border-blue-100 bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-600">
              {intentLabel}
              {'date' in preview ? ` · ${preview.date}` : ''}
              {'time' in preview && preview.time ? ` ${preview.time}` : ''}
            </span>
          )}
          <button
            type="submit"
            disabled={!input.trim()}
            className="shrink-0 flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-blue-600 disabled:opacity-40"
          >
            Add <ArrowRight className="h-3 w-3" />
          </button>
        </form>
      </div>
      {/* Example hints */}
      <div className="mt-2 flex flex-wrap gap-2 pl-11">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            type="button"
            onClick={() => handleChange(ex)}
            className="text-[10px] text-slate-400 transition-colors hover:text-blue-600"
          >
            "{ex}"
          </button>
        ))}
      </div>
    </div>
  );
}
