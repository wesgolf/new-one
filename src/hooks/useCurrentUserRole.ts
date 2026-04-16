/**
 * useCurrentUserRole — convenience hook exposing the current user's role
 * and all derived permission helpers in one import.
 *
 * Usage:
 *   const { role, isArtist, canCreateTrack } = useCurrentUserRole();
 */

import { useCurrentUser } from './useCurrentUser';
import {
  UserRole,
  isArtist as checkArtist,
  isManager as checkManager,
  isArtistOrManager as checkArtistOrManager,
  canCreateTrack as checkCanCreateTrack,
  canEditTrack as checkCanEditTrack,
  canCreateContent as checkCanCreateContent,
  canAssignTasks as checkCanAssignTasks,
  canViewAnalytics as checkCanViewAnalytics,
  getRoleDisplayName,
} from '../types/roles';

export function useCurrentUserRole() {
  const { role, profile, isLoading, isAuthenticated } = useCurrentUser();

  return {
    role,
    roleDisplayName: getRoleDisplayName(role),
    isLoading,
    isAuthenticated,

    // Role booleans
    isArtist: checkArtist(role),
    isManager: checkManager(role),
    isArtistOrManager: checkArtistOrManager(role),

    // Permission helpers
    canCreateTrack: checkCanCreateTrack(role),
    canEditTrack: checkCanEditTrack(role),
    canCreateContent: checkCanCreateContent(role),
    canAssignTasks: checkCanAssignTasks(role),
    canViewAnalytics: checkCanViewAnalytics(role),

    // Profile
    profile,
    avatarUrl: profile?.avatar_url ?? null,
    fullName: profile?.full_name ?? null,
    email: profile?.email ?? null,
  };
}

export { UserRole };
