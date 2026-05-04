import { createClient } from '@supabase/supabase-js';

const supabaseUrl     = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_ANON ||
  import.meta.env.VITE_SUPABASE_PK;
const nativeFetch = globalThis.fetch.bind(globalThis);

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[Supabase] Missing configuration. Set VITE_SUPABASE_URL and a Supabase public key env var.');
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
  const relativePath = (() => {
    try {
      return new URL(url).pathname.replace(/^\/+/, '/');
    } catch {
      return url.replace(supabaseUrl, '').split('?')[0];
    }
  })();

  try {
    const response = await nativeFetch(input, init);

    if (!response.ok) {
      const statusLine = `[Supabase] ${method} ${relativePath} -> ${response.status} ${response.statusText}`;
      try {
        const cloned = response.clone();
        const text = await cloned.text();
        console.error(statusLine, text);
      } catch (error) {
        console.error(statusLine, error);
      }
    }

    return response;
  } catch (error) {
    console.error(`[Supabase] Network error ${method} ${relativePath}`, error);
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
