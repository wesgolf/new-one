import { createClient } from '@supabase/supabase-js';

const supabaseUrl     = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON || import.meta.env.VITE_SUPABASE_PK;
const nativeFetch = globalThis.fetch.bind(globalThis);

// ── Boot diagnostics (remove once auth is stable) ─────────────────────────
console.group('[Supabase] Client init');
console.log('URL present:',      !!supabaseUrl,     supabaseUrl ? supabaseUrl.slice(0, 40) + '…' : '❌ MISSING');
console.log('Anon key present:', !!supabaseAnonKey, supabaseAnonKey ? supabaseAnonKey.slice(0, 20) + '…' : '❌ MISSING');
console.log('Key type:',
  supabaseAnonKey?.startsWith('eyJ')        ? '✅ JWT (correct)'      :
  supabaseAnonKey?.startsWith('sb_publish') ? '⚠️  Publishable key (may not work for auth)' :
  '❌ Unknown format',
);
console.groupEnd();

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[Supabase] ❌ Missing env vars — auth will fail. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON to .env');
}

function summarizeBody(body: BodyInit | null | undefined) {
  if (!body) return null;
  if (typeof body === 'string') {
    return body.length > 400 ? `${body.slice(0, 400)}…` : body;
  }
  if (body instanceof FormData) {
    return '[FormData]';
  }
  if (body instanceof URLSearchParams) {
    return body.toString();
  }
  return '[Body]';
}

async function instrumentedSupabaseFetch(input: RequestInfo | URL, init?: RequestInit) {
  const url = typeof input === 'string'
    ? input
    : input instanceof URL
    ? input.toString()
    : input.url;

  const shouldLog =
    Boolean(supabaseUrl) &&
    url.startsWith(supabaseUrl) &&
    (
      url.includes('/rest/v1/') ||
      url.includes('/auth/v1/') ||
      url.includes('/storage/v1/')
    );

  if (!shouldLog) {
    return nativeFetch(input, init);
  }

  const method = (init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
  const startedAt = performance.now();
  const startedIso = new Date().toISOString();
  const bodyPreview = summarizeBody(init?.body);
  const relativeUrl = url.replace(supabaseUrl, '');

  console.groupCollapsed(`[Supabase fetch] ${method} ${relativeUrl}`);
  console.log('[Supabase fetch] Started at:', startedIso);
  console.log('[Supabase fetch] Method:', method);
  console.log('[Supabase fetch] URL:', url);
  if (bodyPreview) {
    console.log('[Supabase fetch] Body preview:', bodyPreview);
  }

  try {
    const response = await nativeFetch(input, init);
    const durationMs = Math.round(performance.now() - startedAt);
    const contentType = response.headers.get('content-type') ?? null;
    console.log('[Supabase fetch] Status:', response.status, response.statusText);
    console.log('[Supabase fetch] Duration ms:', durationMs);
    console.log('[Supabase fetch] Content-Type:', contentType);

    if (!response.ok) {
      try {
        const cloned = response.clone();
        const text = await cloned.text();
        console.error('[Supabase fetch] Error response body:', text);
      } catch (error) {
        console.error('[Supabase fetch] Could not read error response body:', error);
      }
    }

    console.groupEnd();
    return response;
  } catch (error) {
    const durationMs = Math.round(performance.now() - startedAt);
    console.error('[Supabase fetch] Network failure after ms:', durationMs);
    console.error('[Supabase fetch] Error:', error);
    console.groupEnd();
    throw error;
  }
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder-project.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    global: {
      fetch: instrumentedSupabaseFetch,
    },
    auth: {
      // Sessions are stored in localStorage — isolated per origin & browser profile.
      // Incognito tabs start with a clean localStorage so sessions don't carry over.
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'artist-os-auth',
      // Some browser/extension setups can deadlock navigator.locks and stall auth calls.
      // A no-op lock keeps auth responsive for single-user browser sessions.
      lock: async (_name, _timeout, fn) => await fn(),
    },
  }
);
