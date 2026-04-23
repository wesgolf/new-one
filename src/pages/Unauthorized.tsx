/**
 * Unauthorized / Login page
 *
 * Renders in two modes:
 *   1. Not authenticated  → show login form
 *   2. Authenticated but role is insufficient → show "access restricted" message
 */

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Eye, EyeOff, Lock, Mail, ShieldOff } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { signInWithEmail, LoginError } from '../lib/auth';
import { useCurrentUser } from '../hooks/useCurrentUser';

// ─── Background decoration ────────────────────────────────────────────────────

function Background() {
  return (
    <>
      {/* Base gradient */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{ background: 'linear-gradient(160deg, #090d1a 0%, #06090f 55%, #090d1a 100%)' }}
      />
      {/* Ambient blue radial at top */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-[60vh]"
        style={{ background: 'radial-gradient(ellipse 70% 50% at 50% -10%, rgba(37,99,235,0.18), transparent)' }}
      />
      {/* Subtle noise texture via SVG filter */}
      <svg aria-hidden className="pointer-events-none fixed inset-0 -z-10 h-full w-full opacity-[0.025]">
        <filter id="noise">
          <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#noise)" />
      </svg>
    </>
  );
}

// ─── Logo mark ─────────────────────────────────────────────────────────────────

function LogoMark({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const sz = size === 'md' ? 'h-14 w-14' : 'h-10 w-10';
  const text = size === 'md' ? 'text-[15px]' : 'text-[12px]';
  return (
    <div
      className={`${sz} flex items-center justify-center rounded-2xl ring-[1.5px] ring-white/10`}
      style={{ background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)' }}
    >
      <span className={`${text} font-black tracking-tight text-white`}>WES</span>
    </div>
  );
}

// ─── Access-restricted view (logged in but no permission) ─────────────────────

function AccessDeniedView() {
  return (
    <motion.div
      className="flex flex-col items-center text-center gap-6"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      <LogoMark />

      {/* Icon */}
      <div
        className="flex h-16 w-16 items-center justify-center rounded-full ring-[1.5px] ring-white/10"
        style={{ background: 'rgba(239,68,68,0.1)' }}
      >
        <ShieldOff className="h-7 w-7 text-red-400" aria-hidden />
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-white">Access restricted</h1>
        <p className="max-w-xs text-[14px] leading-relaxed text-white/45">
          Your account doesn't have permission to view this page. Contact your administrator to request access.
        </p>
      </div>

      <div className="flex flex-col gap-3 w-full max-w-[260px]">
        <Link
          to="/dashboard"
          className="w-full rounded-xl py-3 text-[14px] font-bold text-white text-center transition-all hover:opacity-90 active:scale-[0.98]"
          style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%)' }}
        >
          Back to dashboard
        </Link>
        <Link
          to="/"
          className="w-full rounded-xl border border-white/10 py-3 text-[14px] font-semibold text-white/60 text-center transition-colors hover:text-white/80 hover:border-white/20"
        >
          Go to homepage
        </Link>
      </div>
    </motion.div>
  );
}

// ─── Login form ────────────────────────────────────────────────────────────────

interface LoginFormProps {
  onLoginSuccess: () => void;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function LoginForm({ onLoginSuccess }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // ── Client-side pre-validation ──
    if (!EMAIL_RE.test(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      await signInWithEmail(email.trim(), password);
      // Navigation is handled by the parent useEffect once the auth context updates.
      onLoginSuccess();
    } catch (err: any) {
      if (err instanceof LoginError) {
        setError(err.message);
      } else {
        setError('Sign-in failed. Please try again.');
      }
      // Only clear password for credential errors so the user doesn't retype email
      if (!err?.code || err.code === 'wrong_credentials') {
        setPassword('');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      className="relative w-full max-w-[380px]"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Header */}
      <div className="mb-8 flex flex-col items-center text-center gap-4">
        <LogoMark />
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-white">Artist OS</h1>
          <p className="mt-1 text-[13px] text-white/40">Sign in to your management suite</p>
        </div>
      </div>

      {/* Card */}
      <div
        className="overflow-hidden rounded-2xl border border-white/[0.07]"
        style={{ background: 'rgba(255,255,255,0.035)', backdropFilter: 'blur(24px)' }}
      >
        {/* Card cap */}
        <div className="flex items-center gap-2 border-b border-white/[0.06] px-6 py-4">
          <Lock className="h-3.5 w-3.5 text-white/25" aria-hidden />
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/25">
            Secure Access
          </p>
        </div>

        <div className="px-6 py-6 space-y-4">
          {/* Error banner */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="rounded-xl border border-red-500/20 bg-red-500/[0.08] px-4 py-3 text-[13px] text-red-400"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <form className="space-y-4" onSubmit={handleSubmit} noValidate>
            {/* Email */}
            <div>
              <label
                htmlFor="login-email"
                className="mb-2 block text-[10px] font-bold uppercase tracking-[0.18em] text-white/30"
              >
                Email
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/20" aria-hidden />
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-white/[0.07] bg-white/[0.04] py-3 pl-11 pr-4 text-[14px] text-white placeholder:text-white/20 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="login-password"
                className="mb-2 block text-[10px] font-bold uppercase tracking-[0.18em] text-white/30"
              >
                Password
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/20" aria-hidden />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-white/[0.07] bg-white/[0.04] py-3 pl-11 pr-12 text-[14px] text-white placeholder:text-white/20 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all"
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/50 transition-colors cursor-pointer"
                >
                  {showPassword
                    ? <EyeOff className="h-4 w-4" aria-hidden />
                    : <Eye className="h-4 w-4" aria-hidden />
                  }
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !email || !password}
              className="mt-2 w-full rounded-xl py-3 text-[14px] font-bold text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              style={{
                background: 'linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%)',
              }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing in…
                </span>
              ) : 'Sign In'}
            </button>
          </form>
        </div>
      </div>

      {/* Footer note */}
      <p className="mt-6 text-center text-[11px] text-white/15">
        Access is invite-only. Contact your administrator for an account.
      </p>
    </motion.div>
  );
}

// ─── Page root ─────────────────────────────────────────────────────────────────

export function Unauthorized() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isLoading, role } = useCurrentUser();

  // Where to go after successful login (respects original destination)
  const from = (location.state as any)?.from?.pathname ?? '/dashboard';

  // Redirect when auth context confirms login is complete.
  // Uses isAuthenticated only (not role) so we don't wait for a second
  // render cycle after the profile fetch completes — eliminates perceived slowness.
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isLoading, isAuthenticated, navigate, from]);

  // Determine display mode
  // - isAuthenticated + no role → show "access restricted" (account exists but no profile/role yet)
  const isRestricted = isAuthenticated && !role && !isLoading;

  return (
    <div className="relative min-h-dvh flex items-center justify-center px-4 py-12">
      <Background />

      {/* Back to homepage (top-left) */}
      <Link
        to="/"
        aria-label="Back to homepage"
        className="fixed top-5 left-5 z-50 inline-flex items-center gap-1.5 text-[12px] font-semibold text-white/35 transition-colors hover:text-white/60"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        <span>Home</span>
      </Link>

      {/* Main content — fade between modes */}
      <AnimatePresence mode="wait">
        {isRestricted ? (
          <motion.div key="denied" className="w-full max-w-[380px] flex justify-center">
            <AccessDeniedView />
          </motion.div>
        ) : (
          <motion.div key="login" className="w-full max-w-[380px]">
            <LoginForm onLoginSuccess={() => {/* redirect handled by useEffect above */}} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

