import React, { createContext, useContext, useState, useEffect } from 'react';
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
   */
  signInWithGoogle: () => Promise<'signed-in' | 'cancelled' | 'redirecting'>;
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

  const signInWithGoogle = async (): Promise<'signed-in' | 'cancelled' | 'redirecting'> => {
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
      throw err;
    }
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
