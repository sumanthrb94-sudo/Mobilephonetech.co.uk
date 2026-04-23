import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function CookieBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookie_consent');
    if (!consent) {
      setIsVisible(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookie_consent', 'accepted');
    setIsVisible(false);
  };

  const handleDecline = () => {
    localStorage.setItem('cookie_consent', 'declined');
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          role="dialog"
          aria-labelledby="cookie-banner-title"
          aria-describedby="cookie-banner-desc"
          style={{
            position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
            background: 'var(--grey-95)', color: 'white',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            padding: 'var(--spacing-24) 0',
            boxShadow: '0 -10px 40px rgba(0,0,0,0.2)'
          }}
        >
          <div className="container-bm flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div style={{ flex: 1, paddingRight: 'var(--spacing-32)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <ShieldCheck size={18} style={{ color: 'var(--brand-cyan)' }} />
                <span id="cookie-banner-title" style={{ fontFamily: 'var(--font-sans)', fontSize: '15px', fontWeight: 800, letterSpacing: '-0.01em' }}>
                  Your privacy matters
                </span>
              </div>
              <p id="cookie-banner-desc" style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'rgba(255,255,255,0.65)', lineHeight: 1.55, margin: 0 }}>
                We use cookies to keep the site secure, remember your preferences, and understand how it's used. By clicking "Accept all", you agree to our{' '}
                <Link to="/privacy" style={{ color: 'var(--brand-cyan)', textDecoration: 'underline', textUnderlineOffset: '2px' }}>
                  privacy policy
                </Link>.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 flex-shrink-0 mt-4 md:mt-0">
              <button
                onClick={handleDecline}
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.25)',
                  color: 'white',
                  padding: '0 20px',
                  height: '44px',
                  borderRadius: 'var(--radius-md)',
                  fontFamily: 'var(--font-sans)',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'background var(--duration-fast)',
                }}
                onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
                onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                Reject non-essential
              </button>
              <button
                onClick={handleAccept}
                className="btn btn-primary btn-md"
              >
                Accept all cookies
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
