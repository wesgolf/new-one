/**
 * Unauthorized / Login page
 *
 * Renders in two modes:
 *   1. Not authenticated  → show login form
 *   2. Authenticated but role is insufficient → show "access restricted" message
 */

import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Lock, Mail, ShieldOff } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { signInWithEmail, LoginError } from '../lib/auth';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { settingsService } from '../services/settingsService';
import { ARTIST_INFO } from '../constants';
import type { UnauthorizedPageSettings } from '../types/domain';
import { DEFAULT_UNAUTHORIZED_PAGE_SETTINGS } from '../types/domain';

// ─── Background decoration ────────────────────────────────────────────────────

function Background() {
  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{ background: 'linear-gradient(180deg, #f8fbff 0%, #f5f7fb 48%, #eef4ff 100%)' }}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-[50vh]"
        style={{ background: 'radial-gradient(ellipse 65% 55% at 50% 0%, rgba(37,99,235,0.14), transparent 72%)' }}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-y-0 left-0 -z-10 w-[32rem]"
        style={{ background: 'radial-gradient(circle at 0% 20%, rgba(148,163,184,0.10), transparent 58%)' }}
      />
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
      className={`${sz} flex items-center justify-center rounded-2xl border border-border bg-white shadow-[var(--shadow-card)]`}
    >
      <span className={`${text} font-black tracking-[0.18em] text-text-primary`}>WES</span>
    </div>
  );
}

// ─── Access-restricted view (logged in but no permission) ─────────────────────

function AccessDeniedView({ heading, subtext, showContactLink, contactEmail }: { heading: string; subtext: string; showContactLink: boolean; contactEmail: string }) {
  return (
    <motion.div
      className="glass-modal flex w-full max-w-[480px] flex-col items-center gap-6 p-8 text-center"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      <LogoMark />

      <div
        className="flex h-16 w-16 items-center justify-center rounded-full border border-red-200 bg-red-50"
      >
        <ShieldOff className="h-7 w-7 text-red-500" aria-hidden />
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">{heading}</h1>
        <p className="max-w-xs text-[14px] leading-relaxed text-text-secondary">
          {subtext}
        </p>
      </div>

      {showContactLink && contactEmail ? (
        <a
          href={`mailto:${contactEmail}`}
          className="text-sm font-semibold text-brand hover:text-brand-hover"
        >
          Contact support
        </a>
      ) : null}

      <div className="flex flex-col gap-3 w-full max-w-[260px]">
        <Link
          to="/dashboard"
          className="btn-primary w-full"
        >
          Back to dashboard
        </Link>
        <Link
          to="/"
          className="btn-secondary w-full"
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
      className="relative w-full max-w-[430px]"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="mb-8 flex flex-col items-center text-center gap-4">
        <LogoMark />
        <div>
          <h1 className="text-[24px] font-bold tracking-tight text-text-primary">Artist OS</h1>
          <p className="mt-1 text-[13px] text-text-secondary">Sign in to your management suite</p>
        </div>
      </div>

      <div className="glass-modal overflow-hidden">
        <div className="flex items-center gap-2 border-b border-border/70 px-6 py-4">
          <Lock className="h-3.5 w-3.5 text-text-muted" aria-hidden />
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-text-muted">
            Secure Access
          </p>
        </div>

        <div className="px-6 py-6 space-y-4">
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-600"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <form className="space-y-4" onSubmit={handleSubmit} noValidate>
            <div>
              <label
                htmlFor="login-email"
                className="mb-2 block text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted"
              >
                Email
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" aria-hidden />
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  className="input-base py-3 pl-11 pr-4"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="login-password"
                className="mb-2 block text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted"
              >
                Password
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" aria-hidden />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="input-base py-3 pl-11 pr-12"
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer text-text-muted transition-colors hover:text-text-primary"
                >
                  {showPassword
                    ? <EyeOff className="h-4 w-4" aria-hidden />
                    : <Eye className="h-4 w-4" aria-hidden />
                  }
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !email || !password}
              className="btn-primary mt-2 w-full py-3 disabled:cursor-not-allowed disabled:opacity-50"
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

    </motion.div>
  );
}

// ─── Page root ─────────────────────────────────────────────────────────────────

export function Unauthorized() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isLoading, role } = useCurrentUser();
  const [unauthorizedPageSettings, setUnauthorizedPageSettings] = useState<UnauthorizedPageSettings>(
    () => settingsService.getCachedSettingsByCategory('unauthorized_page') ?? DEFAULT_UNAUTHORIZED_PAGE_SETTINGS,
  );

  // Where to go after successful login (respects original destination)
  const from = (location.state as any)?.from?.pathname ?? '/dashboard';

  useEffect(() => {
    let cancelled = false;
    void settingsService.unauthorized_page.get()
      .then((settings) => {
        if (!cancelled) setUnauthorizedPageSettings(settings);
      })
      .catch(() => {
        // Keep cached/default settings if loading fails.
      });
    return () => { cancelled = true; };
  }, []);

  // Redirect when auth context confirms login is complete and role is present.
  useEffect(() => {
    if (!isLoading && isAuthenticated && role) {
      navigate(from, { replace: true });
    }
  }, [isLoading, isAuthenticated, role, navigate, from]);

  // Determine display mode
  // - isAuthenticated + no role → show "access restricted" (account exists but no profile/role yet)
  const isRestricted = isAuthenticated && !role && !isLoading;
  const heading = unauthorizedPageSettings.heading || DEFAULT_UNAUTHORIZED_PAGE_SETTINGS.heading;
  const subtext = unauthorizedPageSettings.subtext || DEFAULT_UNAUTHORIZED_PAGE_SETTINGS.subtext;
  const showContactLink = unauthorizedPageSettings.show_contact_link ?? DEFAULT_UNAUTHORIZED_PAGE_SETTINGS.show_contact_link;
  const contactEmail = unauthorizedPageSettings.contact_email || ARTIST_INFO.email || '';

  return (
    <div className="relative min-h-screen bg-background px-4 py-0">
      <Background />
      <div className="mx-auto flex min-h-screen max-w-[430px] items-center justify-center">
        <AnimatePresence mode="wait">
          {isRestricted ? (
            <motion.div key="denied" className="w-full">
              <AccessDeniedView
                heading={heading}
                subtext={subtext}
                showContactLink={showContactLink}
                contactEmail={contactEmail}
              />
            </motion.div>
          ) : (
            <motion.div key="login" className="w-full">
              <LoginForm onLoginSuccess={() => {/* redirect handled by useEffect above */}} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
