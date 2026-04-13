import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import * as Sentry from "@sentry/react";
import App from './App.tsx';
import './index.css';

const dsn = import.meta.env.VITE_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration(),
    ],
    tracesSampleRate: 1.0,
    tracePropagationTargets: ["localhost", /^https:\/\/ais-dev-.*\.run\.app/],
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
  });
}

const SentryApp = Sentry.withErrorBoundary(App, {
  fallback: (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="glass-card p-8 max-w-md w-full text-center">
        <h1 className="text-2xl font-bold text-slate-900 mb-4">Something went wrong</h1>
        <p className="text-slate-600 mb-6">Artist OS encountered an unexpected error. Our team has been notified.</p>
        <button 
          onClick={() => window.location.reload()}
          className="btn-primary w-full"
        >
          Reload Application
        </button>
      </div>
    </div>
  ),
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <SentryApp />
    </BrowserRouter>
  </StrictMode>,
);
