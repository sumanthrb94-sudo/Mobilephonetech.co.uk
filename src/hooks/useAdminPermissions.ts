import { useAuth } from '../context/AuthContext';

/**
 * Capability gate for sensitive admin UI.  This is intentionally separate
 * from `useAdmin()`: staff can run fulfilment without seeing buy prices or GP.
 */
export function useAdminPermissions(): { isAdmin: boolean; isOwner: boolean; canViewProfit: boolean; isLoading: boolean } {
  const { user, isLoading } = useAuth();
  return {
    isAdmin: Boolean(user?.isAdmin),
    isOwner: Boolean(user?.isOwner),
    canViewProfit: Boolean(user?.canViewProfit),
    isLoading,
  };
}
