import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, X } from 'lucide-react';
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
          style={{
            position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
            background: 'var(--black)', color: 'white',
            borderTop: '1px solid var(--grey-80)', padding: 'var(--spacing-24) 0',
            boxShadow: '0 -10px 40px rgba(0,0,0,0.2)'
          }}
        >
          <div className="container-bm flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div style={{ flex: 1, paddingRight: 'var(--spacing-32)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <ShieldCheck size={18} style={{ color: 'var(--blue-40)' }} />
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: '16px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Your Privacy Matters</span>
              </div>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--grey-30)', lineHeight: 1.5, margin: 0 }}>
                We use cookies to ensure our website functions securely, to personalize your experience, and to analyze our traffic. By clicking "Accept All", you consent to our use of cookies as described in our <Link to="/privacy" style={{ color: 'white', textDecoration: 'underline' }}>Privacy Policy</Link>.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 flex-shrink-0 mt-4 md:mt-0">
              <button
                onClick={handleDecline}
                style={{
                  background: 'transparent', border: '1px solid var(--grey-60)', color: 'white',
                  padding: '12px 24px', borderRadius: 'var(--radius-md)', fontFamily: 'var(--font-sans)',
                  fontSize: '14px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
              >
                Reject Non-Essential
              </button>
              <button
                onClick={handleAccept}
                style={{
                  background: 'var(--blue-60)', border: '1px solid var(--blue-60)', color: 'white',
                  padding: '12px 24px', borderRadius: 'var(--radius-md)', fontFamily: 'var(--font-sans)',
                  fontSize: '14px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = 'var(--blue-70)'}
                onMouseOut={(e) => e.currentTarget.style.background = 'var(--blue-60)'}
              >
                Accept All Cookies
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
