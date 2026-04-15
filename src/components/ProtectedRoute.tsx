/**
 * Protected Route Component
 * Ensures only authenticated users can access this route
 */

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useCurrentUser } from '../hooks/useCurrentUser';

interface ProtectedRouteProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  fallback,
}) => {
  const { isAuthenticated, isLoading } = useCurrentUser();

  if (isLoading) {
    return fallback || <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};
