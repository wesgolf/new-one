/**
 * Role-based access control types and constants
 * ─────────────────────────────────────────────────────────────────────────────
 * Role identity lives here. Permission logic lives in `src/types/permissions.ts`.
 * Helper functions below are thin wrappers over `hasPermission()` so the rest
 * of the codebase can keep importing from this file without changes.
 */

import { hasPermission, Permission } from './permissions';

export enum UserRole {
  ARTIST  = 'artist',
  MANAGER = 'manager',
}

export type UserRoleType = UserRole | string;

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: UserRoleType;
  avatar_url?: string;
  text_number?: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Role identity helpers ────────────────────────────────────────────────────

export const isArtist = (role: UserRoleType | null | undefined): boolean =>
  role === UserRole.ARTIST;

export const isManager = (role: UserRoleType | null | undefined): boolean =>
  role === UserRole.MANAGER;

export const isArtistOrManager = (role: UserRoleType | null | undefined): boolean =>
  isArtist(role) || isManager(role);

// ─── Permission helpers ───────────────────────────────────────────────────────
// Each function delegates to hasPermission() so changing a role's access only
// requires editing ROLE_PERMISSIONS in permissions.ts — not these helpers.

/** Tracks */
export const canCreateTrack = (role: UserRoleType | null | undefined): boolean =>
  hasPermission(role, Permission.MANAGE_RELEASES);

export const canEditTrack = (role: UserRoleType | null | undefined): boolean =>
  hasPermission(role, Permission.MANAGE_RELEASES);

/** Content */
export const canViewContent = (role: UserRoleType | null | undefined): boolean =>
  hasPermission(role, Permission.VIEW_CONTENT);

export const canCreateContent = (role: UserRoleType | null | undefined): boolean =>
  hasPermission(role, Permission.CREATE_CONTENT);

export const canEditContent = (role: UserRoleType | null | undefined): boolean =>
  hasPermission(role, Permission.EDIT_CONTENT);

export const canScheduleContent = (role: UserRoleType | null | undefined): boolean =>
  hasPermission(role, Permission.SCHEDULE_CONTENT);

export const canPostContent = (role: UserRoleType | null | undefined): boolean =>
  hasPermission(role, Permission.POST_CONTENT);

export const canDeleteContent = (role: UserRoleType | null | undefined): boolean =>
  hasPermission(role, Permission.DELETE_CONTENT);

export const canUploadMedia = (role: UserRoleType | null | undefined): boolean =>
  hasPermission(role, Permission.UPLOAD_MEDIA);

/** Analytics */
export const canViewAnalytics = (role: UserRoleType | null | undefined): boolean =>
  hasPermission(role, Permission.VIEW_ANALYTICS);

/** Tasks */
export const canViewTasks = (role: UserRoleType | null | undefined): boolean =>
  hasPermission(role, Permission.VIEW_TASKS);

export const canAssignTasks = (role: UserRoleType | null | undefined): boolean =>
  hasPermission(role, Permission.CREATE_TASKS);

export const canEditTasks = (role: UserRoleType | null | undefined): boolean =>
  hasPermission(role, Permission.EDIT_TASKS);

export const canDeleteTasks = (role: UserRoleType | null | undefined): boolean =>
  hasPermission(role, Permission.DELETE_TASKS);

/** Ideas */
export const canReviewIdeas = (role: UserRoleType | null | undefined): boolean =>
  isArtistOrManager(role);

export const canViewAssignments = (role: UserRoleType | null | undefined): boolean =>
  isArtistOrManager(role);

/** Knowledge base & AI */
export const canEditKnowledgeBase = (role: UserRoleType | null | undefined): boolean =>
  hasPermission(role, Permission.EDIT_KNOWLEDGE_BASE);

/** Brand & Collab */
export const canEditCollaborators = (role: UserRoleType | null | undefined): boolean =>
  hasPermission(role, Permission.EDIT_COLLABORATORS);

export const canEditBrandVault = (role: UserRoleType | null | undefined): boolean =>
  hasPermission(role, Permission.EDIT_BRAND_VAULT);

/** Goals */
export const canManageGoals = (role: UserRoleType | null | undefined): boolean =>
  hasPermission(role, Permission.MANAGE_GOALS);

// ─── Display helpers ──────────────────────────────────────────────────────────

export const getRoleDisplayName = (role: UserRoleType | null | undefined): string => {
  switch (role) {
    case UserRole.ARTIST:  return 'Artist';
    case UserRole.MANAGER: return 'Manager';
    default:               return 'User';
  }
};
