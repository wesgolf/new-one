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

/** Granular login failure reasons. */
export type LoginErrorCode =
  | 'invalid_email'
  | 'wrong_credentials'
  | 'network_error'
  | 'timeout'
  | 'server_error'
  | 'unknown';

export class LoginError extends Error {
  constructor(
    public readonly code: LoginErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'LoginError';
  }
}

const LOGIN_TIMEOUT_MS = 15_000; // increased from 10 s to reduce false timeouts

/**
 * Sign in with email and password.
 * Throws a LoginError with a granular code + human-readable message instead of
 * the raw Supabase error string (which is always "Invalid login credentials").
 */
export const signInWithEmail = async (email: string, password: string) => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  console.group('[Auth] signInWithEmail attempt');
  console.log('Email:', email);
  console.log('Timeout budget:', LOGIN_TIMEOUT_MS, 'ms');
  console.time('[Auth] signInWithEmail duration');

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      console.error('[Auth] ⏱ Request timed out after', LOGIN_TIMEOUT_MS, 'ms');
      console.log('[Auth] Possible causes: wrong Supabase URL, network blocked, wrong anon key format');
      reject(new LoginError('timeout', 'Sign-in timed out. Check your connection and try again.'));
    }, LOGIN_TIMEOUT_MS);
  });

  try {
    console.log('[Auth] Calling supabase.auth.signInWithPassword…');
    const { data, error } = await Promise.race([
      supabase.auth.signInWithPassword({ email, password }),
      timeoutPromise,
    ]);

    console.timeEnd('[Auth] signInWithEmail duration');

    if (error) {
      const msg    = error.message?.toLowerCase() ?? '';
      const status = (error as any).status ?? 0;
      console.error('[Auth] Supabase error response:', { message: error.message, status, code: (error as any).code });

      if (
        status === 400 ||
        msg.includes('invalid login') ||
        msg.includes('invalid credentials') ||
        msg.includes('wrong password') ||
        msg.includes('incorrect')
      ) {
        throw new LoginError('wrong_credentials', 'Incorrect email or password. Please try again.');
      }
      if (status >= 500 || msg.includes('server error') || msg.includes('internal')) {
        throw new LoginError('server_error', 'A server error occurred. Please try again in a moment.');
      }
      if (
        msg.includes('network') ||
        msg.includes('fetch') ||
        msg.includes('failed to fetch') ||
        msg.includes('connection')
      ) {
        throw new LoginError('network_error', 'Network error — please check your connection and retry.');
      }
      if (status === 408 || msg.includes('timeout') || msg.includes('timed out')) {
        throw new LoginError('timeout', 'Sign-in timed out. Check your connection and try again.');
      }
      throw new LoginError('unknown', 'Sign-in failed. Please try again.');
    }

    console.log('[Auth] ✅ Sign-in successful. User:', data?.user?.id);
    console.groupEnd();
    return data;
  } catch (err) {
    console.timeEnd('[Auth] signInWithEmail duration');
    if (err instanceof LoginError) {
      console.error('[Auth] LoginError thrown:', err.code, err.message);
      console.groupEnd();
      throw err;
    }
    // Fetch-level failure (offline, DNS, CORS, etc.)
    const raw = err as Error;
    console.error('[Auth] Raw fetch-level error:', raw?.name, raw?.message, raw);
    const msg = raw?.message?.toLowerCase() ?? '';
    if (msg.includes('network') || msg.includes('fetch') || msg.includes('failed to fetch')) {
      console.groupEnd();
      throw new LoginError('network_error', 'Network error — please check your connection and retry.');
    }
    console.groupEnd();
    throw new LoginError('unknown', 'An unexpected error occurred. Please try again.');
  } finally {
    clearTimeout(timeoutId);
  }
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
