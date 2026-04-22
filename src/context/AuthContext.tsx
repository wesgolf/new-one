/**
 * Authentication Context
 *
 * Auth flow:
 * 1. On mount, subscribe to supabase.auth.onAuthStateChange.
 *    Supabase fires INITIAL_SESSION synchronously with the session from
 *    localStorage (or null in incognito / after sign-out).
 * 2. For every event (SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED, etc.) we
 *    receive a server-validated `session` object — no stale local state.
 * 3. When a valid session arrives we fetch the profile row from the DB.
 * 4. When the session is null (SIGNED_OUT / no session) we clear state.
 *
 * Why NOT calling getSession()/getUser() separately:
 * - Avoids a race between the direct call and the subscription callback.
 * - INITIAL_SESSION fires before any protected route renders, so isLoading
 *   is false by the time the router evaluates ProtectedRoute.
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

  // Fetch the profile row for a given user. Called from the auth listener.
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
    // Subscribe to Supabase auth state changes.
    // INITIAL_SESSION fires immediately (synchronous) with the current session,
    // so isLoading transitions to false before any route renders.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          // Session is server-validated — safe to treat as authenticated
          setAuthUser(session.user);
          await loadProfile(session.user);
        } else {
          // No session (incognito, signed out, expired + non-refreshable)
          setAuthUser(null);
          setProfile(null);
        }
        // Auth state is now known — stop showing the loading spinner
        setIsLoading(false);
      }
    );

    return () => subscription.unsubscribe();
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
