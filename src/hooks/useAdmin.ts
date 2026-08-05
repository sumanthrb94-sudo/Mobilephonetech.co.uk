import { useAuth } from '../context/AuthContext';

/**
 * Whether the signed-in user is an admin.
 *
 * Read from the `admin` custom claim on the Firebase ID token, which
 * AuthContext resolves on sign-in. The claim can only be set with the Admin
 * SDK (see scripts/create-users.mjs), so a user cannot grant it to themselves
 * the way an editable database field would allow.
 *
 * This drives what the UI *shows*. It is not what makes the app secure — the
 * Firestore and Storage rules check the same claim server-side, so a user who
 * fakes this flag in devtools still cannot write anything.
 */
export function useAdmin(): { isAdmin: boolean; isLoading: boolean } {
  const { user, isLoading } = useAuth();
  return { isAdmin: Boolean(user?.isAdmin), isLoading };
}
