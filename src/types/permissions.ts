/**
 * Centralized Permission System for Artist OS
 * ─────────────────────────────────────────────────────────────────────────────
 * All app-level capabilities are listed here as a `Permission` enum.
 * Role-to-permission mappings live in `ROLE_PERMISSIONS` — ONE place to change
 * when access rules need updating.
 *
 * Usage:
 *   import { hasPermission, Permission } from '../types/permissions';
 *   hasPermission('artist', Permission.POST_CONTENT)  // true
 *   hasPermission('manager', Permission.POST_CONTENT) // false
 *
 * Or use the hook:
 *   const { canPostContent } = usePermissions();
 */

// ─── Permission definitions ───────────────────────────────────────────────────

export enum Permission {
  // Content — viewing
  VIEW_CONTENT           = 'VIEW_CONTENT',
  VIEW_SCHEDULE          = 'VIEW_SCHEDULE',

  // Content — writing
  CREATE_CONTENT         = 'CREATE_CONTENT',
  EDIT_CONTENT           = 'EDIT_CONTENT',
  SCHEDULE_CONTENT       = 'SCHEDULE_CONTENT',
  POST_CONTENT           = 'POST_CONTENT',
  DELETE_CONTENT         = 'DELETE_CONTENT',
  UPLOAD_MEDIA           = 'UPLOAD_MEDIA',

  // Analytics
  VIEW_ANALYTICS         = 'VIEW_ANALYTICS',

  // Releases / tracks
  MANAGE_RELEASES        = 'MANAGE_RELEASES',

  // Tasks
  VIEW_TASKS             = 'VIEW_TASKS',
  CREATE_TASKS           = 'CREATE_TASKS',
  EDIT_TASKS             = 'EDIT_TASKS',
  DELETE_TASKS           = 'DELETE_TASKS',

  // AI / Knowledge Base
  EDIT_KNOWLEDGE_BASE    = 'EDIT_KNOWLEDGE_BASE',
  USE_AI_COACH           = 'USE_AI_COACH',

  // Brand & Collab
  EDIT_BRAND_VAULT       = 'EDIT_BRAND_VAULT',
  EDIT_COLLABORATORS     = 'EDIT_COLLABORATORS',

  // Goals
  MANAGE_GOALS           = 'MANAGE_GOALS',
}

// ─── Role → Permission mapping ────────────────────────────────────────────────
// Add a new role here to wire it up instantly everywhere.

const ARTIST_PERMISSIONS: Permission[] = [
  // Content: full access
  Permission.VIEW_CONTENT,
  Permission.VIEW_SCHEDULE,
  Permission.CREATE_CONTENT,
  Permission.EDIT_CONTENT,
  Permission.SCHEDULE_CONTENT,
  Permission.POST_CONTENT,
  Permission.DELETE_CONTENT,
  Permission.UPLOAD_MEDIA,

  // Analytics
  Permission.VIEW_ANALYTICS,

  // Releases
  Permission.MANAGE_RELEASES,

  // Tasks: full access
  Permission.VIEW_TASKS,
  Permission.CREATE_TASKS,
  Permission.EDIT_TASKS,
  Permission.DELETE_TASKS,

  // AI & KB
  Permission.EDIT_KNOWLEDGE_BASE,
  Permission.USE_AI_COACH,

  // Brand & Collab
  Permission.EDIT_BRAND_VAULT,
  Permission.EDIT_COLLABORATORS,

  // Goals
  Permission.MANAGE_GOALS,
];

const MANAGER_PERMISSIONS: Permission[] = [
  // Content: VIEW-ONLY — cannot create, edit, post, schedule, delete, or upload
  Permission.VIEW_CONTENT,
  Permission.VIEW_SCHEDULE,

  // Analytics: can see dashboards and reports
  Permission.VIEW_ANALYTICS,

  // Tasks: managers CAN create and assign tasks to the artist; cannot delete them
  Permission.VIEW_TASKS,
  Permission.CREATE_TASKS,
  Permission.EDIT_TASKS,

  // AI Coach: managers can use the coach for strategy questions; cannot edit KB
  Permission.USE_AI_COACH,
];

/**
 * Maps a role string to its allowed permissions.
 * To change what a role can do, edit ONLY this object.
 */
export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  artist:  ARTIST_PERMISSIONS,
  manager: MANAGER_PERMISSIONS,
};

// ─── Core utility ─────────────────────────────────────────────────────────────

/**
 * Returns true if the given role has the specified permission.
 * Safe to call with null/undefined role — returns false.
 */
export function hasPermission(
  role: string | null | undefined,
  permission: Permission
): boolean {
  if (!role) return false;
  return (ROLE_PERMISSIONS[role] ?? []).includes(permission);
}

/**
 * Returns true if the given role has ALL of the specified permissions.
 */
export function hasAllPermissions(
  role: string | null | undefined,
  permissions: Permission[]
): boolean {
  return permissions.every((p) => hasPermission(role, p));
}

/**
 * Returns true if the given role has ANY of the specified permissions.
 */
export function hasAnyPermission(
  role: string | null | undefined,
  permissions: Permission[]
): boolean {
  return permissions.some((p) => hasPermission(role, p));
}
