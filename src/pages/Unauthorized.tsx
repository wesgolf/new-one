import React, { useState } from 'react';
import { AlertCircle, Lock, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmail } from '../lib/auth';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { PublicHub } from './PublicHub';

export function Unauthorized() {
  const navigate = useNavigate();
  const { isAuthenticated, role } = useCurrentUser();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const authPanel = (
    <>
      {isAuthenticated && !role ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900">Authenticated but unauthorized</p>
          <p className="mt-1 text-sm text-amber-800">Your account is signed in, but it does not have an Artist OS role yet.</p>
          <button type="button" className="btn-primary mt-4" onClick={() => navigate('/')}>
            Return to dashboard
          </button>
        </div>
      ) : (
        <form
          className="space-y-4"
          onSubmit={async (event) => {
            event.preventDefault();
            setLoading(true);
            setError(null);
            try {
              await signInWithEmail(email, password);
              navigate('/');
            } catch (err: any) {
              setError(err.message || 'Authentication failed');
              setPassword('');
            } finally {
              setLoading(false);
            }
          }}
        >
          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
              <div className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 h-4 w-4" />
                <span>{error}</span>
              </div>
            </div>
          )}
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-tertiary">Email</span>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
              <input className="input-base pl-11" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
            </div>
          </label>
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-tertiary">Password</span>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
              <input className="input-base pl-11" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
            </div>
          </label>
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Signing in...' : 'Sign in to Artist OS'}
          </button>
        </form>
      )}
    </>
  );

  return <PublicHub authPanel={authPanel} />;
}
