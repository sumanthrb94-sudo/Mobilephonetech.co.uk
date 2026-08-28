import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  GoogleAuthProvider,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  fetchSignInMethodsForEmail,
  linkWithCredential,
  type AuthCredential,
  type User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db, COL } from '../lib/firebase';

export interface User {
  id: string;
  email: string;
  fullName: string;
  isGuest?: boolean;
  /** From the `admin` custom claim on the ID token, not a database field. */
  isAdmin?: boolean;
  /**
   * Sign-in providers on the account, e.g. ['google.com'] or ['password'].
   * A Google-only account has no password, so offering to change one is
   * offering something that does not exist.
   */
  providers?: string[];
}

/**
 * The Firebase user plus the claims we care about. Supabase exposed a
 * `session` object; the nearest Firebase equivalent is the signed-in user and
 * its ID token, so `session` is kept as the raw FirebaseUser to avoid churning
 * every consumer that only ever used it as a truthiness check.
 */
export type Session = FirebaseUser;

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, fullName: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  /**
   * Resolves with what actually happened, because the caller has to react
   * differently: 'signed-in' should close the modal, 'cancelled' should leave
   * it open untouched, and 'redirecting' means the page is about to unload.
   * 'needs-link' means the address already has a password account — see
   * pendingLinkEmail and completeGoogleLink below.
   */
  signInWithGoogle: () => Promise<'signed-in' | 'cancelled' | 'redirecting' | 'needs-link'>;
  /**
   * Which providers an address is already registered with, e.g. ['password']
   * or ['google.com'].
   *
   * Returns [] when it cannot tell, which is the common case rather than the
   * exception: Firebase's Email Enumeration Protection — on by default for
   * projects created since late 2023 — makes this endpoint return nothing so
   * that a stranger cannot probe which addresses have accounts. Callers must
   * treat [] as "unknown" and fall back to generic wording, never as "no
   * account exists".
   */
  signInMethodsFor: (email: string) => Promise<string[]>;
  /**
   * Set when signInWithGoogle returned 'needs-link': the address whose
   * existing password account has to be proved before Google can be attached.
   */
  pendingLinkEmail: string | null;
  /**
   * Finish the link started by a 'needs-link' outcome — verify the password on
   * the existing account, then attach the held Google credential so either
   * method signs in from now on.
   */
  completeGoogleLink: (password: string) => Promise<void>;
  /** Abandon a pending link, e.g. the user closed the modal. */
  cancelGoogleLink: () => void;
  continueAsGuest: (email: string) => void;
  /** Force-refresh the ID token, e.g. right after a role change. */
  refreshClaims: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function toUser(fbUser: FirebaseUser): Promise<User> {
  // getIdTokenResult reads the cached token; claims set server-side land here
  // only after a refresh, which is what refreshClaims() forces.
  let isAdmin = false;
  try {
    const token = await fbUser.getIdTokenResult();
    isAdmin = token.claims.admin === true;
  } catch {
    isAdmin = false;
  }

  return {
    id: fbUser.uid,
    email: fbUser.email ?? '',
    fullName: fbUser.displayName ?? (fbUser.email ? fbUser.email.split('@')[0] : 'User'),
    isAdmin,
    // Optional chain: providerData is always present on a real Firebase user,
    // but a missing one must not take sign-in down over a display detail.
    providers: fbUser.providerData?.map(p => p.providerId) ?? [],
  };
}

/**
 * Firebase Auth does not create a database record for a user, so the profile
 * document is written on first sign-in. merge:true keeps an existing role and
 * saved address intact — this runs on every sign-in, not just registration.
 */
