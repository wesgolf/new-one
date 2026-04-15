/**
 * Authentication Context
 * Manages current user, their profile, and role state globally
 */

import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { UserProfile, UserRoleType } from '../types/roles';
import { getCurrentUserWithProfile, onAuthStateChanged } from '../lib/auth';

export interface AuthContextType {
  authUser: User | null;
  profile: UserProfile | null;
  role: UserRoleType | null;
  isLoading: boolean;
  error: Error | null;
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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch the current user's profile
  const fetchUserProfile = async () => {
    try {
      const data = await getCurrentUserWithProfile();
      if (data) {
        setAuthUser(data.authUser);
        setProfile(data.profile ?? null); // profile may be null if no DB row yet
      } else {
        setAuthUser(null);
        setProfile(null);
      }
      setError(null);
    } catch (err) {
      // Don't log expected "no session" state as an error
      setAuthUser(null);
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Listen for auth state changes
  useEffect(() => {
    // Initial fetch
    fetchUserProfile();

    // Subscribe to auth changes
    const unsubscribe = onAuthStateChanged((user) => {
      if (user) {
        fetchUserProfile();
      } else {
        setAuthUser(null);
        setProfile(null);
        setIsLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const value: AuthContextType = {
    authUser,
    profile,
    role: profile?.role ?? null,
    isLoading,
    error,
    // Authenticated as long as we have an auth user — profile row may not exist yet
    isAuthenticated: !!authUser,
    refetchProfile: fetchUserProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
