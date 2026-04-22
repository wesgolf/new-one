/**
 * useCurrentUserRole — convenience hook exposing the current user's role
 * and all derived permission helpers in one import.
 *
 * For most UI gating, prefer `usePermissions()` which has clearer naming.
 * This hook is kept for backward-compatibility and role-identity checks.
 *
 * Usage:
 *   const { role, isArtist, canCreateContent } = useCurrentUserRole();
 *   const { canPostContent, canUploadMedia }   = usePermissions();
 */

import { useCurrentUser } from './useCurrentUser';
import { usePermissions } from './usePermissions';
import {
  UserRole,
  isArtist as checkArtist,
  isManager as checkManager,
  isArtistOrManager as checkArtistOrManager,
  getRoleDisplayName,
} from '../types/roles';

export function useCurrentUserRole() {
  const { role, profile, isLoading, isAuthenticated } = useCurrentUser();
  const permissions = usePermissions();

  return {
    role,
    roleDisplayName: getRoleDisplayName(role),
    isLoading,
    isAuthenticated,

    // ── Role identity booleans ────────────────────────────────────────────────
    isArtist:        checkArtist(role),
    isManager:       checkManager(role),
    isArtistOrManager: checkArtistOrManager(role),

    // ── All permissions (spread from usePermissions) ───────────────────────────
    ...permissions,

    // ── Profile ───────────────────────────────────────────────────────────────
    profile,
    avatarUrl: profile?.avatar_url ?? null,
    fullName:  profile?.full_name  ?? null,
    email:     profile?.email      ?? null,
  };
}

export { UserRole };
