/**
 * ProtectedRoute — guards all routes that require a valid Supabase session.
 *
 * How it works:
 * 1. AuthProvider (mounted in main.tsx) subscribes to supabase.auth.onAuthStateChange.
 *    It fires INITIAL_SESSION immediately on mount with the session from localStorage
 *    (or null in incognito / after sign-out).  isLoading starts true and is set false
 *    ONLY after auth state is confirmed — so no route ever renders before auth is known.
 * 2. While loading → show a spinner (no flash of the protected content).
 * 3. No valid session → redirect to /login.
 * 4. Valid session → render children.
 *
 * Sessions are server-validated via onAuthStateChange (not just a localStorage read),
 * so a user opening /dashboard in incognito will get null session → redirected to /login.
 */

import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { UserRoleType } from '../types/roles';

interface ProtectedRouteProps {
  children?: React.ReactNode;
  /** If set, also require this role (or array of roles). */
  requiredRole?: UserRoleType | UserRoleType[];
  fallback?: React.ReactNode;
}

const LoadingScreen = () => (
  <div className="flex items-center justify-center min-h-screen bg-background">
    <div className="flex flex-col items-center gap-3">
      <span className="text-[13px] font-bold tracking-[0.18em] text-zinc-400 uppercase animate-pulse">WES</span>
    </div>
  </div>
);

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole,
  fallback,
}) => {
  const { isAuthenticated, isLoading, role } = useCurrentUser();

  // Step 1: Wait until auth state is resolved (avoids flash of protected content)
  if (isLoading) {
    return <>{fallback ?? <LoadingScreen />}</>;
  }

  // Step 2: Redirect unauthenticated users to the login page
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Step 3: Role guard (optional) — redirect insufficient roles to /dashboard
  if (requiredRole) {
    const allowed = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    if (!role || !allowed.includes(role as UserRoleType)) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  // Step 4: Authenticated (and role-satisfied) — render children or nested <Outlet>
  return <>{children ?? <Outlet />}</>;
};
