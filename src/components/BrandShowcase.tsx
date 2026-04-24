import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { MOCK_PHONES } from '../data';
import ProductCard from './ProductCard';
import ProductImage from './ProductImage';
import { useBreakpoint } from '../hooks/useBreakpoint';
import type { Product } from '../types';

/**
 * BrandShowcase — the homepage body below the Hero carousel. Renders
 * each series (iPhone 17, Galaxy S, Galaxy Fold & Flip, Pixel) as its
 * own full-bleed hero-style panel: brand-coloured background, flagship
 * product hero on one side, eyebrow/headline/subline/CTA on the other.
 * Below each panel sits a horizontal-scroll rail of that series'
 * products so the panel is both editorial and shoppable.
 */

interface SeriesPanel {
  id: string;
  eyebrow: string;
  headline: string;
  subline: string;
  ctaLabel: string;
  ctaHref: string;
  bgFrom: string;
  bgAccent: string;
  headlineColor: string;
  bodyColor: string;
  match: (p: Product) => boolean;
  sortHint?: (a: Product, b: Product) => number;
}

const year = (p: Product) => {
  const n = parseInt((p.model.match(/(\d{2,4})/) || ['0'])[0], 10);
  return isNaN(n) ? 0 : n;
};
const proRank = (m: string) => /Pro\s*Max/i.test(m) ? 3 : /Pro|Ultra/i.test(m) ? 2 : 1;

const PANELS: SeriesPanel[] = [
  {
    id: 'iphone-17',
    eyebrow: 'iPhone 17 Series',
    headline: 'Apple\'s flagship.\nNew and refurbished.',
    subline: 'The iPhone 17, 17 Pro and 17 Pro Max — tested, certified and backed by a 12-month warranty.',
    ctaLabel: 'Shop iPhone 17',
    ctaHref: `/products?brand=Apple&model=${encodeURIComponent('iPhone 17')}`,
    bgFrom: '#eef2ff',
    bgAccent: '#c7d2fe',
    headlineColor: 'var(--brand-header)',
    bodyColor: 'var(--grey-70)',
    match: (p) => p.brand === 'Apple' && /iPhone\s*17/i.test(p.model),
    sortHint: (a, b) => proRank(b.model) - proRank(a.model),
  },
  {
    id: 'galaxy-s',
    eyebrow: 'Samsung Galaxy S',
    headline: 'Android flagship.\nFrom £199.',
    subline: 'The S series — Galaxy S24, S23 Ultra and earlier flagships. Grade A refurbished, unbeatable prices.',
    ctaLabel: 'Shop Galaxy S',
    ctaHref: `/products?brand=Samsung&model=${encodeURIComponent('Samsung Galaxy S')}`,
    bgFrom: '#faf5ff',
    bgAccent: '#e9d5ff',
    headlineColor: 'var(--brand-header)',
    bodyColor: 'var(--grey-70)',
    match: (p) => p.brand === 'Samsung' && /Galaxy\s*S\d/i.test(p.model) && !/Tab/i.test(p.model),
    sortHint: (a, b) => year(b) - year(a),
  },
  {
    id: 'galaxy-fold',
    eyebrow: 'Galaxy Z Fold & Flip',
    headline: 'Foldable future,\npocket-sized today.',
    subline: 'Unfold to a tablet, fold back to a phone — Galaxy Z Fold and Flip at refurbished prices.',
    ctaLabel: 'Shop foldables',
    ctaHref: `/products?brand=Samsung&model=${encodeURIComponent('Samsung Galaxy Z')}`,
    bgFrom: '#fef3c7',
    bgAccent: '#fde68a',
    headlineColor: 'var(--brand-header)',
    bodyColor: 'var(--grey-70)',
    match: (p) => p.brand === 'Samsung' && /(Fold|Flip)/i.test(p.model),
    sortHint: (a, b) => year(b) - year(a),
  },
  {
    id: 'pixel',
    eyebrow: 'Google Pixel',
    headline: 'Pure Android.\nPixel-perfect price.',
    subline: 'Google Pixel devices fully tested, certified and ready for their next owner.',
    ctaLabel: 'Shop Pixel',
    ctaHref: `/products?brand=Google&model=${encodeURIComponent('Google Pixel')}`,
    bgFrom: '#e0f7fa',
    bgAccent: '#b3e5fc',
    headlineColor: 'var(--brand-header)',
    bodyColor: 'var(--grey-70)',
    match: (p) => p.brand === 'Google' && /Pixel\s*\d/i.test(p.model) && !/Watch|Buds/i.test(p.model),
    sortHint: (a, b) => year(b) - year(a),
  },
];

function getSeriesProducts(panel: SeriesPanel): Product[] {
  const matching = MOCK_PHONES.filter(panel.match);
  const seen = new Set<string>();
  const deduped: Product[] = [];
  for (const p of matching) {
    const key = p.model.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(p);
  }
  if (panel.sortHint) deduped.sort(panel.sortHint);
  return deduped.slice(0, 10);
}

export default function BrandShowcase() {
  return (
    <div id="products">
      {PANELS.map((panel) => {
        const products = getSeriesProducts(panel);
        if (products.length === 0) return null;
        return <Panel key={panel.id} panel={panel} products={products} />;
      })}
    </div>
  );
}

