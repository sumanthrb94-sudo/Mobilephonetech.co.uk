import { useAuth } from '../context/AuthContext';
import { can, type Capability, type StaffRole } from '../lib/adminRoles';

/**
 * What the signed-in person is allowed to do in the back office.
 *
 * The role is read from the custom claims on the Firebase ID token, which
 * AuthContext resolves on sign-in. Claims can only be set with the Admin SDK
 * (scripts/create-users.mjs, or POST /api/bootstrap-admin), so a user cannot
 * grant themselves a role the way an editable database field would allow.
 *
 * This drives what the UI *shows*. It is not what makes the app secure — the
 * Firestore and Storage rules check the same claims server-side, so a user
 * who fakes a role in devtools still cannot write anything.
 */
export interface AdminAccess {
  /** True for a manager. Kept for the many call sites that ask only this. */
  isAdmin: boolean;
  /** The role itself, when the distinction matters. */
  role: StaffRole;
  /** True for anyone who works here — staff or manager. */
  isStaff: boolean;
  /**
   * Whether this person may do a particular thing.
   *
   * Prefer this over comparing the role. `can('products:archive')` says what
   * the button is for; `role === 'admin'` says only who, and stops being
   * true the day a third role appears.
   */
  can: (capability: Capability) => boolean;
  isLoading: boolean;
}

export function useAdmin(): AdminAccess {
  const { user, isLoading } = useAuth();
  const role: StaffRole = user?.staffRole ?? (user?.isAdmin ? 'admin' : 'none');

  return {
    isAdmin: role === 'admin',
    role,
    isStaff: role !== 'none',
    can: (capability: Capability) => can(role, capability),
    isLoading,
  };
}
