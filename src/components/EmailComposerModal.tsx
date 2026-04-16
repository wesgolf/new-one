/**
 * EmailComposerModal
 *
 * Contact-level email drafting flow:
 *  1. Pick intent (venue pitch / follow-up / playlist pitch / general outreach)
 *  2. Generate AI draft (subject + body via Gemini)
 *  3. User reviews and edits
 *  4. Save as Draft  →  persists to outreach_emails with status='draft'
 *  5. Open in Email App  →  mailto: link + marks as 'sent' in DB
 *  6. Send via Server (future)  →  /api/email/send + marks as 'sent' in DB
 *
 * History tab shows previous outreach to the same contact.
 */
import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Bot,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  ExternalLink,
  Loader2,
  Mail,
  Save,
  Send,
  Sparkles,
  X,
} from 'lucide-react';
import { cn } from '../lib/utils';
import {
  EMAIL_INTENT_LABELS,
  fetchEmailsForContact,
  generateEmailDraft,
  saveEmailLog,
  sendEmailViaServer,
  updateEmailStatus,
} from '../services/emailService';
import type { EmailIntent } from '../services/emailService';
import type { OpportunityContact, OutreachEmail } from '../types/domain';

// ── Helpers ───────────────────────────────────────────────────────────────────

const INTENT_ORDER: EmailIntent[] = [
  'venue_pitch',
  'follow_up',
  'playlist_pitch',
  'general_outreach',
];

const INTENT_DESCRIPTIONS: Record<EmailIntent, string> = {
  venue_pitch:      'Book a live set or performance',
  follow_up:        'Re-engage after a previous touchpoint',
  playlist_pitch:   'Pitch a track for playlist consideration',
  general_outreach: 'First-touch introduction or collab inquiry',
};

