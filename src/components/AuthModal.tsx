import React, { useEffect, useRef, useState } from 'react';
import { X, Mail, Lock, User, ArrowRight, Smartphone } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Spinner } from './ui/Loading';
import { useAuth } from '../context/AuthContext';
import { resolveLoginIdentifier, isValidLoginIdentifier } from '../utils/loginIdentifier';
import { isValidPhone, formatPhoneForDisplay } from '../utils/phoneNumber';

/**
 * AuthModal — centred floating modal for sign-in / sign-up.
 * Uses the app's cyan primary and shared design tokens.
 */

type Mode = 'login' | 'signup' | 'reset' | 'link' | 'phone' | 'code';

/** Where the invisible reCAPTCHA mounts. Firebase needs a real element id. */
const RECAPTCHA_ID = 'auth-recaptcha-container';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialMode?: 'login' | 'signup';
}

/**
 * Turn Firebase's provider ids into something a customer can act on.
 *
 * Returns null when the list is empty, which Firebase's Email Enumeration
 * Protection makes the normal case rather than the exception — it deliberately
 * reports nothing so a stranger cannot probe which addresses have accounts. A
 * null here means "say something generic", never "no account exists".
 */
function describeProviders(methods: string[]): string | null {
  if (!methods.length) return null;
  if (methods.includes('google.com') && !methods.includes('password')) {
    return 'This email is registered with Google. Use “Continue with Google” below.';
  }
  if (methods.includes('password') && !methods.includes('google.com')) {
    return 'This email is registered with a password. Enter it above, or reset it if you have forgotten.';
  }
  return null;
}

/**
 * Firebase reports auth failures as `auth/...` codes wrapped in a generic
 * "Firebase: Error (auth/...)" message, which tells the user nothing. The two
 * that actually happen in deployment are worth naming precisely, because both
 * are console configuration rather than anything the user did wrong.
 */
function describeGoogleError(err: unknown): string {
  const code = (err as { code?: string })?.code ?? '';
  const message = (err as { message?: string })?.message ?? '';

  switch (code) {
    case 'auth/operation-not-allowed':
      return 'Google sign-in is not enabled for this project yet. Please use email and password.';
    case 'auth/unauthorized-domain':
      // By far the most common one on a new deployment: the domain has to be
      // listed under Firebase Auth -> Settings -> Authorized domains.
      return 'This site is not an authorised domain for Google sign-in. Please use email and password.';
    case 'auth/account-exists-with-different-credential':
      return 'An account already exists with that email. Sign in with your password instead.';
    case 'auth/network-request-failed':
      return 'Could not reach Google. Check your connection and try again.';
    case 'auth/internal-error':
      return 'Google sign-in failed unexpectedly. Please use email and password.';
    default:
      return message || 'Could not start Google sign-in. Please try again.';
  }
}

