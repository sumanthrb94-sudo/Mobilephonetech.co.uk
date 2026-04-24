import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { MOCK_PHONES } from '../data';
import ProductCard from './ProductCard';
import type { Product } from '../types';

/**
 * SeriesRows — replaces the single FeaturedProducts grid with a stack
 * of horizontally-scrollable carousels, ordered by commercial priority:
 * iPhone 17 elite -> Samsung Galaxy S -> Galaxy Fold/Flip -> Pixel.
 * Each row previews cards with snap scroll on mobile and arrow-nav
 * controls on desktop.
 */

interface SeriesConfig {
  id: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  href: string;
  match: (p: Product) => boolean;
  sortHint?: (a: Product, b: Product) => number;
}

const year = (p: Product) => {
  const n = parseInt((p.model.match(/(\d{2,4})/) || ['0'])[0], 10);
  return isNaN(n) ? 0 : n;
};

const SERIES: SeriesConfig[] = [
  {
    id: 'iphone-17',
    eyebrow: 'The flagship',
    title: 'iPhone 17 series',
    subtitle: 'Apple\'s newest — 17, 17 Pro and 17 Pro Max, brand new and refurbished.',
    href: '/products?brand=Apple&model=iPhone%2017',
    match: (p) => p.brand === 'Apple' && /iPhone\s*17/i.test(p.model),
    sortHint: (a, b) => {
      const rank = (m: string) => /Pro\s*Max/i.test(m) ? 3 : /Pro/i.test(m) ? 2 : 1;
      return rank(b.model) - rank(a.model);
    },
  },
  {
    id: 'galaxy-s',
    eyebrow: 'Android flagship',
    title: 'Samsung Galaxy S series',
    subtitle: 'Premium Android — Galaxy S24, S23 Ultra and the rest of the S line.',
    href: '/products?brand=Samsung',
    match: (p) => p.brand === 'Samsung' && /Galaxy\s*S\d/i.test(p.model) && !/Tab/i.test(p.model),
    sortHint: (a, b) => year(b) - year(a),
  },
  {
    id: 'galaxy-fold',
    eyebrow: 'Foldables',
    title: 'Samsung Galaxy Fold & Flip',
    subtitle: 'The Z-series foldables — pocket-size closed, tablet-size open.',
    href: '/products?brand=Samsung',
    match: (p) => p.brand === 'Samsung' && /(Fold|Flip)/i.test(p.model),
    sortHint: (a, b) => year(b) - year(a),
  },
  {
    id: 'pixel',
    eyebrow: 'Pure Android',
    title: 'Google Pixel series',
    subtitle: 'Google\'s computational photography — Pixel 7 Pro back to Pixel 4a.',
    href: '/products?brand=Google',
    match: (p) => p.brand === 'Google' && /Pixel\s*\d/i.test(p.model) && !/Watch|Buds/i.test(p.model),
    sortHint: (a, b) => year(b) - year(a),
  },
];

function firstVariantProducts(configs: SeriesConfig): Product[] {
  const matching = MOCK_PHONES.filter(configs.match);
  // Dedupe by model — first match wins, so the cheapest/first storage is shown.
  const seen = new Set<string>();
  const deduped: Product[] = [];
  for (const p of matching) {
    const key = p.model.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(p);
  }
  if (configs.sortHint) deduped.sort(configs.sortHint);
  return deduped.slice(0, 10);
}

