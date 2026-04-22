/**
 * usePermissions — returns all permission booleans for the current user.
 * ─────────────────────────────────────────────────────────────────────────────
 * This is the primary hook for permission-gating UI.
 *
 * Usage:
 *   const { canPostContent, canEditContent } = usePermissions();
 *   {canPostContent && <button>Post Now</button>}
 *
 * For one-off checks:
 *   const { can } = usePermissions();
 *   can(Permission.UPLOAD_MEDIA)
 */

import { useCurrentUser } from './useCurrentUser';
import { hasPermission, Permission } from '../types/permissions';

export function usePermissions() {
  const { role } = useCurrentUser();

  /** Generic escape hatch — check any permission by enum value */
  const can = (permission: Permission): boolean => hasPermission(role, permission);

  return {
    /** Generic checker */
    can,

    // ── Content ──────────────────────────────────────────────────────────────
    /** Both roles can view content library and schedules */
    canViewContent:     can(Permission.VIEW_CONTENT),
    canViewSchedule:    can(Permission.VIEW_SCHEDULE),

    /** Artist-only: creating new content items */
    canCreateContent:   can(Permission.CREATE_CONTENT),

    /** Artist-only: editing existing content */
    canEditContent:     can(Permission.EDIT_CONTENT),

    /** Artist-only: scheduling content to post later */
    canScheduleContent: can(Permission.SCHEDULE_CONTENT),

    /** Artist-only: immediately posting / publishing content */
    canPostContent:     can(Permission.POST_CONTENT),

    /** Artist-only: deleting content items */
    canDeleteContent:   can(Permission.DELETE_CONTENT),

    /** Artist-only: uploading media files */
    canUploadMedia:     can(Permission.UPLOAD_MEDIA),

    // ── Analytics ─────────────────────────────────────────────────────────────
    /** Both roles can view analytics dashboards */
    canViewAnalytics:   can(Permission.VIEW_ANALYTICS),

    // ── Releases / Tracks ─────────────────────────────────────────────────────
    /** Artist-only: creating, editing, and deleting releases */
    canManageReleases:  can(Permission.MANAGE_RELEASES),

    /** Backward-compatible alias used by release and idea screens */
    canCreateTrack:     can(Permission.MANAGE_RELEASES),

    // ── Tasks ─────────────────────────────────────────────────────────────────
    /** Both roles can view tasks */
    canViewTasks:       can(Permission.VIEW_TASKS),

    /** Both roles can create and assign tasks */
    canCreateTasks:     can(Permission.CREATE_TASKS),

    /** Both roles can edit task fields (status, priority, etc.) */
    canEditTasks:       can(Permission.EDIT_TASKS),

    /** Artist-only: deleting tasks */
    canDeleteTasks:     can(Permission.DELETE_TASKS),

    // ── AI & Knowledge Base ───────────────────────────────────────────────────
    /** Artist-only: adding/editing/deleting KB cards in AI Coach */
    canEditKnowledgeBase: can(Permission.EDIT_KNOWLEDGE_BASE),

    /** Both roles can chat with the AI coach */
    canUseAICoach:      can(Permission.USE_AI_COACH),

    // ── Brand & Collab ────────────────────────────────────────────────────────
    /** Artist-only: syncing / editing Brand Vault data */
    canEditBrandVault:  can(Permission.EDIT_BRAND_VAULT),

    /** Artist-only: editing collaborators on releases / ideas */
    canEditCollaborators: can(Permission.EDIT_COLLABORATORS),

    // ── Goals ─────────────────────────────────────────────────────────────────
    /** Artist-only: creating / editing / deleting goals */
    canManageGoals:     can(Permission.MANAGE_GOALS),
  };
}

// Re-export Permission enum so consumers only need one import
export { Permission };