export default function AuthModal({ isOpen, onClose, onSuccess, initialMode = 'login' }: AuthModalProps) {
  /**
   * 'reset' sends a password-reset email; 'link' is entered only when Google
   * sign-in hit an address that already has a password account, and asks for
   * that password once so the two can be joined.
   */
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);

  // onClose is a fresh closure on every parent render, so keeping it in the
  // effect's dependencies tore the effect down and re-ran it constantly while
  // the modal was open — re-capturing lastFocusedRef each time, usually onto
  // the modal's own first field. A ref keeps the latest callback reachable
  // without making the effect depend on its identity.
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  // Focus management: remember the trigger, focus the first field on
  // open, restore focus on close. Esc closes from anywhere in the modal.
  useEffect(() => {
    if (!isOpen) return;
    lastFocusedRef.current = (document.activeElement as HTMLElement) ?? null;
    const t = window.setTimeout(() => firstFieldRef.current?.focus(), 30);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onCloseRef.current(); }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener('keydown', onKey);

      // The trigger is often inside a menu that closed itself on the way in,
      // which leaves a detached node whose .focus() silently does nothing —
      // dropping focus to <body>, so the next Tab restarts at the top of the
      // page. Fall back to any still-connected sign-in control, then to the
      // main landmark, so focus always lands somewhere navigable.
      const previous = lastFocusedRef.current;
      const restore = previous?.isConnected
        ? previous
        : (document.querySelector('[data-auth-trigger]') as HTMLElement | null)
          ?? (document.getElementById('main-content') as HTMLElement | null);

      if (restore) {
        // main is not focusable by default; -1 lets it receive focus
        // programmatically without adding it to the tab order.
        if (restore.id === 'main-content' && !restore.hasAttribute('tabindex')) {
          restore.setAttribute('tabindex', '-1');
        }
        restore.focus?.();
      }
    };
  }, [isOpen]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const {
    login, signup, signInWithGoogle, resetPassword,
    signInMethodsFor, pendingLinkEmail, completeGoogleLink, cancelGoogleLink,
    startPhoneSignIn, confirmPhoneCode, pendingPhone, cancelPhoneSignIn,
  } = useAuth();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [googleBusy, setGoogleBusy] = useState(false);

  const handleGoogle = async () => {
    setError('');
    setGoogleBusy(true);
    try {
      const outcome = await signInWithGoogle();

      // Firebase's popup flow resolves in place — unlike Supabase's redirect,
      // which unloaded the page and meant nothing after the await ever ran.
      // Without closing here the user is signed in behind a modal that is
      // still spinning, which looks exactly like a failure.
      if (outcome === 'signed-in') {
        onSuccess?.();
        onClose();
        return;
      }
      // 'redirecting' — the page is about to unload, so leave the busy state.
      if (outcome === 'redirecting') return;

      // The address already has a password account. Rather than the dead end
      // of "use your password instead", ask for it once and attach Google to
      // the existing account so either method works from now on.
      if (outcome === 'needs-link') {
        setMode('link');
        setPassword('');
        setGoogleBusy(false);
        return;
      }

      // 'cancelled' — the user closed the popup. Not an error; just reset.
      setGoogleBusy(false);
    } catch (err) {
      setError(describeGoogleError(err));
      setGoogleBusy(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');

    if ((mode === 'login' || mode === 'reset') && !isValidLoginIdentifier(email)) {
      setError('Enter your email address, or your staff username.');
      return;
    }

    if (mode === 'phone' && !isValidPhone(phone)) {
      setError('Enter a UK mobile number, e.g. 07700 900123.');
      return;
    }
    if (mode === 'code' && !/^\d{6}$/.test(code.trim())) {
      setError('Enter the 6-digit code from the text message.');
      return;
    }

    setIsLoading(true);

    try {
      if (mode === 'login') {
        // `admin` resolves to admin@lehart.co.uk; a full address passes through.
        await login(resolveLoginIdentifier(email), password);
        onSuccess?.();
        onClose();
      } else if (mode === 'reset') {
        await resetPassword(resolveLoginIdentifier(email));
        // Worded so it reveals nothing either way. Confirming that an address
        // does have an account turns this form into a way of testing which of
        // a leaked address list are customers here.
        setInfo(`If an account exists for ${email}, a reset link is on its way. Check your inbox and spam folder.`);
        setPassword('');
      } else if (mode === 'link') {
        await completeGoogleLink(password);
        onSuccess?.();
        onClose();
      } else if (mode === 'phone') {
        await startPhoneSignIn(phone, RECAPTCHA_ID);
        setCode('');
        setMode('code');
      } else if (mode === 'code') {
        await confirmPhoneCode(code);
        onSuccess?.();
        onClose();
      } else {
        // createUserWithEmailAndPassword signs the new user in immediately and
        // sends nothing — the modal simply closes, the same as a sign-in. The
        // message that used to sit here promised a confirmation email that was
        // never sent and told an already-signed-in customer to sign in.
        await signup(email, password, fullName);
        onSuccess?.();
        onClose();
      }
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? '';
      const msg = (err as { message?: string })?.message ?? '';

      // A failed sign-in is very often the right person using the wrong
      // method, so say which method the address actually has rather than
      // "invalid credentials" — that is the difference between a customer
      // recovering and a customer creating a duplicate account.
      if (mode === 'login' && (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found')) {
        const hint = describeProviders(await signInMethodsFor(resolveLoginIdentifier(email)));
        setError(hint ?? 'That email and password do not match. Try again, or reset your password.');
      } else if (mode === 'signup' && code === 'auth/email-already-in-use') {
        const hint = describeProviders(await signInMethodsFor(email));
        setError(hint ?? 'An account already exists for that email. Sign in instead.');
      } else if (mode === 'link' && (code === 'auth/invalid-credential' || code === 'auth/wrong-password')) {
        setError('That password does not match the existing account. Try again, or reset it.');
      } else if (code === 'auth/invalid-verification-code') {
        setError('That code is not right. Check the message and try again.');
      } else if (code === 'auth/code-expired') {
        setError('That code has expired. Go back and request a new one.');
      } else if (code === 'auth/invalid-phone-number' || code === 'app/invalid-phone') {
        setError('That does not look like a valid mobile number.');
      } else if (code === 'auth/credential-already-in-use' || code === 'auth/account-exists-with-different-credential') {
        // Linking a number that already belongs to a different account. The
        // alternative — silently switching them to that other account — would
        // be worse: it looks like their data vanished.
        setError('That mobile number is already on another account. Sign in with that account, or use a different number.');
      } else if (code === 'auth/provider-already-linked') {
        setError('This account already has a mobile number.');
      } else if (code === 'auth/captcha-check-failed') {
        setError('The security check failed. Reload the page and try again.');
      } else if (code === 'auth/quota-exceeded') {
        setError('Too many codes requested right now. Please try again later.');
      } else if (code === 'auth/too-many-requests') {
        setError('Too many attempts. Wait a few minutes and try again.');
      } else if (code === 'auth/weak-password') {
        setError('Please choose a password of at least six characters.');
      } else {
        setError(msg || 'Something went wrong. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  /** Leave link mode without attaching Google, e.g. the user changed their mind. */
  const abandonLink = () => {
    cancelGoogleLink();
    setPassword('');
    setError('');
    setInfo('');
    setMode('login');
  };

  /** Drop a pending SMS verification and its reCAPTCHA. */
  const abandonPhone = (back: Mode = 'login') => {
    cancelPhoneSignIn();
    setCode('');
    setError('');
    setInfo('');
    setMode(back);
  };

  const inputStyle = {
    width: '100%', padding: '14px 16px 14px 44px', background: 'var(--grey-5)',
    border: '1px solid var(--grey-20)', borderRadius: 'var(--radius-md)',
    fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--black)',
    outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box' as const
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)' }}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="auth-modal-title"
            style={{
              position: 'relative', width: '100%', maxWidth: '400px',
              background: 'var(--grey-0)', borderRadius: 'var(--radius-xl)',
              overflow: 'hidden', boxShadow: 'var(--shadow-xl)'
            }}
          >
            {/* Header */}
            <div style={{ padding: 'var(--spacing-32) var(--spacing-32) var(--spacing-24)', borderBottom: '1px solid var(--grey-10)', position: 'relative' }}>
              <button
                onClick={onClose}
                aria-label="Close dialog"
                style={{ position: 'absolute', top: '24px', right: '24px', background: 'var(--grey-5)', border: 'none', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--black)' }}
              >
                <X size={16} />
              </button>
              <h2 id="auth-modal-title" style={{ fontFamily: 'var(--font-sans)', fontSize: '24px', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--black)', margin: '0 0 8px 0', paddingRight: '32px' }}>
                {mode === 'login' ? 'Welcome back'
                  : mode === 'signup' ? 'Create your account'
                  : mode === 'reset' ? 'Reset your password'
                  : mode === 'phone' ? 'Sign in with your mobile'
                  : mode === 'code' ? 'Enter your code'
                  : 'Connect your Google account'}
              </h2>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--grey-50)', margin: 0 }}>
                {mode === 'login' ? 'Sign in to access your orders and wishlist.'
                  : mode === 'signup' ? 'Join lehart.co.uk for a certified experience.'
                  : mode === 'reset' ? 'Enter your email and we will send you a link to set a new one.'
                  : mode === 'phone' ? 'We will text you a 6-digit code. No password needed.'
                  : mode === 'code' ? `Sent to ${pendingPhone ? formatPhoneForDisplay(pendingPhone) : 'your mobile'}. It expires in a few minutes.`
                  : `${pendingLinkEmail ?? 'That address'} already has a password. Enter it once and Google will sign you in from now on.`}
              </p>
            </div>

            <div style={{ padding: 'var(--spacing-32)' }}>
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {mode === 'signup' && (
                  <div style={{ position: 'relative' }}>
                    <User size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--grey-40)' }} />
                    <input type="text" required placeholder="Full Name" value={fullName} onChange={(e) => setFullName(e.target.value)} style={inputStyle} onFocus={(e) => e.target.style.borderColor = 'var(--brand-cyan)'} onBlur={(e) => e.target.style.borderColor = 'var(--grey-20)'} />
                  </div>
                )}
                {(mode === 'login' || mode === 'signup' || mode === 'reset') && (
                  <div style={{ position: 'relative' }}>
                    <Mail size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--grey-40)' }} />
                    <input ref={firstFieldRef} type={mode === 'signup' ? 'email' : 'text'} required placeholder={mode === 'signup' ? 'Email Address' : 'Email or username'} autoComplete={mode === 'signup' ? 'email' : 'username'} value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} onFocus={(e) => e.target.style.borderColor = 'var(--brand-cyan)'} onBlur={(e) => e.target.style.borderColor = 'var(--grey-20)'} />
                  </div>
                )}
                {/* A reset needs no password — asking for one would be asking
                    for the thing the user is here because they do not have. */}
                {(mode === 'login' || mode === 'signup' || mode === 'link') && (
                  <div style={{ position: 'relative' }}>
                    <Lock size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--grey-40)' }} />
                    <input ref={mode === 'link' ? firstFieldRef : undefined} type="password" required placeholder={mode === 'link' ? 'Your existing password' : 'Password'} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} value={password} onChange={(e) => setPassword(e.target.value)} style={inputStyle} onFocus={(e) => e.target.style.borderColor = 'var(--brand-cyan)'} onBlur={(e) => e.target.style.borderColor = 'var(--grey-20)'} />
                  </div>
                )}

                {mode === 'phone' && (
                  <div style={{ position: 'relative' }}>
                    <Smartphone size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--grey-40)' }} />
                    <input
                      ref={firstFieldRef}
                      type="tel"
                      required
                      placeholder="07700 900123"
                      autoComplete="tel"
                      inputMode="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      style={inputStyle}
                      onFocus={(e) => e.target.style.borderColor = 'var(--brand-cyan)'}
                      onBlur={(e) => e.target.style.borderColor = 'var(--grey-20)'}
                    />
                  </div>
                )}

                {mode === 'code' && (
                  <div style={{ position: 'relative' }}>
                    <input
                      ref={firstFieldRef}
                      type="text"
                      required
                      placeholder="123456"
                      /* one-time-code lets iOS and Android offer the code straight
                         from the notification, which is the whole ergonomic win
                         of SMS sign-in. */
                      autoComplete="one-time-code"
                      inputMode="numeric"
                      maxLength={6}
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                      style={{ ...inputStyle, paddingLeft: '16px', textAlign: 'center', fontSize: '22px', fontWeight: 700, letterSpacing: '0.4em' }}
                      onFocus={(e) => e.target.style.borderColor = 'var(--brand-cyan)'}
                      onBlur={(e) => e.target.style.borderColor = 'var(--grey-20)'}
                    />
                  </div>
                )}

                {mode === 'code' && (
                  <div style={{ textAlign: 'center', marginTop: '-4px' }}>
                    <button
                      type="button"
                      onClick={() => abandonPhone('phone')}
                      style={{ background: 'none', border: 'none', padding: 0, fontFamily: 'var(--font-body)', fontSize: '12.5px', fontWeight: 600, color: 'var(--grey-60)', cursor: 'pointer' }}
                      onMouseOver={(e) => e.currentTarget.style.color = 'var(--brand-cyan-hover)'}
                      onMouseOut={(e) => e.currentTarget.style.color = 'var(--grey-60)'}
                    >
                      Wrong number, or no code? Send again
                    </button>
                  </div>
                )}

                {mode === 'login' && (
                  <div style={{ textAlign: 'right', marginTop: '-4px' }}>
                    <button
                      type="button"
                      onClick={() => { setMode('reset'); setError(''); setInfo(''); }}
                      style={{ background: 'none', border: 'none', padding: 0, fontFamily: 'var(--font-body)', fontSize: '12.5px', fontWeight: 600, color: 'var(--grey-60)', cursor: 'pointer' }}
                      onMouseOver={(e) => e.currentTarget.style.color = 'var(--brand-cyan-hover)'}
                      onMouseOut={(e) => e.currentTarget.style.color = 'var(--grey-60)'}
                    >
                      Forgot your password?
                    </button>
                  </div>
                )}

                {info && (
                  <p role="status" style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 600, color: '#0a7c5c', background: '#e6f7f2', borderRadius: '6px', padding: '10px 12px', textAlign: 'center', margin: '4px 0 0 0' }}>{info}</p>
                )}
                {error && (
                  <p role="alert" style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 600, color: 'var(--color-sale)', textAlign: 'center', margin: '4px 0 0 0' }}>{error}</p>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  aria-busy={isLoading}
                  className="btn btn-primary btn-lg btn-full"
                  style={{ marginTop: '8px' }}
                >
                  {isLoading ? (
                    <Spinner
                      size="sm"
                      tone="current"
                      label={mode === 'login' ? 'Signing in'
                        : mode === 'signup' ? 'Creating your account'
                        : mode === 'reset' ? 'Sending your link'
                        : mode === 'phone' ? 'Texting your code'
                        : mode === 'code' ? 'Checking your code'
                        : 'Connecting Google'}
                    />
                  ) : (
                    <>{mode === 'login' ? 'Sign in'
                      : mode === 'signup' ? 'Create account'
                      : mode === 'reset' ? 'Send reset link'
                      : mode === 'phone' ? 'Text me a code'
                      : mode === 'code' ? 'Verify and sign in'
                      : 'Connect and sign in'} <ArrowRight size={16} /></>
                  )}
                </button>
              </form>

              {/* ── Google OAuth ─────────────────────────────────
                  Hidden while resetting (nothing to sign in with yet) and
                  while linking (the Google attempt is what got us here, so
                  offering it again would loop). */}
              {(mode === 'login' || mode === 'signup') && (
              <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '20px 0' }}>
                <span style={{ flex: 1, height: '1px', background: 'var(--grey-20)' }} />
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--grey-40)' }}>or</span>
                <span style={{ flex: 1, height: '1px', background: 'var(--grey-20)' }} />
              </div>

              <button
                type="button"
                onClick={handleGoogle}
                disabled={googleBusy}
                aria-busy={googleBusy}
                aria-label="Continue with Google"
                style={{
                  width: '100%',
                  height: '48px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  background: 'var(--grey-0)',
                  border: '1px solid var(--grey-20)',
                  borderRadius: 'var(--radius-full)',
                  fontFamily: 'var(--font-body)',
                  fontSize: '15px',
                  fontWeight: 600,
                  color: 'var(--black)',
                  cursor: googleBusy ? 'wait' : 'pointer',
                  transition: 'background var(--duration-fast), border-color var(--duration-fast)',
                }}
                onMouseOver={(e) => { e.currentTarget.style.background = 'var(--grey-5)'; }}
                onMouseOut={(e) => { e.currentTarget.style.background = 'var(--grey-0)'; }}
              >
                {googleBusy ? <Spinner size="sm" label="Signing in with Google" /> : (
                  <>
                    {/* Google mark — inline so no external request is needed. */}
                    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                    </svg>
                    Continue with Google
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => { setMode('phone'); setError(''); setInfo(''); }}
                aria-label="Continue with mobile number"
                style={{
                  width: '100%',
                  height: '48px',
                  marginTop: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  background: 'var(--grey-0)',
                  border: '1px solid var(--grey-20)',
                  borderRadius: 'var(--radius-full)',
                  fontFamily: 'var(--font-body)',
                  fontSize: '15px',
                  fontWeight: 600,
                  color: 'var(--black)',
                  cursor: 'pointer',
                  transition: 'background var(--duration-fast), border-color var(--duration-fast)',
                }}
                onMouseOver={(e) => { e.currentTarget.style.background = 'var(--grey-5)'; }}
                onMouseOut={(e) => { e.currentTarget.style.background = 'var(--grey-0)'; }}
              >
                <Smartphone size={18} aria-hidden="true" />
                Continue with mobile
              </button>
              </>
              )}

              {/* Invisible reCAPTCHA mounts here. It must exist in the DOM
                  before startPhoneSignIn runs, and must stay mounted for the
                  whole phone flow — unmounting it mid-verification leaves
                  Firebase holding a reference to a detached node. */}
              <div id={RECAPTCHA_ID} />

              <div style={{ marginTop: 'var(--spacing-32)', textAlign: 'center' }}>
                <button
                  onClick={() => {
                    if (mode === 'link') { abandonLink(); return; }
                    if (mode === 'phone' || mode === 'code') { abandonPhone('login'); return; }
                    if (mode === 'reset') { setMode('login'); setError(''); setInfo(''); return; }
                    setMode(mode === 'login' ? 'signup' : 'login');
                    setError('');
                    setInfo('');
                  }}
                  style={{ background: 'none', border: 'none', fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 600, color: 'var(--grey-60)', cursor: 'pointer', transition: 'color var(--duration-fast)' }}
                  onMouseOver={(e) => e.currentTarget.style.color = 'var(--brand-cyan-hover)'}
                  onMouseOut={(e) => e.currentTarget.style.color = 'var(--grey-60)'}
                >
                  {mode === 'login' ? "Don't have an account? Sign up"
                    : mode === 'signup' ? 'Already have an account? Sign in'
                    : mode === 'reset' ? 'Back to sign in'
                    : (mode === 'phone' || mode === 'code') ? 'Use email instead'
                    : 'Cancel and sign in another way'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
