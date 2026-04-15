/**
 * Supabase Authentication utilities
 */

import { supabase } from './supabase';
import { UserProfile } from '../types/roles';

/**
 * Sign up a new user with email and password
 */
export const signUpWithEmail = async (email: string, password: string, fullName?: string) => {
  const options: any = { email, password };
  if (fullName) {
    options.user_metadata = { full_name: fullName };
  }

  const { data, error } = await supabase.auth.signUp(options as any);
  if (error) throw error;
  return data;
};

/**
 * Sign in with email and password
 */
export const signInWithEmail = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  if (error) throw error;
  return data;
};

/**
 * Sign out the current user
 */
export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

/**
 * Get the current authenticated user
 */
export const getCurrentAuthUser = async () => {
  // Use getSession first — it reads from local storage without a network call
  // and never throws when no session exists.
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData?.session) return null;

  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) return null; // no session or invalid token — treat as unauthenticated
    return data?.user ?? null;
  } catch {
    return null;
  }
};

/**
 * Get user profile by ID (fetches from profiles table).
 * Returns null if no profile row exists yet — use maybeSingle() to avoid 406.
 */
export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.warn('Error fetching profile:', error.message);
    return null;
  }
  return data as UserProfile | null;
};

/**
 * Get current user with their profile and role.
 * Profile may be null if the profiles table row hasn't been created yet.
 */
export const getCurrentUserWithProfile = async () => {
  const user = await getCurrentAuthUser();
  if (!user) return null;

  const profile = await getUserProfile(user.id);
  return {
    authUser: user,
    profile, // may be null — caller should handle gracefully
  };
};

/**
 * Create or update user profile (called after signup)
 * This is typically handled by a database trigger, but we provide this for manual updates
 */
export const upsertUserProfile = async (
  userId: string,
  data: Partial<Omit<UserProfile, 'id'>>
) => {
  const { data: profile, error } = await supabase
    .from('profiles')
    .upsert(
      {
        id: userId,
        ...data,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    )
    .select()
    .single();
  
  if (error) throw error;
  return profile as UserProfile;
};

/**
 * Watch for auth state changes
 */
export const onAuthStateChanged = (callback: (user: any) => void) => {
  const { data: authListener } = supabase.auth.onAuthStateChange(
    (_event, session) => {
      callback(session?.user ?? null);
    }
  );
  
  return () => authListener?.subscription.unsubscribe();
};
