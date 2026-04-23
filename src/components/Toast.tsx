import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';
import { useUI } from '../context/UIContext';

type ToastType = 'success' | 'error' | 'info' | 'warning';

const TOAST_STYLES: Record<ToastType, { bg: string; border: string; iconColor: string; text: string }> = {
  success: { bg: 'var(--green-5)', border: 'var(--green-20)', iconColor: 'var(--green-60)', text: 'var(--black)' },
  error:   { bg: 'var(--color-sale-subtle)', border: '#fecaca', iconColor: 'var(--color-sale)', text: 'var(--black)' },
  info:    { bg: 'var(--color-brand-subtle)', border: 'rgba(0, 186, 219, 0.25)', iconColor: 'var(--brand-cyan-hover)', text: 'var(--black)' },
  warning: { bg: 'var(--color-warn-subtle)', border: '#fde68a', iconColor: 'var(--color-warn)', text: 'var(--black)' },
};

const TOAST_ICONS = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle,
};

export default function Toast() {
  const { toastMessage, toastType, hideToast } = useUI();
  const palette = TOAST_STYLES[toastType as ToastType] ?? TOAST_STYLES.info;
  const Icon = TOAST_ICONS[toastType as ToastType] ?? Info;

  return (
    <AnimatePresence>
      {toastMessage && (
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.22, ease: [0.2, 0, 0, 1] }}
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed',
            top: 'calc(var(--nav-total) + 12px)',
            right: '16px',
            zIndex: 80,
            background: palette.bg,
            border: `1px solid ${palette.border}`,
            borderRadius: 'var(--radius-md)',
            padding: '12px 16px',
            boxShadow: 'var(--shadow-lg)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            maxWidth: 'min(380px, calc(100vw - 32px))',
          }}
        >
          <Icon size={18} style={{ color: palette.iconColor, flexShrink: 0 }} />
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '14px',
              fontWeight: 500,
              color: palette.text,
              margin: 0,
              lineHeight: 1.4,
            }}
          >
            {toastMessage}
          </p>
          <button
            onClick={hideToast}
            aria-label="Dismiss notification"
            style={{
              marginLeft: '4px',
              padding: '4px',
              background: 'transparent',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              color: 'var(--grey-50)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background var(--duration-fast)',
            }}
            onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,0.05)'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <X size={14} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
