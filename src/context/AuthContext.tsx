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
  signInWithPhoneNumber,
  linkWithPhoneNumber,
  sendEmailVerification,
  EmailAuthProvider,
  RecaptchaVerifier,
  type ConfirmationResult,
  type AuthCredential,
  type User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db, COL } from '../lib/firebase';
import { toE164, formatPhoneForDisplay, DEFAULT_COUNTRY } from '../utils/phoneNumber';

export interface User {
  id: string;
  email: string;
  /**
   * Whether the address has been confirmed by clicking the link.
   *
   * Informational, never a gate. Blocking checkout on an unverified address
   * would cost far more in abandoned orders than it saves — the point is to
   * catch a typo before the order confirmation goes to nobody, not to police
   * anyone. A phone-only account has no email, so this is false and irrelevant.
   */
  emailVerified?: boolean;
  /** E.164, present only once a number has been verified by SMS. */
  phoneNumber?: string | null;
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
  /**
   * Send a one-time code by SMS and hold the confirmation until it is entered.
   *
   * `containerId` is the id of an element the invisible reCAPTCHA can mount
   * into. Firebase requires one; without it signInWithPhoneNumber throws
   * before any SMS is sent.
   *
   * When someone is already signed in this LINKS the number to their existing
   * account rather than starting a new one — the whole point, since a phone
   * sign-in that ignored the current session would mint a second uid for a
   * customer who already has one.
   */
  /** `country` is the dial code the customer picked, e.g. '44' or '91'. */
  startPhoneSignIn: (phone: string, containerId: string, country?: string) => Promise<void>;
  /**
   * Verify the SMS code, completing either the sign-in or the link.
   *
   * Reports whether the resulting account has an email address. A phone-only
   * account cannot receive an order confirmation, a receipt or a return
   * update — so the caller uses this to decide whether to ask for one.
   */
  confirmPhoneCode: (code: string) => Promise<{ hasEmail: boolean }>;
  /** The number a code was sent to, in E.164, or null if none is pending. */
  pendingPhone: string | null;
  /** Drop a pending phone verification and tear down its reCAPTCHA. */
  cancelPhoneSignIn: () => void;
  /**
   * Re-send the address confirmation link to the signed-in user.
   *
   * Resolves quietly when there is nobody signed in or the address is already
   * confirmed — a second click on "resend" should never produce an error.
   */
  resendVerification: () => Promise<void>;
  /**
   * Attach an email and password to the account someone is already signed into
   * — the mirror of adding a mobile to an email account.
   *
   * This is what stops a phone-first customer being unreachable: without an
   * address there is nowhere to send an order confirmation, and without a
   * password they can only ever get back in by burning another SMS.
   */
  linkEmailPassword: (email: string, password: string) => Promise<void>;
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
    emailVerified: fbUser.emailVerified ?? false,
    phoneNumber: fbUser.phoneNumber ?? null,
    // A phone-only account has no email and no display name, so the masked
    // number is the only thing left to greet them by.
    fullName: fbUser.displayName
      ?? (fbUser.email ? fbUser.email.split('@')[0] : null)
      ?? (fbUser.phoneNumber ? formatPhoneForDisplay(fbUser.phoneNumber) : 'User'),
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

  /**
   * The link is sent by Firebase itself, from its own template, NOT through
   * Brevo — so it does not carry the LeHart styling the other emails do.
   * Firebase Console → Authentication → Templates is where that wording lives.
   *
   * The return URL is the current origin rather than a fixed env var, so a
   * preview deployment sends people back to that preview instead of
   * production. It has to be an authorised domain either way, which it is by
   * definition if the customer is looking at it.
   */
  const sendVerification = async (fbUser: FirebaseUser) => {
    try {
      await sendEmailVerification(fbUser, {
        url: typeof window !== 'undefined' ? window.location.origin : 'https://lehart.co.uk',
        handleCodeInApp: false,
      });
    } catch (err) {
      // A verification email that does not send must never fail the signup —
      // the account exists and works, and the address can be confirmed later
      // from the account page. Firebase also rate-limits this per address,
      // which is a normal thing to hit and not worth an error screen.
      console.warn('[auth] verification email not sent:', (err as Error).message);
    }
  };

  const signup = async (email: string, password: string, fullName: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    // Firebase stores no metadata at creation, so the display name is a
    // second call. Do it before the profile write so both agree.
    if (fullName) await updateProfile(cred.user, { displayName: fullName });
    await ensureProfile(cred.user, fullName);
    // Catches the typo'd address before the first order confirmation goes to
    // nobody. Deliberately not a gate: the customer is signed in either way.
    await sendVerification(cred.user);
    await sendAccountWelcome(cred.user);
    setUser(await toUser(cred.user));
  };

