/**
 * Staff permissions are derived solely from Firebase custom claims.  A
 * Firestore profile is useful for displaying a name, but is deliberately not
 * an authority boundary: a browser must never be able to grant itself access
 * to commercially sensitive figures.
 *
 * `owner` is the initial finance role.  More roles can be added later without
 * changing every screen; the UI asks this module for a capability, not for an
 * email address or a role name.
 */
export type AdminRole = 'owner' | 'operations' | 'support';

export interface AdminPermissions {
  isAdmin: boolean;
  role: AdminRole | null;
  canViewProfit: boolean;
}

type Claims = Record<string, unknown>;

export function adminPermissionsFromClaims(claims: Claims | null | undefined): AdminPermissions {
  const isAdmin = claims?.admin === true;
  if (!isAdmin) return { isAdmin: false, role: null, canViewProfit: false };

  const role: AdminRole = claims?.role === 'owner'
    ? 'owner'
    : claims?.role === 'support'
      ? 'support'
      : 'operations';

  // Finance is deliberately opt-in.  Giving a new staff member the `admin`
  // claim lets them operate the shop but never reveals supplier cost or GP.
  // An owner always has it; `finance:true` leaves room for a future accountant
  // role without making every operational staff member financially privileged.
  const canViewProfit = role === 'owner' || claims?.finance === true;
  return { isAdmin, role, canViewProfit };
}
