import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

type CalendarEventRow = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  event_type: string;
  starts_at: string;
  ends_at: string | null;
  is_recurring: boolean;
  recurrence_rule: Record<string, any> | null;
  recurrence_interval: number | null;
  linked_track: string | null;
  source_table: string | null;
  source_id: string | null;
  source_field: string | null;
  created_at: string;
  updated_at: string;
};

type EventFormState = {
  title: string;
  description: string;
  event_type: string;
  starts_at: string;
  ends_at: string;
  is_recurring: boolean;
  recurrence_rule: string;
  recurrence_interval: string;
  linked_track: string;
  source_table: string;
  source_id: string;
  source_field: string;
};

const DEFAULT_FORM: EventFormState = {
  title: '',
  description: '',
  event_type: 'general',
  starts_at: '',
  ends_at: '',
  is_recurring: false,
  recurrence_rule: '',
  recurrence_interval: '',
  linked_track: '',
  source_table: '',
  source_id: '',
  source_field: '',
};

function EventEditor({
  open,
  initialValue,
  onClose,
  onSaved,
}: {
  open: boolean;
  initialValue: CalendarEventRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<EventFormState>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (!initialValue) {
      setForm(DEFAULT_FORM);
      return;
    }

    setForm({
      title: initialValue.title ?? '',
      description: initialValue.description ?? '',
      event_type: initialValue.event_type ?? 'general',
      starts_at: initialValue.starts_at ? initialValue.starts_at.slice(0, 16) : '',
      ends_at: initialValue.ends_at ? initialValue.ends_at.slice(0, 16) : '',
      is_recurring: Boolean(initialValue.is_recurring),
      recurrence_rule: initialValue.recurrence_rule ? JSON.stringify(initialValue.recurrence_rule, null, 2) : '',
      recurrence_interval: initialValue.recurrence_interval ? String(initialValue.recurrence_interval) : '',
      linked_track: initialValue.linked_track ?? '',
      source_table: initialValue.source_table ?? '',
      source_id: initialValue.source_id ?? '',
      source_field: initialValue.source_field ?? '',
    });
  }, [initialValue, open]);

  if (!open) return null;

  const update = <K extends keyof EventFormState>(key: K, value: EventFormState[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const payload = {
        user_id: session?.user?.id ?? null,
        title: form.title.trim(),
        description: form.description.trim() || null,
        event_type: form.event_type.trim() || 'general',
        starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : null,
        ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
        is_recurring: form.is_recurring,
        recurrence_rule: form.recurrence_rule.trim() ? JSON.parse(form.recurrence_rule) : null,
        recurrence_interval: form.recurrence_interval ? Number(form.recurrence_interval) : null,
        linked_track: form.linked_track || null,
        source_table: form.source_table || null,
        source_id: form.source_id || null,
        source_field: form.source_field || null,
        updated_at: new Date().toISOString(),
      };

      const query = initialValue
        ? supabase.from('calendar_events').update(payload).eq('id', initialValue.id)
        : supabase.from('calendar_events').insert([payload]);

      const { error } = await query;
      if (error) throw error;
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-3xl border border-border bg-white shadow-2xl">
        <div className="border-b border-border px-6 py-4">
          <h2 className="text-xl font-semibold text-text-primary">{initialValue ? 'Edit calendar event' : 'New calendar event'}</h2>
        </div>
        <form onSubmit={handleSubmit} className="grid gap-4 p-6 md:grid-cols-2">
          <label className="md:col-span-2">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-text-tertiary">Title</span>
            <input className="input-base" value={form.title} onChange={(event) => update('title', event.target.value)} required />
          </label>
          <label className="md:col-span-2">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-text-tertiary">Description</span>
            <textarea className="input-base min-h-24 resize-none" value={form.description} onChange={(event) => update('description', event.target.value)} />
          </label>
          <label>
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-text-tertiary">Event Type</span>
            <input className="input-base" value={form.event_type} onChange={(event) => update('event_type', event.target.value)} />
          </label>
          <label className="flex items-end gap-3">
            <input type="checkbox" checked={form.is_recurring} onChange={(event) => update('is_recurring', event.target.checked)} />
            <span className="pb-3 text-sm text-text-secondary">Recurring</span>
          </label>
          <label>
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-text-tertiary">Starts At</span>
            <input className="input-base" type="datetime-local" value={form.starts_at} onChange={(event) => update('starts_at', event.target.value)} />
          </label>
          <label>
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-text-tertiary">Ends At</span>
            <input className="input-base" type="datetime-local" value={form.ends_at} onChange={(event) => update('ends_at', event.target.value)} />
          </label>
          <label>
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-text-tertiary">Recurrence Interval</span>
            <input className="input-base" type="number" value={form.recurrence_interval} onChange={(event) => update('recurrence_interval', event.target.value)} />
          </label>
          <label>
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-text-tertiary">Linked Track</span>
            <input className="input-base" value={form.linked_track} onChange={(event) => update('linked_track', event.target.value)} />
          </label>
          <label>
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-text-tertiary">Source Table</span>
            <input className="input-base" value={form.source_table} onChange={(event) => update('source_table', event.target.value)} />
          </label>
          <label>
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-text-tertiary">Source ID</span>
            <input className="input-base" value={form.source_id} onChange={(event) => update('source_id', event.target.value)} />
          </label>
          <label className="md:col-span-2">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-text-tertiary">Source Field</span>
            <input className="input-base" value={form.source_field} onChange={(event) => update('source_field', event.target.value)} />
          </label>
          <label className="md:col-span-2">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-text-tertiary">Recurrence Rule JSON</span>
            <textarea className="input-base min-h-28 font-mono text-xs" value={form.recurrence_rule} onChange={(event) => update('recurrence_rule', event.target.value)} />
          </label>
          <div className="md:col-span-2 flex items-center justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function Calendar() {
  const [events, setEvents] = useState<CalendarEventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEventRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (!userId) {
        setEvents([]);
        return;
      }

      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('user_id', userId)
        .order('starts_at', { ascending: true });

      if (error) throw error;
      setEvents((data ?? []) as CalendarEventRow[]);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load calendar events');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const deleteEvent = async (eventId: string) => {
    const { error } = await supabase.from('calendar_events').delete().eq('id', eventId);
    if (!error) {
      void load();
    }
  };

  const grouped = useMemo(() => {
    const now = Date.now();
    return {
      upcoming: events.filter((event) => new Date(event.starts_at).getTime() >= now),
      past: events.filter((event) => new Date(event.starts_at).getTime() < now),
    };
  }, [events]);

  return (
    <div className="space-y-8 pb-20">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-text-tertiary">Calendar</p>
          <h1 className="mt-2 text-4xl font-bold text-text-primary">Calendar Events</h1>
          <p className="mt-2 max-w-2xl text-text-secondary">
            This page now reads and writes the new `calendar_events` table directly.
          </p>
        </div>
        <button
          type="button"
          className="btn-primary"
          onClick={() => {
            setEditingEvent(null);
            setEditorOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
          New event
        </button>
      </header>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-text-tertiary" />
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-2">
          {(['upcoming', 'past'] as const).map((section) => (
            <section key={section} className="rounded-2xl border border-border bg-white shadow-sm">
              <div className="border-b border-border px-5 py-4">
                <h2 className="text-base font-semibold text-text-primary">
                  {section === 'upcoming' ? 'Upcoming events' : 'Past events'}
                </h2>
              </div>
              <div className="p-5">
                {grouped[section].length === 0 ? (
                  <p className="text-sm text-text-secondary">No {section} events.</p>
                ) : (
                  <div className="space-y-3">
                    {grouped[section].map((event) => (
                      <article key={event.id} className="rounded-xl border border-border bg-slate-50 px-4 py-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <CalendarDays className="h-4 w-4 text-text-tertiary" />
                              <h3 className="font-medium text-text-primary">{event.title}</h3>
                            </div>
                            <p className="mt-2 text-sm text-text-secondary">
                              {event.event_type} · {new Date(event.starts_at).toLocaleString()}
                              {event.ends_at ? ` → ${new Date(event.ends_at).toLocaleString()}` : ''}
                            </p>
                            {event.description && <p className="mt-2 text-sm text-text-secondary">{event.description}</p>}
                            {(event.source_table || event.source_field) && (
                              <p className="mt-2 text-xs text-text-tertiary">
                                Source: {[event.source_table, event.source_field].filter(Boolean).join(' · ')}
                              </p>
                            )}
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <button type="button" className="rounded-lg p-2 text-text-tertiary hover:bg-white hover:text-text-primary" onClick={() => { setEditingEvent(event); setEditorOpen(true); }}>
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button type="button" className="rounded-lg p-2 text-text-tertiary hover:bg-rose-50 hover:text-rose-600" onClick={() => void deleteEvent(event.id)}>
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </section>
          ))}
        </div>
      )}

      <EventEditor
        open={editorOpen}
        initialValue={editingEvent}
        onClose={() => setEditorOpen(false)}
        onSaved={() => void load()}
      />
    </div>
  );
}
