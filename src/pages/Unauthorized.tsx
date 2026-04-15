/**
 * Unauthorized / Access Denied Page
 * Premium branded login/auth page and insufficient permissions page
 */

import React, { useState } from 'react';
import { Zap, Lock, AlertCircle, Music, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmail } from '../lib/auth';
import { useCurrentUser } from '../hooks/useCurrentUser';

export function Unauthorized() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isAttempting, setIsAttempting] = useState(false);
  const navigate = useNavigate();
  const { isAuthenticated, role } = useCurrentUser();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsAttempting(true);
    try {
      // Sign in flow only (user creation handled in Supabase)
      await signInWithEmail(email, password);
      // Auth context will update and redirect on success
      navigate('/');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Authentication failed. Please try again.'
      );
      setPassword('');
      setIsAttempting(false);
    }
  };

  // If user is authenticated but lacks permissions
  if (isAuthenticated && !role) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-dark-bg via-dark-surface-1 to-dark-surface-2 relative overflow-hidden flex items-center justify-center">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-error/10 rounded-full blur-3xl opacity-30" />
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl opacity-30" />
        </div>
        
        <div className="relative z-10 max-w-md w-full mx-auto px-4">
          <div className="text-center mb-12">
            <div className="w-16 h-16 bg-gradient-to-br from-error to-error/60 rounded-2xl flex items-center justify-center shadow-lg mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-light-surface mb-2">Access Denied</h1>
            <p className="text-text-secondary">Your role does not have access to this area</p>
          </div>
          
          <div className="card-elevated p-8 space-y-6">
            <div className="p-4 rounded-lg bg-warning/10 border border-warning/30">
              <p className="text-sm text-warning font-medium">Insufficient Permissions</p>
              <p className="text-xs text-warning/70 mt-1">This feature is restricted to specific roles.</p>
            </div>
            <button
              onClick={() => navigate('/')}
              className="btn-primary-large w-full"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Login form for unauthenticated users
  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-bg via-dark-surface-1 to-dark-surface-2 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-accent/10 rounded-full blur-3xl opacity-30" />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl opacity-30" />
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-12 space-y-4">
            {/* Logo */}
            <div className="flex justify-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center shadow-lg color-glow">
                <Zap className="w-8 h-8 text-white fill-current" />
              </div>
            </div>

            {/* Title */}
            <div>
              <h1 className="text-4xl font-bold text-light-surface tracking-tight mb-2">
                ARTIST OS
              </h1>
              <p className="text-text-tertiary text-lg">Premium Creative Dashboard for WES</p>
            </div>

            {/* Subtitle */}
            <p className="text-sm text-text-secondary pt-4 leading-relaxed">
              Your personal command center for releases, analytics, content, and growth. Unlock to begin.
            </p>
          </div>

          {/* Auth Form */}
          <form onSubmit={handleSubmit} className="card-elevated p-8 space-y-6">
            {/* Error State */}
            {error && (
              <div className="p-4 rounded-lg bg-error/10 border border-error/30 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-error shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-error">Authentication Failed</p>
                  <p className="text-xs text-error/70 mt-1">{error}</p>
                </div>
              </div>
            )}


            {/* Email Field */}
            <div className="space-y-2">
              <label className="block">
                <span className="text-sm font-semibold text-text-primary mb-2 block">Email</span>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError(null);
                    }}
                    placeholder="your.email@example.com"
                    className="input-base pl-11"
                    autoFocus
                    disabled={isAttempting}
                    required
                    autoComplete="email"
                  />
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary pointer-events-none" />
                </div>
              </label>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label className="block">
                <span className="text-sm font-semibold text-text-primary mb-2 block">Password</span>
                <div className="relative">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError(null);
                    }}
                    placeholder="••••••••"
                    className="input-base pl-11"
                    disabled={isAttempting}
                    required
                    autoComplete="current-password"
                  />
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary pointer-events-none" />
                </div>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isAttempting || !email.trim() || !password.trim()}
              className="btn-primary-large w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAttempting ? 'Signing In...' : 'Sign In'}
            </button>

            {/* Help Text */}
            <p className="text-xs text-text-tertiary text-center pt-2">
              Secure sign-in powered by Supabase
            </p>
            {/* Closed app: user provisioning is handled in Supabase by admin */}
          </form>

          {/* Features Preview */}
          <div className="mt-12 pt-8 border-t border-border space-y-4">
            <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide text-center mb-4">
              Inside Artist OS
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-3 rounded-lg bg-white/5 border border-white/10 hover:border-primary/30 transition-colors group cursor-default">
                <Music className="w-5 h-5 text-primary mx-auto mb-2 group-hover:scale-110 transition-transform" />
                <p className="text-xs font-medium text-text-secondary">Release Tracker</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-white/5 border border-white/10 hover:border-accent/30 transition-colors group cursor-default">
                <Zap className="w-5 h-5 text-accent mx-auto mb-2 group-hover:scale-110 transition-transform" />
                <p className="text-xs font-medium text-text-secondary">Analytics</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-white/5 border border-white/10 hover:border-primary/30 transition-colors group cursor-default">
                <Music className="w-5 h-5 text-primary mx-auto mb-2 group-hover:scale-110 transition-transform" />
                <p className="text-xs font-medium text-text-secondary">Content Engine</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-white/5 border border-white/10 hover:border-accent/30 transition-colors group cursor-default">
                <Zap className="w-5 h-5 text-accent mx-auto mb-2 group-hover:scale-110 transition-transform" />
                <p className="text-xs font-medium text-text-secondary">Growth Tools</p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-8 border-t border-border text-center">
            <p className="text-xs text-text-tertiary">
              Artist OS by Wes • Secure Access • {new Date().getFullYear()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