  /**
   * Ask the server for the branded welcome.
   *
   * Signup is a pure client-side Firebase call, so without this the only mail
   * a new customer receives is Firebase's plain verification link. The ID
   * token is what proves to the route which address to write to — it never
   * takes an address from the request body.
   *
   * Best-effort in every direction: a failure here must not surface as a
   * signup error, because the account exists and works regardless.
   */
  const sendAccountWelcome = async (fbUser: FirebaseUser) => {
    try {
      const token = await fbUser.getIdToken();
      const res = await fetch('/api/account-welcome', {
        method: 'POST',
        headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
        body: JSON.stringify({ name: fbUser.displayName ?? '' }),
      });
      if (!res.ok) console.warn('[auth] welcome email not sent:', res.status);
    } catch (err) {
      console.warn('[auth] welcome email not sent:', (err as Error).message);
    }
  };

  const resendVerification = async () => {
    const current = auth.currentUser;
    // Nothing to do, and saying so as an error would make a second click on
    // "resend" look broken.
    if (!current || current.emailVerified) return;
    await sendVerification(current);
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

  // ── Phone sign-in ────────────────────────────────────────────────
  //
  // Firebase treats a phone number as an identity in its own right, NOT as an
  // attribute of an email account. That is the duplicate trap: a customer who
  // already has an email account and then "signs in" with their phone gets a
  // second uid, a second profile document, and a second order history — and
  // Firebase's one-account-per-email setting does nothing about it, because no
  // email is involved.
  //
  // So the branch below is the important line in this file: when there is a
  // current user we LINK, and only start a fresh account when nobody is
  // signed in. See docs/AUTH.md.

  const confirmationRef = useRef<ConfirmationResult | null>(null);
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);
  const [pendingPhone, setPendingPhone] = useState<string | null>(null);

  /** reCAPTCHA cannot be reused once solved, so each attempt gets a fresh one. */
  const teardownRecaptcha = () => {
    try {
      recaptchaRef.current?.clear();
    } catch {
      // Already torn down, or the container left the DOM first. Either way the
      // next attempt builds a new one, so there is nothing to recover.
    }
    recaptchaRef.current = null;
  };

  const startPhoneSignIn = async (phone: string, containerId: string, country = DEFAULT_COUNTRY) => {
    // The country comes from the picker rather than from a guess about the
    // digits. Guessing is what sent an Indian 9700144003 to +449700144003.
    const e164 = toE164(phone, country);
    if (!e164) throw Object.assign(new Error('Enter a valid mobile number.'), { code: 'app/invalid-phone' });

    teardownRecaptcha();
    const verifier = new RecaptchaVerifier(auth, containerId, { size: 'invisible' });
    recaptchaRef.current = verifier;

    try {
      const current = auth.currentUser;
      confirmationRef.current = current
        // Attach to the account they already have rather than minting another.
        ? await linkWithPhoneNumber(current, e164, verifier)
        : await signInWithPhoneNumber(auth, e164, verifier);
      setPendingPhone(e164);
    } catch (err) {
      // A failed attempt leaves a solved-but-unusable widget behind; clearing
      // it is what lets the user simply press send again.
      teardownRecaptcha();
      throw err;
    }
  };

  const confirmPhoneCode = async (code: string): Promise<{ hasEmail: boolean }> => {
    const confirmation = confirmationRef.current;
    if (!confirmation) throw new Error('There is no code waiting to be confirmed.');

    const cred = await confirmation.confirm(code.trim());

    confirmationRef.current = null;
    setPendingPhone(null);
    teardownRecaptcha();

    await ensureProfile(cred.user);
    // Record the number on the profile so staff can find an order by it. The
    // authoritative copy stays on the auth record; this is a convenience.
    try {
      await setDoc(
        doc(db, COL.users, cred.user.uid),
        { phoneNumber: cred.user.phoneNumber ?? null, updatedAt: serverTimestamp() },
        { merge: true },
      );
    } catch {
      // A profile write must not undo a completed sign-in.
    }
    setUser(await toUser(cred.user));
    return { hasEmail: Boolean(cred.user.email) };
  };

  const linkEmailPassword = async (email: string, password: string) => {
    const current = auth.currentUser;
    if (!current) throw new Error('You need to be signed in to add an email address.');

    const credential = EmailAuthProvider.credential(email.trim().toLowerCase(), password);
    const linked = await linkWithCredential(current, credential);

    await ensureProfile(linked.user);
    // Now that there is an address, both the things an address is for.
    await sendVerification(linked.user);
    await sendAccountWelcome(linked.user);
    setUser(await toUser(linked.user));
  };

  const cancelPhoneSignIn = () => {
    confirmationRef.current = null;
    setPendingPhone(null);
    teardownRecaptcha();
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
      startPhoneSignIn,
      confirmPhoneCode,
      pendingPhone,
      cancelPhoneSignIn,
      resendVerification,
      linkEmailPassword,
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
