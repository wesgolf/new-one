import React, { useEffect, useState } from 'react';
import { MailPlus, Plus, Search, Send } from 'lucide-react';
import { fetchJson } from '../lib/api';
import { supabase } from '../lib/supabase';
import { useCurrentUser } from '../hooks/useCurrentUser';

function EmailComposer({
  open,
  contact,
  createdBy,
  onClose,
}: {
  open: boolean;
  contact: any | null;
  createdBy?: string | null;
  onClose: () => void;
}) {
  const [intent, setIntent] = useState('venue pitch');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open || !contact) return;
    setSubject('');
    setBody('');
  }, [open, contact]);

  if (!open || !contact) return null;

  const draftEmail = async () => {
    setLoading(true);
    try {
      const result = await fetchJson<{ subject: string; body: string }>('/api/outreach/draft', {
        method: 'POST',
        body: JSON.stringify({
          intent,
          contactName: contact.name,
          context: `Category: ${contact.category}. Status: ${contact.status}. Latest release context can be added later.`,
        }),
      });
      setSubject(result.subject);
      setBody(result.body);
    } finally {
      setLoading(false);
    }
  };

  const sendEmail = async () => {
    setSending(true);
    try {
      await fetchJson('/api/outreach/send', {
        method: 'POST',
        body: JSON.stringify({
          contactId: contact.id,
          subject,
          body,
          createdBy,
        }),
      });
      onClose();
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-3xl rounded-[2rem] border border-border bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">Draft email</p>
            <h3 className="mt-2 text-2xl font-bold text-text-primary">{contact.name}</h3>
          </div>
          <button type="button" onClick={onClose} className="btn-secondary">
            Close
          </button>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
          <div className="space-y-3">
            {['venue pitch', 'follow-up', 'playlist pitch', 'general outreach'].map((option) => (
              <button
                key={option}
                type="button"
                className={`w-full rounded-2xl border px-4 py-3 text-left ${intent === option ? 'border-slate-950 bg-slate-950 text-white' : 'border-border bg-slate-50 text-text-primary'}`}
                onClick={() => setIntent(option)}
              >
                {option}
              </button>
            ))}
            <button type="button" onClick={draftEmail} className="btn-primary w-full" disabled={loading}>
              <MailPlus className="h-4 w-4" />
              {loading ? 'Drafting...' : 'Draft with AI'}
            </button>
          </div>

          <div className="space-y-4">
            <input className="input-base" placeholder="Subject" value={subject} onChange={(event) => setSubject(event.target.value)} />
            <textarea className="min-h-72 w-full rounded-2xl border border-border bg-slate-50 px-4 py-3 text-sm text-text-primary outline-none" value={body} onChange={(event) => setBody(event.target.value)} />
            <div className="flex justify-end">
              <button type="button" className="btn-primary" onClick={sendEmail} disabled={sending || !subject || !body}>
                <Send className="h-4 w-4" />
                {sending ? 'Logging...' : 'Queue Send'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Opportunities() {
  const { authUser } = useCurrentUser();
  const [contacts, setContacts] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [composerContact, setComposerContact] = useState<any | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    name: '',
    category: 'Venue',
    contact: '',
    status: 'cold',
    relationship_strength: 3,
  });

  const load = async () => {
    const { data } = await supabase.from('opportunities').select('*').order('relationship_strength', { ascending: false });
    setContacts(data || []);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = contacts.filter((contact) =>
    contact.name.toLowerCase().includes(search.toLowerCase()) ||
    (contact.category || '').toLowerCase().includes(search.toLowerCase()) ||
    (contact.contact || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8 pb-20">
      <header className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-text-tertiary">Network</p>
          <h1 className="mt-2 text-4xl font-bold text-text-primary">Contacts and outreach</h1>
          <p className="mt-2 max-w-2xl text-text-secondary">
            Draft emails directly from contact records, keep the final edit in the user’s hands, and log outbound outreach server-side.
          </p>
        </div>
        <button type="button" className="btn-primary" onClick={() => setShowAdd(true)}>
          <Plus className="h-4 w-4" />
          Add Contact
        </button>
      </header>

      <section className="rounded-[2rem] border border-border bg-white p-4 shadow-sm">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
          <input className="input-base pl-11" placeholder="Search contacts" value={search} onChange={(event) => setSearch(event.target.value)} />
        </label>
      </section>

      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((contact) => (
          <article key={contact.id} className="rounded-[2rem] border border-border bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">{contact.category}</p>
                <h3 className="mt-2 text-2xl font-bold text-text-primary">{contact.name}</h3>
              </div>
              <span className="badge badge-primary">{contact.status}</span>
            </div>
            <p className="mt-4 text-sm text-text-secondary">{contact.contact || 'No email captured yet.'}</p>
            <p className="mt-2 text-xs text-text-tertiary">Relationship strength: {contact.relationship_strength || 0}/5</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <button type="button" className="btn-primary" onClick={() => setComposerContact(contact)}>
                <MailPlus className="h-4 w-4" />
                Draft Email
              </button>
            </div>
          </article>
        ))}
      </section>

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-[2rem] border border-border bg-white p-6 shadow-2xl">
            <div className="mb-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">New contact</p>
              <h3 className="mt-2 text-2xl font-bold text-text-primary">Add network record</h3>
            </div>
            <form
              className="space-y-4"
              onSubmit={async (event) => {
                event.preventDefault();
                await supabase.from('opportunities').insert([{ ...form, user_id: authUser?.id || null }]);
                setShowAdd(false);
                setForm({
                  name: '',
                  category: 'Venue',
                  contact: '',
                  status: 'cold',
                  relationship_strength: 3,
                });
                load();
              }}
            >
              <input className="input-base" placeholder="Name" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
              <div className="grid gap-4 md:grid-cols-2">
                <select className="input-base" value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}>
                  <option>Venue</option>
                  <option>Label</option>
                  <option>Promoter</option>
                  <option>Collaborator</option>
                  <option>Playlist</option>
                </select>
                <input className="input-base" placeholder="Email" value={form.contact} onChange={(event) => setForm((current) => ({ ...current, contact: event.target.value }))} />
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" className="btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Save contact</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <EmailComposer open={Boolean(composerContact)} contact={composerContact} createdBy={authUser?.id} onClose={() => setComposerContact(null)} />
    </div>
  );
}
