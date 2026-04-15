import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      // GEMINI_API_KEY has no VITE_ prefix so must be explicitly injected
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      // In custom-server / middleware mode Vite does NOT auto-inject import.meta.env.*
      // so we must explicitly define these to bake the real values into the client bundle.
      'import.meta.env.VITE_SUPABASE_URL':  JSON.stringify(env.VITE_SUPABASE_URL  ?? ''),
      'import.meta.env.VITE_SUPABASE_ANON': JSON.stringify(env.VITE_SUPABASE_ANON ?? ''),
      'import.meta.env.VITE_SUPABASE_PK':   JSON.stringify(env.VITE_SUPABASE_PK   ?? ''),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      allowedHosts: true,
    },
  };
});
