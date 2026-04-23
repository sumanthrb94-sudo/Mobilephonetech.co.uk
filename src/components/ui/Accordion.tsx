import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown } from 'lucide-react';

export interface AccordionItem {
  id: string;
  question: React.ReactNode;
  answer: React.ReactNode;
}

/**
 * Accordion — single-expand-at-a-time by default, uses the app's
 * design tokens (grey-10 dividers, DM Sans headings, radius-lg card edges).
 */
export default function Accordion({
  items,
  allowMultiple = false,
  defaultOpen = [],
}: {
  items: AccordionItem[];
  allowMultiple?: boolean;
  defaultOpen?: string[];
}) {
  const [openIds, setOpenIds] = useState<string[]>(defaultOpen);

  const toggle = (id: string) => {
    setOpenIds((prev) => {
      const isOpen = prev.includes(id);
      if (isOpen) return prev.filter((x) => x !== id);
      return allowMultiple ? [...prev, id] : [id];
    });
  };

  return (
    <div
      style={{
        border: '1px solid var(--grey-10)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        background: 'var(--grey-0)',
      }}
    >
      {items.map((item, idx) => {
        const isOpen = openIds.includes(item.id);
        return (
          <div key={item.id} style={{ borderTop: idx === 0 ? 'none' : '1px solid var(--grey-10)' }}>
            <button
              onClick={() => toggle(item.id)}
              aria-expanded={isOpen}
              aria-controls={`acc-panel-${item.id}`}
              id={`acc-trigger-${item.id}`}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '16px',
                padding: '18px 20px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                fontFamily: 'var(--font-sans)',
                fontSize: '15px',
                fontWeight: 700,
                color: 'var(--black)',
                letterSpacing: '-0.01em',
              }}
            >
              <span>{item.question}</span>
              <motion.span
                animate={{ rotate: isOpen ? 180 : 0 }}
                transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
                style={{ display: 'inline-flex', color: 'var(--grey-50)' }}
              >
                <ChevronDown size={18} />
              </motion.span>
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  key="panel"
                  id={`acc-panel-${item.id}`}
                  role="region"
                  aria-labelledby={`acc-trigger-${item.id}`}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
                  style={{ overflow: 'hidden' }}
                >
                  <div
                    style={{
                      padding: '0 20px 18px 20px',
                      fontFamily: 'var(--font-body)',
                      fontSize: '14px',
                      color: 'var(--grey-60)',
                      lineHeight: 1.6,
                    }}
                  >
                    {item.answer}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
