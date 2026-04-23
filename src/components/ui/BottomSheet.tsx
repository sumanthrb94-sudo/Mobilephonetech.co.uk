import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';

/**
 * BottomSheet — mobile-native sheet anchored to the bottom edge.
 * Used for filter panels, sort pickers, etc. on phones, where a centred
 * modal would crowd the small viewport.
 */
export default function BottomSheet({
  isOpen,
  onClose,
  title,
  children,
  footer,
}: {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 105, display: 'flex', alignItems: 'flex-end' }}>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)' }}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            role="dialog"
            aria-modal="true"
            style={{
              position: 'relative',
              width: '100%',
              maxHeight: 'calc(100vh - 48px)',
              background: 'var(--grey-0)',
              borderTopLeftRadius: 'var(--radius-xl)',
              borderTopRightRadius: 'var(--radius-xl)',
              boxShadow: '0 -24px 48px rgba(0,0,0,0.18)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* Drag handle cue */}
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '8px' }}>
              <span style={{ width: '44px', height: '4px', background: 'var(--grey-20)', borderRadius: 'var(--radius-full)' }} />
            </div>

            {(title || true) && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px 12px' }}>
                {title && <h2 style={{ fontFamily: 'var(--font-sans)', fontSize: '16px', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--black)', margin: 0 }}>{title}</h2>}
                <button
                  onClick={onClose}
                  aria-label="Close"
                  style={{ marginLeft: 'auto', width: '32px', height: '32px', borderRadius: 'var(--radius-full)', background: 'var(--grey-5)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--grey-70)' }}
                >
                  <X size={16} />
                </button>
              </div>
            )}

            <div style={{ flex: 1, overflowY: 'auto', padding: '4px 20px 20px' }}>{children}</div>

            {footer && (
              <div style={{ padding: '12px 20px calc(12px + env(safe-area-inset-bottom, 0px))', borderTop: '1px solid var(--grey-10)', display: 'flex', gap: '12px', justifyContent: 'stretch' }}>
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
