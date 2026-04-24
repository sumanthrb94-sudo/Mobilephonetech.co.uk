import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown } from 'lucide-react';

type Provider = {
  id: string;
  name: string;
  tagline: string;
  instalments: number;
  interestFreeLabel: string;
};

const PROVIDERS: Provider[] = [
  { id: 'klarna',    name: 'Klarna',    tagline: 'Pay in 3',          instalments: 3, interestFreeLabel: '0% interest · 0 fees' },
  { id: 'clearpay',  name: 'Clearpay',  tagline: 'Pay in 4',          instalments: 4, interestFreeLabel: '0% interest · every 2 weeks' },
  { id: 'payin30',   name: 'Klarna',    tagline: 'Pay in 30',         instalments: 1, interestFreeLabel: 'No charge for 30 days' },
];

/**
 * FinanceOptions — inline split-payment breakdown under the price block.
 * All numbers are computed client-side; no lender integration. A tab-like
 * row switches between providers and shows the exact instalment the shopper
 * will see on that provider's checkout.
 */
export default function FinanceOptions({ price }: { price: number }) {
  const [activeId, setActiveId] = useState<string>('klarna');
  const [expanded, setExpanded] = useState(false);
  const active = PROVIDERS.find((p) => p.id === activeId) ?? PROVIDERS[0];
  const per = active.instalments > 1 ? (price / active.instalments) : price;

  return (
    <div
      style={{
        border: '1px solid var(--grey-10)',
        borderRadius: 'var(--radius-lg)',
        background: 'var(--grey-0)',
        padding: '14px 16px',
      }}
    >
      <button
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          width: '100%', background: 'none', border: 'none', padding: 0, cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--grey-70)' }}>
          Or pay <strong style={{ color: 'var(--black)', fontFamily: 'var(--font-sans)', fontWeight: 800 }}>{active.instalments > 1 ? `${active.instalments} × £${per.toFixed(2)}` : `later with ${active.name}`}</strong>
          <span style={{ color: 'var(--grey-50)' }}> with {active.name} — {active.tagline}</span>
        </span>
        <motion.span animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.18 }} style={{ color: 'var(--grey-50)', display: 'inline-flex' }}>
          <ChevronDown size={16} />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ display: 'flex', gap: '6px', marginTop: '12px', flexWrap: 'wrap' }} role="tablist">
              {PROVIDERS.map((p) => {
                const isActive = p.id === activeId;
                return (
                  <button
                    key={p.id}
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setActiveId(p.id)}
                    style={{
                      height: '30px',
                      padding: '0 12px',
                      borderRadius: 'var(--radius-full)',
                      fontFamily: 'var(--font-sans)',
                      fontSize: '12px',
                      fontWeight: isActive ? 700 : 500,
                      color: isActive ? 'var(--grey-0)' : 'var(--grey-60)',
                      background: isActive ? 'var(--black)' : 'var(--grey-0)',
                      border: `1px solid ${isActive ? 'var(--black)' : 'var(--grey-20)'}`,
                      cursor: 'pointer',
                      transition: 'all var(--duration-fast)',
                    }}
                  >
                    {p.name} — {p.tagline}
                  </button>
                );
              })}
            </div>

            <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {active.instalments > 1
                ? Array.from({ length: active.instalments }).map((_, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--grey-5)', borderRadius: 'var(--radius-md)' }}>
                      <span style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--grey-60)' }}>
                        Payment {i + 1}{i === 0 ? ' · today' : ` · in ${i * (active.id === 'clearpay' ? 2 : 1)} ${active.id === 'clearpay' ? 'weeks' : 'month' + (i > 1 ? 's' : '')}`}
                      </span>
                      <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 800, color: 'var(--black)' }}>£{per.toFixed(2)}</span>
                    </div>
                  ))
                : (
                  <div style={{ padding: '10px 12px', background: 'var(--grey-5)', borderRadius: 'var(--radius-md)', fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--grey-70)' }}>
                    Pay nothing now · charged in 30 days
                  </div>
                )}
            </div>

            <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--grey-50)', marginTop: '10px', lineHeight: 1.5 }}>
              {active.interestFreeLabel}. Subject to status. 18+, UK residents only.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
