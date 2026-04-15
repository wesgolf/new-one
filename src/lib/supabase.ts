import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
// VITE_SUPABASE_ANON is the JWT anon key Supabase requires; VITE_SUPABASE_PK is a fallback alias
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON || import.meta.env.VITE_SUPABASE_PK;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase environment variables are missing or not exposed to the client. Ensure VITE_SUPABASE_URL and VITE_SUPABASE_PK (or VITE_SUPABASE_ANON) are set and restart the dev server.');
}

// Export the client using available values. If values are missing the client will be initialized
// with placeholders to avoid throwing during module import; network calls will fail until real
// credentials are provided and the dev server is restarted.
export const supabase = createClient(
  supabaseUrl || 'https://placeholder-project.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);
