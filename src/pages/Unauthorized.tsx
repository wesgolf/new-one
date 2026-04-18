import React, { useState } from 'react';
import { AlertCircle, Lock, Mail, ArrowRight } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { signInWithEmail } from '../lib/auth';
import { useCurrentUser } from '../hooks/useCurrentUser';

export function Unauthorized() {
  const navigate = useNavigate();
  const { isAuthenticated, role } = useCurrentUser();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Already authenticated with a role → push straight in
  if (isAuthenticated && role) {
    navigate('/dashboard', { replace: true });
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Minimal top bar */}
      <header className="h-14 px-6 flex items-center border-b border-border bg-surface">
        <Link to="/" className="text-[13px] font-bold tracking-[0.18em] text-text-primary uppercase select-none">
          WES
        </Link>
        <span className="ml-3 text-xs font-medium text-text-muted tracking-wide">Artist OS</span>
      </header>

      {/* Centered card */}
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">

          {/* Header */}
          <div className="mb-8">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center mb-5"
              style={{ background: 'linear-gradient(135deg, #6d28d9 0%, #a855f7 100%)' }}
            >
              <span className="text-[11px] font-bold text-white tracking-[0.1em]">WES</span>
            </div>
            <h1 className="text-2xl font-bold text-text-primary tracking-tight">Welcome back</h1>
            <p className="mt-1.5 text-sm text-text-muted">Sign in to your Artist OS dashboard</p>
          </div>

          {/* No-role warning */}
          {isAuthenticated && !role && (
            <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-semibold text-amber-900">Account not yet assigned a role</p>
              <p className="mt-1 text-sm text-amber-800">
                You're signed in but haven't been given access yet. Contact your manager.
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
              <div className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* Form */}
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              setLoading(true);
              setError(null);
              try {
                await signInWithEmail(email, password);
                navigate('/dashboard');
              } catch (err: any) {
                setError(err.message || 'Authentication failed');
                setPassword('');
              } finally {
                setLoading(false);
              }
            }}
          >
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-tertiary">
                Email
              </span>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                <input
                  className="input-base pl-11"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-tertiary">
                Password
              </span>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                <input
                  className="input-base pl-11"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full mt-2 gap-2"
            >
              {loading ? (
                'Signing in…'
              ) : (
                <>
                  Sign in
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Back link */}
          <p className="mt-6 text-center text-sm text-text-muted">
            <Link to="/" className="text-brand hover:underline font-medium">
              ← Back to public site
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
