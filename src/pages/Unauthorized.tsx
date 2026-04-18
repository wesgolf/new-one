import React, { useState } from 'react';
import { Lock, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmail } from '../lib/auth';
import { useCurrentUser } from '../hooks/useCurrentUser';

export function Unauthorized() {
  const navigate = useNavigate();
  const { isAuthenticated, role } = useCurrentUser();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (isAuthenticated && role) {
    navigate('/dashboard', { replace: true });
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">

      {/* Navbar — identical to authenticated Layout */}
      <header className="sticky top-0 z-50 bg-surface border-b border-border">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-14 flex items-center">
          <span className="text-[13px] font-bold tracking-[0.18em] text-text-primary uppercase select-none">
            WES
          </span>
          <span className="ml-2.5 text-xs font-medium text-text-muted tracking-wide">Artist OS</span>
        </div>
      </header>

      {/* Page content */}
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">

          <div className="mb-6">
            <h1 className="text-xl font-bold text-text-primary">Sign in</h1>
            <p className="mt-1 text-sm text-text-muted">Access your Artist OS dashboard</p>
          </div>

          {/* Card — same as DashCard */}
          <div className="bg-white border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="border-b border-border px-5 py-3.5 flex items-center gap-2">
              <Lock className="h-3.5 w-3.5 text-text-tertiary" aria-hidden />
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">
                Artist OS access
              </p>
            </div>

            <div className="p-5">
              {error && (
                <div className="mb-4 rounded-lg border border-rose-100 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
                  {error}
                </div>
              )}

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
                    <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" aria-hidden />
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
                    <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" aria-hidden />
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
                  className="btn-primary w-full"
                >
                  {loading ? 'Signing in…' : 'Sign in to Artist OS'}
                </button>
              </form>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

