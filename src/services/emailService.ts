/**
 * emailService
 *
 * Handles AI email drafting, Supabase log persistence, and
 * server-side email dispatch for outreach workflows.
 *
 * Architecture:
 *  - Draft generation: Gemini via VITE_GEMINI_API_KEY (same pattern as ArtistCoach)
 *  - Persistence: Supabase `outreach_emails` table (no API keys on client)
 *  - Sending: POST /api/email/send (server owns SMTP credentials)
 */
import { supabase } from '../lib/supabase';
import type { OutreachEmail, OpportunityContact } from '../types/domain';

// ── Intent labels ─────────────────────────────────────────────────────────────

export type EmailIntent =
  | 'venue_pitch'
  | 'follow_up'
  | 'playlist_pitch'
  | 'general_outreach';

export const EMAIL_INTENT_LABELS: Record<EmailIntent, string> = {
  venue_pitch:      'Venue Pitch',
  follow_up:        'Follow-up',
  playlist_pitch:   'Playlist Pitch',
  general_outreach: 'General Outreach',
};

const INTENT_CONTEXT: Record<EmailIntent, string> = {
  venue_pitch:
    'a pitch to book a live performance or DJ set at their venue. Mention the genre/energy of the music and why it fits their audience.',
  follow_up:
    'a warm follow-up to a previous conversation or meeting. Briefly recap context and propose a clear next step.',
  playlist_pitch:
    'a pitch to get a track added to their playlist. Reference the track, its energy, and why it fits their playlist audience.',
  general_outreach:
    'a first-touch introduction and collaboration inquiry. Keep it brief and leave the door open.',
};

// ── AI draft ─────────────────────────────────────────────────────────────────

export interface EmailDraft {
  subject: string;
  body: string;
}

export async function generateEmailDraft(
  contact: Pick<OpportunityContact, 'name' | 'category' | 'notes' | 'tags'>,
  intent: EmailIntent,
  artistContext?: { artistName?: string; recentRelease?: string; genre?: string }
): Promise<EmailDraft> {
  const res = await fetch('/api/email/draft', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contact,
      intent,
      artistContext,
      intentContext: INTENT_CONTEXT[intent],
    }),
  });
  if (!res.ok) throw new Error(`Email draft generation failed: HTTP ${res.status}`);
  return res.json() as Promise<EmailDraft>;
}

// ── Persistence ───────────────────────────────────────────────────────────────

export async function saveEmailLog(
  email: Omit<OutreachEmail, 'id' | 'created_at'>
): Promise<OutreachEmail> {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('outreach_emails')
    .insert([{ ...email, created_by: user?.id ?? null }])
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as OutreachEmail;
}

export async function updateEmailStatus(
  id: string,
  status: OutreachEmail['status'],
  sentAt?: string
): Promise<void> {
  const { error } = await supabase
    .from('outreach_emails')
    .update({ status, ...(sentAt ? { sent_at: sentAt } : {}) })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function fetchEmailsForContact(contactId: string): Promise<OutreachEmail[]> {
  const { data, error } = await supabase
    .from('outreach_emails')
    .select('*')
    .eq('contact_id', contactId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as OutreachEmail[];
}

// ── Send via server ───────────────────────────────────────────────────────────

/**
 * POST /api/email/send
 *
 * The server owns SMTP credentials — the client only passes the message payload.
 * Falls back gracefully when the endpoint is not configured.
 */
export async function sendEmailViaServer(params: {
  to: string;
  subject: string;
  body: string;
  emailLogId?: string;
}): Promise<{ sent: boolean; message: string }> {
  const res = await fetch('/api/email/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' })) as { error: string };
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }

  return res.json() as Promise<{ sent: boolean; message: string }>;
}
