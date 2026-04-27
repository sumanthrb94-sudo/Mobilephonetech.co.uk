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
  const { login, signup } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await signup(email, password, fullName);
      }
      onSuccess?.();
      onClose();
    } catch (err) {
      setError('Invalid credentials. Please try again.');
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
                  : 'Join mobilephonemarket.co.uk for a certified experience.'}
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
