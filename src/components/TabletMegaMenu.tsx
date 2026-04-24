import { useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, X, Apple, Smartphone } from 'lucide-react';
import { MOCK_PHONES } from '../data';

/**
 * TabletMegaMenu — mirrors BrandMegaMenu visually but splits the
 * dropdown into two columns: iPads (brand = Apple, model contains
 * "iPad") and Android tablets (everything else in category Tablets).
 */

function getTablets() {
  const tablets = MOCK_PHONES.filter(p => p.category === 'Tablets');
  const ipads    = Array.from(new Set(tablets.filter(p => p.brand === 'Apple').map(p => p.model)));
  const androids = Array.from(new Set(tablets.filter(p => p.brand !== 'Apple').map(p => p.model)));
  // Newest-first heuristic: higher year numbers first, then the rest alphabetical.
  const newest = (a: string, b: string) => {
    const nA = parseInt((a.match(/\d+/) || ['0'])[0], 10);
    const nB = parseInt((b.match(/\d+/) || ['0'])[0], 10);
    if (nB !== nA) return nB - nA;
    return a.localeCompare(b);
  };
  return { ipads: ipads.sort(newest), androids: androids.sort(newest) };
}

export default function TabletMegaMenu({
  isOpen,
  onClose,
  anchorTop,
}: {
  isOpen: boolean;
  onClose: () => void;
  anchorTop?: number;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const { ipads, androids } = useMemo(getTablets, []);

  useEffect(() => {
    if (!isOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!panelRef.current) return;
      if (panelRef.current.contains(e.target as Node)) return;
      const trigger = (e.target as HTMLElement)?.closest?.('[data-tablet-trigger]');
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

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
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
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
            role="menu"
            aria-label="Tablets menu"
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
                gap: '14px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                <h2 style={{ fontFamily: 'var(--font-sans)', fontSize: '15px', fontWeight: 800, letterSpacing: '-0.01em', color: 'var(--black)', margin: 0 }}>
                  Shop tablets
                </h2>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close menu"
                  className="lg:hidden"
                  style={{
                    width: '32px', height: '32px',
                    borderRadius: 'var(--radius-full)',
                    background: 'var(--grey-5)',
                    border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--grey-70)',
                  }}
                >
                  <X size={16} />
                </button>
              </div>

              <Link
                to="/products?category=tablets"
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
                <span>All refurbished tablets</span>
                <ArrowRight size={14} />
              </Link>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr',
                  gap: '16px',
                }}
                className="md:!grid-cols-2"
              >
                <TabletColumn
                  icon={<Apple size={16} />}
                  title="iPads"
                  subtitle="Apple iPad, iPad Air, iPad Mini, iPad Pro"
                  models={ipads}
                  linkBuilder={(m) => `/products?brand=Apple&model=${encodeURIComponent(m)}`}
                  allHref="/products?brand=Apple&category=tablets"
                  onClose={onClose}
                />
                <TabletColumn
                  icon={<Smartphone size={16} />}
                  title="Android tablets"
                  subtitle="Samsung Galaxy Tab series"
                  models={androids}
                  linkBuilder={(m) => `/products?model=${encodeURIComponent(m)}`}
                  allHref="/products?brand=Samsung&category=tablets"
                  onClose={onClose}
                />
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function TabletColumn({
  icon, title, subtitle, models, linkBuilder, allHref, onClose,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  models: string[];
  linkBuilder: (model: string) => string;
  allHref: string;
  onClose: () => void;
}) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <span style={{ color: 'var(--grey-60)' }}>{icon}</span>
        <h3 style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', fontWeight: 800, letterSpacing: '0.02em', textTransform: 'uppercase', color: 'var(--black)', margin: 0 }}>
          {title}
        </h3>
        <span style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--grey-40)', fontWeight: 500 }}>
          · {models.length} models
        </span>
      </div>
      <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--grey-50)', margin: '0 0 10px' }}>
        {subtitle}
      </p>
      {models.length === 0 ? (
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--grey-40)', padding: '8px 0' }}>
          No models in stock right now.
        </p>
      ) : (
        <ul role="none" style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '2px', maxHeight: '280px', overflowY: 'auto' }}>
          {models.map((model) => (
            <li key={model} role="none">
              <Link
                to={linkBuilder(model)}
                role="menuitem"
                onClick={onClose}
                style={{
                  display: 'block',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--grey-70)',
                  fontFamily: 'var(--font-body)',
                  fontSize: '14px',
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
      )}
      <Link
        to={allHref}
        onClick={onClose}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          marginTop: '8px',
          fontFamily: 'var(--font-body)',
          fontSize: '12px',
          fontWeight: 600,
          color: 'var(--brand-cyan-hover)',
          textDecoration: 'none',
        }}
      >
        View all <ArrowRight size={12} />
      </Link>
    </div>
  );
}