async function ensureProfile(fbUser: FirebaseUser, fullName?: string) {
  try {
    const ref = doc(db, COL.users, fbUser.uid);
    const snap = await getDoc(ref);
    if (snap.exists()) return;
    await setDoc(ref, {
      fullName: fullName ?? fbUser.displayName ?? fbUser.email?.split('@')[0] ?? 'User',
      email: fbUser.email ?? '',
      // `role` is readable but never trusted for authorization — the admin
      // custom claim on the token is what the security rules check. This is
      // here so the console can show who is staff.
      role: 'customer',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch {
    // A missing profile must not block sign-in; the rest of the app treats it
    // as absent and falls back to the auth record.
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        setSession(fbUser);
        setUser(await toUser(fbUser));
        void ensureProfile(fbUser);
      } else {
        setSession(null);
        setUser(null);
      }
      setIsLoading(false);
    }, () => {
      // Misconfigured credentials surface here rather than throwing; treat it
      // as signed out so the app still renders.
      setSession(null);
      setUser(null);
      setIsLoading(false);
    });

    return () => unsub();
  }, []);

  const login = async (email: string, password: string) => {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    await ensureProfile(cred.user);
  };

  const signup = async (email: string, password: string, fullName: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    // Firebase stores no metadata at creation, so the display name is a
    // second call. Do it before the profile write so both agree.
    if (fullName) await updateProfile(cred.user, { displayName: fullName });
    await ensureProfile(cred.user, fullName);
    setUser(await toUser(cred.user));
  };

  /**
   * The Google credential Firebase refused because the address already has a
   * password account, held until the password proves the two are the same
   * person. A ref rather than state: it must survive re-renders but nothing
   * renders from it, and it must never be serialised anywhere.
   */
  const pendingCredentialRef = useRef<AuthCredential | null>(null);
  const [pendingLinkEmail, setPendingLinkEmail] = useState<string | null>(null);

  const signInWithGoogle = async (): Promise<'signed-in' | 'cancelled' | 'redirecting' | 'needs-link'> => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      const cred = await signInWithPopup(auth, provider);
      await ensureProfile(cred.user);
      // Unlike Supabase's signInWithOAuth, the popup flow resolves in place:
      // the user is signed in and the caller still has a live component to
      // update. Returning the outcome is what lets it close the modal.
      setUser(await toUser(cred.user));
      return 'signed-in';
    } catch (err) {
      const code = (err as { code?: string })?.code ?? '';
      // A blocked popup is a browser setting, not a failure worth surfacing —
      // fall back to the redirect flow, which no blocker interferes with.
      if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment') {
        await signInWithRedirect(auth, provider);
        return 'redirecting';
      }
      // Closing the popup is a deliberate cancel, not an error.
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return 'cancelled';

      // The address already has a password account. Firebase's "one account
      // per email address" setting is what stops this becoming a second,
      // duplicate identity — but on its own it just fails, leaving a customer
      // who genuinely owns both stuck at a dead end. Hold the Google
      // credential so one password entry can attach it to the existing
      // account instead.
      if (code === 'auth/account-exists-with-different-credential') {
        const held = GoogleAuthProvider.credentialFromError(err as never);
        const email = (err as { customData?: { email?: string } })?.customData?.email ?? '';
        if (held && email) {
          pendingCredentialRef.current = held;
          setPendingLinkEmail(email);
          return 'needs-link';
        }
        // No recoverable credential (older SDK shapes, or a provider we did
        // not initiate) — fall through so the caller shows the plain message.
      }
      throw err;
    }
  };

  const signInMethodsFor = async (email: string): Promise<string[]> => {
    try {
      return await fetchSignInMethodsForEmail(auth, email.trim().toLowerCase());
    } catch {
      // Enumeration protection, an offline client, or a malformed address —
      // all of them mean "cannot tell", never "no account".
      return [];
    }
  };

  const completeGoogleLink = async (password: string) => {
    const credential = pendingCredentialRef.current;
    const email = pendingLinkEmail;
    if (!credential || !email) throw new Error('There is no sign-in waiting to be linked.');

    // Proving the password is what authorises the link. Without it anyone who
    // knew an address could attach their own Google account to it and take
    // the account over.
    const signedIn = await signInWithEmailAndPassword(auth, email, password);
    await linkWithCredential(signedIn.user, credential);

    pendingCredentialRef.current = null;
    setPendingLinkEmail(null);

    await ensureProfile(signedIn.user);
    // Re-read after linking so providers[] reflects both methods immediately.
    setUser(await toUser(signedIn.user));
  };

  const cancelGoogleLink = () => {
    pendingCredentialRef.current = null;
    setPendingLinkEmail(null);
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setSession(null);
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email, {
      url: `${window.location.origin}/account`,
    });
  };

  const continueAsGuest = (email: string) => {
    setUser({
      id: 'guest_' + Math.random().toString(36).slice(2, 9),
      email,
      fullName: 'Guest',
      isGuest: true,
    });
  };

  const refreshClaims = async () => {
    const current = auth.currentUser;
    if (!current) return;
    await current.getIdToken(true);
    setUser(await toUser(current));
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      isAuthenticated: !!session,
      isLoading,
      login,
      signup,
      logout,
      resetPassword,
      signInWithGoogle,
      signInMethodsFor,
      pendingLinkEmail,
      completeGoogleLink,
      cancelGoogleLink,
      continueAsGuest,
      refreshClaims,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
