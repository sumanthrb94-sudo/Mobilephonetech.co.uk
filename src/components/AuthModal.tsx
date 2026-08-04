import React, { useEffect, useRef, useState } from 'react';
import { X, Mail, Lock, User, ArrowRight, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';

/**
 * AuthModal — centred floating modal for sign-in / sign-up.
 * Uses the app's cyan primary and shared design tokens.
 */

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialMode?: 'login' | 'signup';
}

export default function AuthModal({ isOpen, onClose, onSuccess, initialMode = 'login' }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);

  // Focus management: remember the trigger, focus the first field on
  // open, restore focus on close. Esc closes from anywhere in the modal.
  useEffect(() => {
    if (!isOpen) return;
    lastFocusedRef.current = (document.activeElement as HTMLElement) ?? null;
    const t = window.setTimeout(() => firstFieldRef.current?.focus(), 30);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener('keydown', onKey);
      lastFocusedRef.current?.focus?.();
    };
  }, [isOpen, onClose]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const { login, signup, signInWithGoogle } = useAuth();
  const [googleBusy, setGoogleBusy] = useState(false);

  const handleGoogle = async () => {
    setError('');
    setGoogleBusy(true);
    try {
      await signInWithGoogle();
      // On success the browser navigates to Google, so we never get here.
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      setError(/provider|not enabled|unsupported/i.test(msg)
        ? 'Google sign-in is not enabled yet. Please use email and password.'
        : msg || 'Could not start Google sign-in. Please try again.');
      setGoogleBusy(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setInfo('');

    try {
      if (mode === 'login') {
        await login(email, password);
        onSuccess?.();
        onClose();
      } else {
        await signup(email, password, fullName);
        // Supabase requires email confirmation by default — tell the user
        setInfo(`We've sent a confirmation link to ${email}. Please check your inbox, then sign in.`);
        setMode('login');
        setPassword('');
      }
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message ?? '';
      const lower = msg.toLowerCase();
      if (lower.includes('email not confirmed') || lower.includes('confirm your email') || lower.includes('not confirmed')) {
        setError('Please check your inbox and confirm your email address before signing in.');
      } else {
        setError(msg || 'Something went wrong. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
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
                {mode === 'login' ? 'Welcome back' : 'Create your account'}
              </h2>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--grey-50)', margin: 0 }}>
                {mode === 'login'
                  ? 'Sign in to access your orders and wishlist.'
                  : 'Join lehart.co.uk for a certified experience.'}
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
                <div style={{ position: 'relative' }}>
                  <Mail size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--grey-40)' }} />
                  <input ref={firstFieldRef} type="email" required placeholder="Email Address" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} onFocus={(e) => e.target.style.borderColor = 'var(--brand-cyan)'} onBlur={(e) => e.target.style.borderColor = 'var(--grey-20)'} />
                </div>
                <div style={{ position: 'relative' }}>
                  <Lock size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--grey-40)' }} />
                  <input type="password" required placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} style={inputStyle} onFocus={(e) => e.target.style.borderColor = 'var(--brand-cyan)'} onBlur={(e) => e.target.style.borderColor = 'var(--grey-20)'} />
                </div>

                {info && (
                  <p role="status" style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 600, color: '#0a7c5c', background: '#e6f7f2', borderRadius: '6px', padding: '10px 12px', textAlign: 'center', margin: '4px 0 0 0' }}>{info}</p>
                )}
                {error && (
                  <p role="alert" style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 600, color: 'var(--color-sale)', textAlign: 'center', margin: '4px 0 0 0' }}>{error}</p>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn btn-primary btn-lg btn-full"
                  style={{ marginTop: '8px' }}
                >
                  {isLoading ? <Loader2 size={18} className="animate-spin" /> : (
                    <>{mode === 'login' ? 'Sign in' : 'Create account'} <ArrowRight size={16} /></>
                  )}
                </button>
              </form>

              {/* ── Google OAuth ───────────────────────────────── */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '20px 0' }}>
                <span style={{ flex: 1, height: '1px', background: 'var(--grey-20)' }} />
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--grey-40)' }}>or</span>
                <span style={{ flex: 1, height: '1px', background: 'var(--grey-20)' }} />
              </div>

              <button
                type="button"
                onClick={handleGoogle}
                disabled={googleBusy}
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
                {googleBusy ? <Loader2 size={18} className="animate-spin" /> : (
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

              <div style={{ marginTop: 'var(--spacing-32)', textAlign: 'center' }}>
                <button
                  onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
                  style={{ background: 'none', border: 'none', fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 600, color: 'var(--grey-60)', cursor: 'pointer', transition: 'color var(--duration-fast)' }}
                  onMouseOver={(e) => e.currentTarget.style.color = 'var(--brand-cyan-hover)'}
                  onMouseOut={(e) => e.currentTarget.style.color = 'var(--grey-60)'}
                >
                  {mode === 'login' ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
