import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Truck, Shield, RotateCcw } from 'lucide-react';
import { useBreakpoint } from '../../hooks/useBreakpoint';

const MESSAGES = [
  { icon: Truck,     label: 'Free next-day delivery' },
  { icon: Shield,    label: '12-month warranty' },
  { icon: RotateCcw, label: '30-day free returns' },
] as const;

/**
 * AnnouncementBar — single-row trust cues above the main header.
 * On narrow viewports the three messages rotated through would
 * wrap to two lines and eat 60px+ of above-the-fold real estate,
 * so on mobile we show one at a time with a 3.5s fade rotation.
 * On ≥640px there's room for the full joined string inline.
 */
export default function AnnouncementBar() {
  const { isMobile } = useBreakpoint();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!isMobile) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % MESSAGES.length), 3500);
    return () => window.clearInterval(id);
  }, [isMobile]);

  const baseStyle = {
    backgroundColor: 'rgba(0,0,0,0.2)',
    color: 'var(--grey-0)',
    fontFamily: 'var(--font-sans)',
    fontSize: '12px',
    fontWeight: 600,
    letterSpacing: '0.02em',
  } as const;

  if (isMobile) {
    const Active = MESSAGES[index].icon;
    return (
      <div
        role="status"
        aria-live="polite"
        style={{
          ...baseStyle,
          height: '30px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 16px',
          overflow: 'hidden',
        }}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={index}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25, ease: [0.2, 0, 0, 1] }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}
          >
            <Active size={13} style={{ flexShrink: 0 }} />
            {MESSAGES[index].label}
          </motion.span>
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div
      style={{
        ...baseStyle,
        textAlign: 'center',
        padding: '6px 16px',
      }}
    >
      {MESSAGES.map((m) => m.label).join(' · ')}
    </div>
  );
}