function StatusBadge({ status }: { status: OutreachEmail['status'] }) {
  const map: Record<OutreachEmail['status'], { label: string; cls: string }> = {
    draft:  { label: 'Draft',  cls: 'bg-slate-100 text-slate-500' },
    sent:   { label: 'Sent',   cls: 'bg-emerald-50 text-emerald-600' },
    failed: { label: 'Failed', cls: 'bg-rose-50 text-rose-600' },
  };
  const m = map[status] ?? map.draft;
  return (
    <span className={cn('px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest', m.cls)}>
      {m.label}
    </span>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

interface EmailComposerModalProps {
  contact: OpportunityContact;
  onClose: () => void;
  artistContext?: { artistName?: string; recentRelease?: string; genre?: string };
}

type TabId = 'compose' | 'history';

export function EmailComposerModal({ contact, onClose, artistContext }: EmailComposerModalProps) {
  const [tab, setTab] = useState<TabId>('compose');

  // Compose state
  const [intent,   setIntent]   = useState<EmailIntent | null>(null);
  const [subject,  setSubject]  = useState('');
  const [body,     setBody]     = useState('');
  const [drafting, setDrafting] = useState(false);
  const [draftErr, setDraftErr] = useState<string | null>(null);
  const [saving,   setSaving]   = useState(false);
  const [sending,  setSending]  = useState(false);
  const [toast,    setToast]    = useState<string | null>(null);

  // History state
  const [history,     setHistory]     = useState<OutreachEmail[]>([]);
  const [loadingHist, setLoadingHist] = useState(false);
  const [expandedId,  setExpandedId]  = useState<string | null>(null);

  const bodyRef = useRef<HTMLTextAreaElement>(null);

  // Load history when tab switches to history
  useEffect(() => {
    if (tab !== 'history') return;
    setLoadingHist(true);
    fetchEmailsForContact(contact.id)
      .then(setHistory)
      .catch(() => setHistory([]))
      .finally(() => setLoadingHist(false));
  }, [tab, contact.id]);

  // Auto-grow body textarea
  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.style.height = 'auto';
      bodyRef.current.style.height = `${bodyRef.current.scrollHeight}px`;
    }
  }, [body]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // ── Actions ──────────────────────────────────────────────────────────────

  const handleGenerateDraft = async () => {
    if (!intent) return;
    setDrafting(true);
    setDraftErr(null);
    try {
      const draft = await generateEmailDraft(
        { name: contact.name, category: contact.category, notes: contact.notes ?? undefined, tags: contact.tags ?? undefined },
        intent,
        artistContext
      );
      setSubject(draft.subject);
      setBody(draft.body);
    } catch (err) {
      setDraftErr(err instanceof Error ? err.message : 'Draft failed');
    } finally {
      setDrafting(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!subject.trim() || !body.trim()) return;
    setSaving(true);
    try {
      await saveEmailLog({
        contact_id: contact.id,
        subject: subject.trim(),
        body: body.trim(),
        status: 'draft',
      });
      showToast('Draft saved');
    } catch (err) {
      showToast('Failed to save draft');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenInEmailApp = async () => {
    if (!subject.trim() || !body.trim()) return;
    const to = contact.contact ?? '';
    const mailto = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailto, '_self');

    // Log as sent
    try {
      const saved = await saveEmailLog({
        contact_id: contact.id,
        subject: subject.trim(),
        body: body.trim(),
        status: 'sent',
        sent_at: new Date().toISOString(),
      });
      showToast('Opened in email app and logged');
      setHistory((prev) => [saved, ...prev]);
    } catch {
      // non-blocking
    }
  };

  const handleSendViaServer = async () => {
    const to = contact.contact ?? '';
    if (!to || !subject.trim() || !body.trim()) return;
    setSending(true);
    let saved: OutreachEmail | null = null;
    try {
      saved = await saveEmailLog({
        contact_id: contact.id,
        subject: subject.trim(),
        body: body.trim(),
        status: 'draft',
      });
      await sendEmailViaServer({ to, subject: subject.trim(), body: body.trim(), emailLogId: saved.id });
      await updateEmailStatus(saved.id, 'sent', new Date().toISOString());
      setHistory((prev) => [{ ...saved!, status: 'sent', sent_at: new Date().toISOString() }, ...prev]);
      showToast('Sent and logged ✓');
    } catch (err) {
      if (saved) await updateEmailStatus(saved.id, 'failed').catch(() => null);
      showToast(err instanceof Error ? err.message : 'Send failed');
    } finally {
      setSending(false);
    }
  };

  const hasEmailAddress = Boolean(contact.contact?.includes('@'));
  const canCompose = subject.trim().length > 0 && body.trim().length > 0;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 bg-slate-900/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        className="bg-white rounded-t-3xl md:rounded-3xl w-full md:max-w-2xl max-h-[92dvh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-white shrink-0">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">Draft Email</p>
              <p className="text-xs text-slate-500">
                {contact.name}
                {contact.contact && (
                  <span className="ml-1 text-slate-400">· {contact.contact}</span>
                )}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100 px-6 shrink-0">
          {(['compose', 'history'] as TabId[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cn(
                'py-3 px-1 mr-6 text-xs font-bold uppercase tracking-widest border-b-2 transition-colors',
                tab === t
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              )}
            >
              {t === 'compose' ? 'Compose' : 'History'}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">

          {/* ── COMPOSE TAB ── */}
          {tab === 'compose' && (
            <div className="p-6 space-y-5">

              {/* Intent picker */}
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                  Email Intent
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {INTENT_ORDER.map((i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setIntent(i)}
                      className={cn(
                        'flex flex-col items-start gap-1 rounded-2xl border px-4 py-3 text-left transition-colors',
                        intent === i
                          ? 'border-slate-900 bg-slate-950 text-white'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      )}
                    >
                      <span className={cn('text-xs font-bold', intent === i ? 'text-white' : 'text-slate-900')}>
                        {EMAIL_INTENT_LABELS[i]}
                      </span>
                      <span className={cn('text-[10px] leading-tight', intent === i ? 'text-slate-300' : 'text-slate-400')}>
                        {INTENT_DESCRIPTIONS[i]}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Generate button */}
              <button
                type="button"
                disabled={!intent || drafting}
                onClick={handleGenerateDraft}
                className={cn(
                  'w-full flex items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold transition-all',
                  intent && !drafting
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                )}
              >
                {drafting ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Drafting…</>
                ) : (
                  <><Sparkles className="w-4 h-4" /> Generate AI Draft</>
                )}
              </button>

              {draftErr && (
                <p className="text-xs text-rose-600 rounded-xl bg-rose-50 px-4 py-3">{draftErr}</p>
              )}

              {/* Editable subject */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  Subject
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Enter subject…"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-slate-400 focus:bg-white outline-none transition-colors"
                />
              </div>

              {/* Editable body */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  Body
                </label>
                <textarea
                  ref={bodyRef}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Your email body will appear here. Select an intent and click Generate AI Draft, or write directly."
                  className="w-full min-h-[180px] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-slate-400 focus:bg-white outline-none transition-colors resize-none leading-relaxed"
                />
              </div>

              {!hasEmailAddress && (
                <p className="text-xs text-amber-600 bg-amber-50 rounded-xl px-4 py-3">
                  No email address on record for this contact. Add one via the contact record to enable sending.
                </p>
              )}
            </div>
          )}

          {/* ── HISTORY TAB ── */}
          {tab === 'history' && (
            <div className="p-6">
              {loadingHist ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                </div>
              ) : history.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-12 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
                    <Mail className="w-5 h-5 text-slate-400" />
                  </div>
                  <p className="text-sm font-bold text-slate-600">No emails yet</p>
                  <p className="text-xs text-slate-400 max-w-xs">
                    Emails you draft or send to {contact.name} will appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {history.map((email) => {
                    const isExpanded = expandedId === email.id;
                    return (
                      <div key={email.id} className="rounded-2xl border border-slate-100 overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setExpandedId(isExpanded ? null : email.id)}
                          className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-900 truncate">{email.subject}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <Clock className="w-3 h-3 text-slate-400" />
                              <span className="text-[10px] text-slate-400">
                                {email.sent_at
                                  ? new Date(email.sent_at).toLocaleDateString()
                                  : email.created_at
                                  ? new Date(email.created_at).toLocaleDateString()
                                  : '—'}
                              </span>
                            </div>
                          </div>
                          <StatusBadge status={email.status} />
                          {isExpanded
                            ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                            : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
                        </button>
                        {isExpanded && (
                          <div className="px-4 pb-4 border-t border-slate-100 bg-slate-50/50">
                            <pre className="mt-3 text-xs text-slate-700 whitespace-pre-wrap font-sans leading-relaxed">
                              {email.body}
                            </pre>
                            <button
                              type="button"
                              onClick={() => {
                                setSubject(email.subject);
                                setBody(email.body);
                                setTab('compose');
                              }}
                              className="mt-3 text-xs font-bold text-blue-600 hover:underline"
                            >
                              Load into composer →
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer actions (compose tab only) */}
        {tab === 'compose' && (
          <div className="px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
            <button
              type="button"
              disabled={!canCompose || saving}
              onClick={handleSaveDraft}
              className={cn(
                'flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-bold transition-colors',
                canCompose && !saving
                  ? 'border border-slate-200 text-slate-700 hover:bg-slate-50'
                  : 'border border-slate-100 text-slate-400 cursor-not-allowed'
              )}
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Save Draft
            </button>

            <button
              type="button"
              disabled={!canCompose || !hasEmailAddress}
              onClick={handleOpenInEmailApp}
              className={cn(
                'flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-bold transition-colors',
                canCompose && hasEmailAddress
                  ? 'border border-slate-900 bg-white text-slate-900 hover:bg-slate-50'
                  : 'border border-slate-100 text-slate-400 cursor-not-allowed'
              )}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Open in Email App
            </button>

            <button
              type="button"
              disabled={!canCompose || !hasEmailAddress || sending}
              onClick={handleSendViaServer}
              className={cn(
                'flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-bold transition-colors sm:ml-auto',
                canCompose && hasEmailAddress && !sending
                  ? 'bg-slate-950 text-white hover:bg-slate-800'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              )}
            >
              {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Send via Server
            </button>
          </div>
        )}
      </motion.div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-medium text-white shadow-xl"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