export default function SeriesRows() {
  return (
    <section
      className="section-y"
      style={{ background: 'var(--grey-5)' }}
      id="products"
    >
      <div className="container-bm" style={{ maxWidth: 'var(--container-max)' }}>
        <div style={{ marginBottom: 'var(--spacing-32)' }}>
          <div className="overline mb-3">Shop by series</div>
          <h2
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 'clamp(26px, 3vw, 36px)',
              fontWeight: 800,
              letterSpacing: '-0.025em',
              color: 'var(--black)',
              lineHeight: 1.15,
            }}
          >
            Elite first. Everything else next.
          </h2>
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '15px',
              color: 'var(--grey-50)',
              marginTop: '6px',
              maxWidth: '520px',
            }}
          >
            Start with the flagships. Swipe each row for more — every device certified, warrantied, and ready.
          </p>
        </div>

        {SERIES.map((s) => {
          const products = firstVariantProducts(s);
          if (products.length === 0) return null;
          return <SeriesRail key={s.id} config={s} products={products} />;
        })}

        <div
          style={{
            marginTop: 'var(--spacing-48)',
            paddingTop: 'var(--spacing-32)',
            borderTop: '1px solid var(--grey-20)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <Link to="/products" className="btn btn-primary btn-lg" style={{ textDecoration: 'none' }}>
            Browse all {MOCK_PHONES.length} certified devices <ArrowRight size={18} />
          </Link>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--grey-40)' }}>
            Every device includes 12-month warranty &amp; free next-day delivery
          </p>
        </div>
      </div>
    </section>
  );
}

function SeriesRail({ config, products }: { config: SeriesConfig; products: Product[] }) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  const scrollBy = (dir: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const step = el.clientWidth * 0.8;
    el.scrollBy({ left: dir * step, behavior: 'smooth' });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.4, ease: [0.2, 0, 0, 1] }}
      style={{ marginBottom: 'var(--spacing-40)' }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '14px', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0 }}>
          <div className="overline" style={{ marginBottom: '4px', color: 'var(--brand-cyan-hover)' }}>
            {config.eyebrow}
          </div>
          <h3
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 'clamp(20px, 2.4vw, 26px)',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              color: 'var(--black)',
              margin: 0,
              lineHeight: 1.15,
            }}
          >
            {config.title}
          </h3>
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '13px',
              color: 'var(--grey-50)',
              marginTop: '4px',
              maxWidth: '520px',
            }}
          >
            {config.subtitle}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={() => scrollBy(-1)}
            aria-label={`Scroll ${config.title} left`}
            className="hidden md:inline-flex"
            style={{
              width: '36px', height: '36px',
              borderRadius: '50%',
              border: '1px solid var(--grey-20)',
              background: 'var(--grey-0)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: 'var(--black)',
            }}
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={() => scrollBy(1)}
            aria-label={`Scroll ${config.title} right`}
            className="hidden md:inline-flex"
            style={{
              width: '36px', height: '36px',
              borderRadius: '50%',
              border: '1px solid var(--grey-20)',
              background: 'var(--grey-0)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: 'var(--black)',
            }}
          >
            <ChevronRight size={16} />
          </button>
          <Link
            to={config.href}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '0 12px',
              height: '36px',
              borderRadius: 'var(--radius-full)',
              border: '1px solid var(--grey-20)',
              fontFamily: 'var(--font-body)',
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--black)',
              textDecoration: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            See all <ArrowRight size={13} />
          </Link>
        </div>
      </div>

      <div
        ref={scrollerRef}
        role="list"
        aria-label={config.title}
        style={{
          display: 'flex',
          gap: '14px',
          overflowX: 'auto',
          overflowY: 'hidden',
          scrollSnapType: 'x mandatory',
          scrollBehavior: 'smooth',
          scrollbarWidth: 'none',
          paddingBottom: '4px',
          margin: '0 calc(-1 * var(--spacing-16))',
          paddingLeft: 'var(--spacing-16)',
          paddingRight: 'var(--spacing-16)',
          WebkitOverflowScrolling: 'touch',
        }}
        className="series-rail"
      >
        {products.map((p) => (
          <div
            key={p.id}
            role="listitem"
            style={{
              flex: '0 0 auto',
              width: 'clamp(220px, 62vw, 280px)',
              scrollSnapAlign: 'start',
            }}
          >
            <ProductCard phone={p} />
          </div>
        ))}
      </div>
    </motion.div>
  );
}
