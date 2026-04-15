/**
 * Hook to access current user and auth context
 */

import { useContext } from 'react';
import { AuthContext, AuthContextType } from '../context/AuthContext';

export const useCurrentUser = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useCurrentUser must be used within AuthProvider');
  }
  return context;
};