function Panel({ panel, products }: { panel: SeriesPanel; products: Product[] }) {
  const { isDesktop } = useBreakpoint();
  const hero = products[0];

  return (
    <section
      aria-label={`${panel.eyebrow} — shop the series`}
      style={{
        width: '100%',
        position: 'relative',
        overflow: 'hidden',
        background: `linear-gradient(135deg, ${panel.bgAccent} 0%, ${panel.bgFrom} 55%)`,
      }}
    >
      {/* subtle top-right glow, mirrors the Hero treatment */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: 0, right: 0,
          width: '50%',
          height: '100%',
          background: 'linear-gradient(135deg, transparent 0%, rgba(255,255,255,0.25) 100%)',
          pointerEvents: 'none',
        }}
      />

      <div
        className="container-bm"
        style={{
          maxWidth: 'var(--container-max)',
          paddingTop: isDesktop ? 'var(--spacing-40)' : 'var(--spacing-24)',
          paddingBottom: isDesktop ? 'var(--spacing-40)' : 'var(--spacing-24)',
          position: 'relative',
          zIndex: 2,
        }}
      >
        {/* Editorial row — text + flagship hero shot */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.5, ease: [0.2, 0, 0, 1] }}
          style={{
            display: 'grid',
            gridTemplateColumns: isDesktop ? 'minmax(0, 1.2fr) minmax(0, 1fr)' : '1.4fr 1fr',
            gap: isDesktop ? '24px' : '14px',
            alignItems: 'center',
            marginBottom: isDesktop ? 'var(--spacing-32)' : 'var(--spacing-20)',
          }}
        >
          {/* Text block */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'flex-start',
              textAlign: 'left',
              order: 1,
              minWidth: 0,
            }}
          >
            <div
              className="overline"
              style={{ marginBottom: '6px', color: panel.headlineColor, fontSize: '10px' }}
            >
              {panel.eyebrow}
            </div>
            <h2
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: 'clamp(18px, 3vw, 28px)',
                fontWeight: 800,
                letterSpacing: '-0.02em',
                lineHeight: 1.15,
                color: panel.headlineColor,
                whiteSpace: 'pre-line',
                margin: '0 0 6px 0',
              }}
            >
              {panel.headline}
            </h2>
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '12px',
                color: panel.bodyColor,
                maxWidth: '420px',
                margin: '0 0 12px 0',
                lineHeight: 1.4,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {panel.subline}
            </p>
            <Link
              to={panel.ctaHref}
              className="btn btn-primary btn-sm"
              style={{ textDecoration: 'none' }}
            >
              {panel.ctaLabel} <ArrowRight size={14} />
            </Link>
          </div>

          {/* Flagship hero shot — compact rectangle so more of the page
              can fit above the fold. Landscape aspect instead of square
              keeps each panel half its previous height. */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              order: 2,
            }}
          >
            <div
              style={{
                width: '100%',
                maxWidth: isDesktop ? '220px' : '150px',
                aspectRatio: '4 / 3',
                background: 'rgba(255,255,255,0.55)',
                borderRadius: 'var(--radius-lg)',
                padding: 'clamp(8px, 1.5vw, 14px)',
                boxShadow: '0 12px 24px rgba(0,0,0,0.08)',
              }}
            >
              <ProductImage
                brand={hero.brand}
                model={hero.model}
                category={hero.category}
                imageUrl={hero.imageUrl}
                alt={hero.model}
              />
            </div>
          </div>
        </motion.div>

        {/* Product rail under the editorial */}
        <ProductRail products={products} title={panel.eyebrow} seeAllHref={panel.ctaHref} />
      </div>
    </section>
  );
}

function ProductRail({
  products, title, seeAllHref,
}: { products: Product[]; title: string; seeAllHref: string }) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  const scrollBy = (dir: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: 'smooth' });
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', gap: '8px' }}>
        <h3
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: '14px',
            fontWeight: 800,
            letterSpacing: '0.02em',
            textTransform: 'uppercase',
            color: 'var(--brand-header)',
            margin: 0,
          }}
        >
          Explore {title.toLowerCase()}
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={() => scrollBy(-1)}
            aria-label={`Scroll ${title} left`}
            className="hidden md:inline-flex"
            style={{
              width: '34px', height: '34px',
              borderRadius: '50%',
              border: '1px solid rgba(0,0,0,0.12)',
              background: 'rgba(255,255,255,0.75)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: 'var(--black)',
              backdropFilter: 'blur(6px)',
            }}
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={() => scrollBy(1)}
            aria-label={`Scroll ${title} right`}
            className="hidden md:inline-flex"
            style={{
              width: '34px', height: '34px',
              borderRadius: '50%',
              border: '1px solid rgba(0,0,0,0.12)',
              background: 'rgba(255,255,255,0.75)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: 'var(--black)',
              backdropFilter: 'blur(6px)',
            }}
          >
            <ChevronRight size={16} />
          </button>
          <Link
            to={seeAllHref}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '0 12px',
              height: '34px',
              borderRadius: 'var(--radius-full)',
              border: '1px solid rgba(0,0,0,0.12)',
              background: 'rgba(255,255,255,0.75)',
              fontFamily: 'var(--font-body)',
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--black)',
              textDecoration: 'none',
              whiteSpace: 'nowrap',
              backdropFilter: 'blur(6px)',
            }}
          >
            See all <ArrowRight size={13} />
          </Link>
        </div>
      </div>

      <div
        ref={scrollerRef}
        role="list"
        aria-label={`${title} products`}
        className="series-rail"
        style={{
          display: 'flex',
          alignItems: 'stretch',
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
      >
        {products.map((p) => (
          <div
            key={p.id}
            role="listitem"
            style={{
              flex: '0 0 auto',
              width: 'clamp(220px, 62vw, 280px)',
              scrollSnapAlign: 'start',
              display: 'flex',
            }}
          >
            <ProductCard phone={p} />
          </div>
        ))}
      </div>
    </div>
  );
}
