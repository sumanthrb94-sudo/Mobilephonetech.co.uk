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
 * AnnouncementBar — slim trust-cue strip pinned to the bottom of the
 * viewport. On mobile it sits above the MobileBottomNav (tab bar);
 * CSS (see index.css .announcement-bar / html.is-checkout) handles
 * the positional offsets so the bar drops flush to bottom on checkout
 * routes where the tab bar is hidden.
 *
 * - Mobile: rotating single cue (icon + label), fades every 3.5s.
 * - ≥sm: inline joined string, all three cues in one row.
 */
export default function AnnouncementBar() {
  const { isMobile } = useBreakpoint();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!isMobile) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % MESSAGES.length), 3500);
    return () => window.clearInterval(id);
  }, [isMobile]);

  const Active = MESSAGES[index].icon;

  return (
    <div className="announcement-bar" role="status" aria-live="polite">
      {isMobile ? (
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={index}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.25, ease: [0.2, 0, 0, 1] }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}
          >
            <Active size={13} style={{ flexShrink: 0 }} />
            {MESSAGES[index].label}
          </motion.span>
        </AnimatePresence>
      ) : (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '14px' }}>
          {MESSAGES.map((m) => {
            const Icon = m.icon;
            return (
              <span key={m.label} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <Icon size={13} style={{ flexShrink: 0, opacity: 0.85 }} />
                {m.label}
              </span>
            );
          })}
        </span>
      )}
    </div>
  );
}
