import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';

/**
 * Modal — centered dialog shared across the app (confirmation, explainers,
 * quick-view). Closes on Escape + backdrop click, traps focus via role=dialog,
 * and locks body scroll while open.
 */
export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  width = 480,
  dismissible = true,
  labelledBy,
}: {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: number | string;
  dismissible?: boolean;
  labelledBy?: string;
}) {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dismissible) onClose();
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [isOpen, dismissible, onClose]);

  const titleId = labelledBy ?? 'modal-title';

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 110,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '16px',
          }}
        >
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={dismissible ? onClose : undefined}
            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(2px)' }}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: 'spring', damping: 26, stiffness: 300 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: typeof width === 'number' ? `${width}px` : width,
              maxHeight: 'calc(100vh - 32px)',
              overflow: 'auto',
              background: 'var(--grey-0)',
              borderRadius: 'var(--radius-xl)',
              boxShadow: 'var(--shadow-xl)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {(title || dismissible) && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--spacing-20) var(--spacing-24)', borderBottom: '1px solid var(--grey-10)' }}>
                {title && (
                  <h2 id={titleId} style={{ fontFamily: 'var(--font-sans)', fontSize: '18px', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--black)', margin: 0 }}>
                    {title}
                  </h2>
                )}
                {dismissible && (
                  <button
                    onClick={onClose}
                    aria-label="Close dialog"
                    style={{
                      marginLeft: 'auto',
                      width: '32px', height: '32px',
                      borderRadius: 'var(--radius-full)',
                      background: 'var(--grey-5)', border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--grey-70)',
                    }}
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            )}
            <div style={{ padding: 'var(--spacing-24)' }}>{children}</div>
            {footer && (
              <div style={{ padding: 'var(--spacing-16) var(--spacing-24)', borderTop: '1px solid var(--grey-10)', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
