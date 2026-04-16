/**
 * Role-based access control types and constants
 */

export enum UserRole {
  ARTIST = 'artist',
  MANAGER = 'manager',
}

export type UserRoleType = UserRole | string;

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: UserRoleType;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Role permission helpers
 */

export const isArtist = (role: UserRoleType | null | undefined): boolean => {
  return role === UserRole.ARTIST;
};

export const isManager = (role: UserRoleType | null | undefined): boolean => {
  return role === UserRole.MANAGER;
};

export const isArtistOrManager = (role: UserRoleType | null | undefined): boolean => {
  return isArtist(role) || isManager(role);
};

/**
 * Permission helpers that map roles to specific capabilities
 */

export const canCreateTrack = (role: UserRoleType | null | undefined): boolean => {
  // Only artists can create/add new tracks
  return isArtist(role);
};

export const canEditTrack = (role: UserRoleType | null | undefined): boolean => {
  // Only artists can edit tracks
  return isArtist(role);
};

export const canCreateContent = (role: UserRoleType | null | undefined): boolean => {
  // Both artists and managers can create content
  return isArtistOrManager(role);
};

export const canAssignTasks = (role: UserRoleType | null | undefined): boolean => {
  // Only managers can assign tasks
  return isManager(role);
};

export const canViewAnalytics = (role: UserRoleType | null | undefined): boolean => {
  // Both can view analytics
  return isArtistOrManager(role);
};

export const canEditCollaborators = (role: UserRoleType | null | undefined): boolean => {
  // Only managers can edit collaborators
  return isManager(role);
};

/**
 * Role descriptions for UI display
 */
export const getRoleDisplayName = (role: UserRoleType | null | undefined): string => {
  switch (role) {
    case UserRole.ARTIST:
      return 'Artist';
    case UserRole.MANAGER:
      return 'Manager';
    default:
      return 'User';
  }
};
