import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PK;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase environment variables are missing. Please configure VITE_SUPABASE_URL and VITE_SUPABASE_PK in the AI Studio Secrets panel.');
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
    },
  }
);
