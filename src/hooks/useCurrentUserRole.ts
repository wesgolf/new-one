/**
 * Hook to access current user's role
 */

import { useCurrentUser } from './useCurrentUser';
import { UserRoleType } from '../types/roles';

export const useCurrentUserRole = (): UserRoleType | null => {
  const { role } = useCurrentUser();
  return role;
};
