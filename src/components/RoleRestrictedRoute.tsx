/**
 * Role Restricted Route Component
 * Ensures only users with specific roles can access this route
 */

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { UserRoleType } from '../types/roles';

interface RoleRestrictedRouteProps {
  children: React.ReactNode;
  allowedRoles: UserRoleType[];
  fallback?: React.ReactNode;
}

export const RoleRestrictedRoute: React.FC<RoleRestrictedRouteProps> = ({
  children,
  allowedRoles,
  fallback,
}) => {
  const { role, isAuthenticated, isLoading } = useCurrentUser();

  if (isLoading) {
    return fallback || <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!role || !allowedRoles.includes(role)) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};
