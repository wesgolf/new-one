import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import { buildViteDefineEnv } from './env/loadPreferredEnv';

export default defineConfig(({mode}) => {
  const defineEnv = buildViteDefineEnv(mode, __dirname);
  return {
    appType: 'custom',
    plugins: [react(), tailwindcss()],
    define: {
      ...defineEnv,
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      port: 3000,
      hmr: process.env.DISABLE_HMR !== 'true',
      allowedHosts: true,
    },
  };
});
