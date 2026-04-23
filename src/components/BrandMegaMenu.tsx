import React, { useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, X } from 'lucide-react';
import { MOCK_PHONES } from '../data';

/**
 * BrandMegaMenu — an expanding panel that lists every model of a given
 * brand (Apple / Samsung / Google). Designed to match the ur.co.uk
 * pattern: pill-triggered dropdown with "All Refurbished {Brand}" at
 * the top, then one clickable row per model.
 *
 * Pulls models from MOCK_PHONES so the list stays in sync with the
 * catalogue. Groups by brand, de-duplicates models, sorts alphabetically
 * with a light newest-first bias (Pro Max > Pro > Plus > base) via a
 * simple scoring pass.
 */

type Brand = 'Apple' | 'Samsung' | 'Google';

const SCORE_KEYS: [RegExp, number][] = [
  [/pro\s*max/i, 100],
  [/ultra/i,     100],
  [/pro\b/i,     80],
  [/plus\b/i,    60],
  [/max\b/i,     60],
  [/mini\b/i,    20],
  [/se\b/i,      10],
];

function modelScore(model: string): number {
  for (const [re, s] of SCORE_KEYS) if (re.test(model)) return s;
  return 40;
}

function getModels(brand: Brand): string[] {
  const all = MOCK_PHONES.filter((p) => p.brand === brand).map((p) => p.model);
  const unique = Array.from(new Set(all));
  // Rough newest-first ordering — any numeric year/version, DESC, then score, then alphabetical.
  return unique.sort((a, b) => {
    const numA = parseInt((a.match(/\d+/) || ['0'])[0], 10);
    const numB = parseInt((b.match(/\d+/) || ['0'])[0], 10);
    if (numB !== numA) return numB - numA;
    const sA = modelScore(a);
    const sB = modelScore(b);
    if (sB !== sA) return sB - sA;
    return a.localeCompare(b);
  });
}

export default function BrandMegaMenu({
  brand,
  isOpen,
  onClose,
  anchorTop,
}: {
  brand: Brand;
  isOpen: boolean;
  onClose: () => void;
  /** Top offset in px — where to anchor the dropdown. Defaults to the header+catnav total. */
  anchorTop?: number;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const models = useMemo(() => getModels(brand), [brand]);

  // Click outside + Escape to close
  useEffect(() => {
    if (!isOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!panelRef.current) return;
      if (panelRef.current.contains(e.target as Node)) return;
      // ignore clicks on the pill trigger; navbar handles re-toggle
      const trigger = (e.target as HTMLElement)?.closest?.('[data-brand-trigger]');
      if (trigger) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [isOpen, onClose]);

  // Plural label — "iPhones", "Galaxies", "Pixels"
  const plural = brand === 'Apple' ? 'iPhones' : brand === 'Samsung' ? 'Galaxy phones' : 'Pixel phones';

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              top: anchorTop ?? 'var(--nav-total)',
              left: 0, right: 0, bottom: 0,
              background: 'rgba(0,0,0,0.35)',
              zIndex: 55,
            }}
          />

          {/* Panel */}
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
            role="menu"
            aria-label={`${brand} model picker`}
            style={{
              position: 'fixed',
              top: anchorTop ?? 'var(--nav-total)',
              left: 0, right: 0,
              zIndex: 56,
              background: 'var(--grey-0)',
              borderTop: '1px solid var(--grey-10)',
              borderBottom: '1px solid var(--grey-10)',
              boxShadow: '0 16px 36px rgba(0,0,0,0.12)',
              maxHeight: 'calc(100vh - var(--nav-total) - 32px)',
              overflowY: 'auto',
            }}
          >
            <div
              className="container-bm"
              style={{
                maxWidth: 'var(--container-max)',
                padding: '20px 16px 24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              {/* Header row with close on mobile */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                <h2 style={{ fontFamily: 'var(--font-sans)', fontSize: '15px', fontWeight: 800, letterSpacing: '-0.01em', color: 'var(--black)', margin: 0 }}>
                  Shop {plural}
                </h2>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close menu"
                  className="lg:hidden"
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: 'var(--radius-full)',
                    background: 'var(--grey-5)',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--grey-70)',
                  }}
                >
                  <X size={16} />
                </button>
              </div>

              {/* "All Refurbished {Brand}" */}
              <Link
                to={`/products?brand=${encodeURIComponent(brand)}`}
                onClick={onClose}
                role="menuitem"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--color-brand-subtle)',
                  color: 'var(--brand-cyan-hover)',
                  fontFamily: 'var(--font-sans)',
                  fontWeight: 700,
                  fontSize: '14px',
                  textDecoration: 'none',
                  letterSpacing: '-0.005em',
                }}
              >
                <span>All refurbished {plural}</span>
                <ArrowRight size={14} />
              </Link>

              {/* Model list — uses mobile-first 1 col, 2 cols md, 3 cols lg so desktop
                  gets a richer mega-menu layout and mobile stays a tall scrollable list. */}
              <ul
                role="none"
                className="brand-mega-grid"
                style={{
                  listStyle: 'none',
                  margin: 0,
                  padding: 0,
                  display: 'grid',
                  gridTemplateColumns: '1fr',
                  gap: '2px',
                }}
              >
                {models.map((model) => (
                  <li key={model} role="none">
                    <Link
                      to={`/products?brand=${encodeURIComponent(brand)}&model=${encodeURIComponent(model)}`}
                      role="menuitem"
                      onClick={onClose}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '12px 14px',
                        borderRadius: 'var(--radius-md)',
                        color: 'var(--grey-70)',
                        fontFamily: 'var(--font-body)',
                        fontSize: '15px',
                        fontWeight: 500,
                        textDecoration: 'none',
                        letterSpacing: '-0.005em',
                        transition: 'background var(--duration-fast), color var(--duration-fast)',
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLAnchorElement).style.background = 'var(--grey-5)';
                        (e.currentTarget as HTMLAnchorElement).style.color = 'var(--black)';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLAnchorElement).style.background = 'transparent';
                        (e.currentTarget as HTMLAnchorElement).style.color = 'var(--grey-70)';
                      }}
                    >
                      {model}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
