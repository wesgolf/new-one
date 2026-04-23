import { createClient } from '@supabase/supabase-js';

const supabaseUrl     = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON || import.meta.env.VITE_SUPABASE_PK;

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

export const supabase = createClient(
  supabaseUrl || 'https://placeholder-project.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
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
