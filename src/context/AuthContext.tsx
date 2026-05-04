/**
 * Authentication Context
 *
 * Auth flow:
 * 1. On mount, subscribe to supabase.auth.onAuthStateChange.
 *    Supabase fires INITIAL_SESSION synchronously with the session from
 *    localStorage (or null in incognito / after sign-out).
 * 2. For every event (SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED, etc.) we
 *    receive a server-validated `session` object — no stale local state.
 * 3. When a valid session arrives we unlock routing immediately, then fetch
 *    the profile row in the background.
 * 4. When the session is null (SIGNED_OUT / no session) we clear state.
 *
 * Why NOT calling getSession()/getUser() separately:
 * - Avoids a race between the direct call and the subscription callback.
 * - Protected routes only wait for auth session resolution, not profile I/O.
 */

import React, { createContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { UserProfile, UserRoleType } from '../types/roles';
import { getUserProfile } from '../lib/auth';
import { supabase } from '../lib/supabase';

export interface AuthContextType {
  authUser: User | null;
  profile: UserProfile | null;
  role: UserRoleType | null;
  isLoading: boolean;
  error: Error | null;
  /** True only when we have a server-validated Supabase session. */
  isAuthenticated: boolean;
  refetchProfile: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  // Start loading so ProtectedRoute shows a spinner until auth state is known
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch the profile row for a given user. Called after auth resolution.
  const loadProfile = useCallback(async (user: User) => {
    try {
      const data = await getUserProfile(user.id);
      setProfile(data);
      setError(null);
    } catch (err) {
      setProfile(null);
      setError(err instanceof Error ? err : new Error('Failed to load profile'));
    }
  }, []);

  // Re-fetch profile without changing the auth user (e.g. after profile update)
  const refetchProfile = useCallback(async () => {
    if (!authUser) return;
    await loadProfile(authUser);
  }, [authUser, loadProfile]);

  useEffect(() => {
    let cancelled = false;

    // ── Step 1: Resolve initial auth state via getSession() ──────────────────
    // We do NOT rely on INITIAL_SESSION from onAuthStateChange for the initial
    // state because React 18 StrictMode double-invokes effects: the first
    // subscription fires INITIAL_SESSION and is immediately unsubscribed during
    // cleanup, then the second subscription never receives INITIAL_SESSION again,
    // leaving isLoading stuck at true forever.
    //
    // getSession() is a plain Promise — cancellable, StrictMode-safe, and
    // guaranteed to resolve even in incognito (returns null, no network needed).
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      if (session?.user) {
        setAuthUser(session.user);
        setIsLoading(false);
        void loadProfile(session.user);
      } else {
        setAuthUser(null);
        setProfile(null);
        setIsLoading(false);
      }
    }).catch(() => {
      if (!cancelled) setIsLoading(false);
    });

    // ── Step 2: Subscribe to subsequent auth changes ──────────────────────────
    // Skip INITIAL_SESSION — initial state is already handled above.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (cancelled || event === 'INITIAL_SESSION') return;
        if (session?.user) {
          setAuthUser(session.user);
          if (!cancelled) setIsLoading(false);
          void loadProfile(session.user);
        } else {
          // SIGNED_OUT / TOKEN_REFRESH_FAILURE etc.
          setAuthUser(null);
          setProfile(null);
          if (!cancelled) setIsLoading(false);
        }
      }
    );

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  const value: AuthContextType = {
    authUser,
    profile,
    role: profile?.role ?? null,
    isLoading,
    error,
    // Authenticated only when there is a server-validated Supabase user
    isAuthenticated: !!authUser,
    refetchProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
