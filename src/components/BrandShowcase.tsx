import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { useCatalogue } from '../context/CatalogueContext';
import ProductCard from './ProductCard';
import ProductImage from './ProductImage';
import { useBreakpoint } from '../hooks/useBreakpoint';
import {
  BUILT_IN_PANELS, listLivePanels, panelProducts, type SeriesPanel,
} from '../lib/seriesPanels';
import type { Product } from '../types';

/**
 * BrandShowcase — the editorial body below the Hero carousel. Each series
 * (iPhone 17, Galaxy S, Fold & Flip, Pixel, or whatever staff have since
 * added) gets a full-bleed panel: alternating light/dark stone surface with
 * a gold accent, the flagship product on one side and the copy on the other,
 * above a scrollable rail of that series' products.
 *
 * The panels are staff-editable from /admin/series — see
 * src/lib/seriesPanels.ts, which owns their shape, the rule deciding which
 * products belong to each, and the built-in set this falls back to. A single
 * panel renders through SeriesPanelView below, which the admin preview uses
 * directly so that what staff approve is what visitors get.
 */

export default function BrandShowcase() {
  const { products: catalogue } = useCatalogue();

  // The built-ins, not an empty list: the panels are most of the home page,
  // so the first paint is the real thing and the stored set only ever
  // replaces it. listLivePanels resolves to these on any failure too.
  const [panels, setPanels] = useState<SeriesPanel[]>(BUILT_IN_PANELS);

  useEffect(() => {
    let cancelled = false;
    listLivePanels().then(next => { if (!cancelled) setPanels(next); });
    return () => { cancelled = true; };
  }, []);

  return (
    <div id="products">
      {panels.map((panel) => {
        const products = panelProducts(catalogue, panel);
        // A panel whose rule matches nothing is simply not rendered, which is
        // what makes a mistyped rule harmless rather than a broken page.
        if (products.length === 0) return null;
        return <SeriesPanelView key={panel.id} panel={panel} products={products} />;
      })}
    </div>
  );
}

/** Stone + gold surface treatment for a panel, keyed off its tone. */
function toneStyles(tone: SeriesPanel['tone']) {
  const dark = tone === 'dark';
  return {
    background: dark
      ? 'linear-gradient(135deg, var(--grey-90) 0%, var(--black) 60%)'
      : 'linear-gradient(135deg, var(--grey-5) 0%, var(--grey-0) 60%)',
    border: dark ? 'var(--black)' : 'var(--grey-10)',
    // The accent glow is gold in both tones; only its strength changes so it
    // stays visible on stone-black without blowing out on stone-white.
    glow: dark ? 'rgba(161, 98, 7, 0.22)' : 'rgba(161, 98, 7, 0.10)',
    dot: dark ? 'rgba(255,255,255,0.05)' : 'rgba(12,10,9,0.045)',
    eyebrow: dark ? 'var(--brand-cyan)' : 'var(--brand-cyan-hover)',
    headline: dark ? 'var(--grey-0)' : 'var(--black)',
    body: dark ? 'var(--grey-30)' : 'var(--grey-70)',
    // Gold CTA on the dark panels, stone-black on the light ones — each is the
    // highest-contrast option against its own surface.
    ctaBg: dark ? 'var(--brand-cyan)' : 'var(--black)',
    ctaFg: dark ? 'var(--black)' : 'var(--grey-0)',
    frame: dark ? 'rgba(255,255,255,0.06)' : 'var(--grey-0)',
    frameShadow: dark ? '0 12px 32px rgba(0,0,0,0.45)' : '0 12px 24px rgba(12,10,9,0.08)',
  };
}

/**
 * One series panel.
 *
 * Exported because the admin preview renders this exact component rather
 * than a copy of it — the same reason HeroCarousel was pulled out of Hero.
 * A preview that is a separate implementation is a preview that can lie.
 */
export function SeriesPanelView({ panel, products }: { panel: SeriesPanel; products: Product[] }) {
  const { isDesktop } = useBreakpoint();
  const hero = products[0];
  const t = toneStyles(panel.tone);

  return (
    <section
      aria-label={`${panel.eyebrow} — shop the series`}
      data-tone={panel.tone}
      style={{
        width: '100%',
        position: 'relative',
        overflow: 'hidden',
        background: t.background,
        borderBottom: `1px solid ${t.border}`,
      }}
    >
      {/* Gold corner glow, mirroring the Hero treatment */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: 0, right: 0,
          width: '50%',
          height: '100%',
          background: `radial-gradient(60% 80% at 80% 20%, ${t.glow} 0%, transparent 70%)`,
          pointerEvents: 'none',
        }}
      />
      <div aria-hidden style={{
        position: 'absolute', inset: 0,
        backgroundImage: `radial-gradient(circle, ${t.dot} 1px, transparent 1px)`,
        backgroundSize: '24px 24px',
        pointerEvents: 'none',
      }} />

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
              style={{ marginBottom: '6px', color: t.eyebrow, fontSize: '10px' }}
            >
              {panel.eyebrow}
            </div>
            <h2
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: 'clamp(22px, 3.2vw, 34px)',
                fontWeight: 900,
                letterSpacing: '-0.02em',
                lineHeight: 1.15,
                color: t.headline,
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
                color: t.body,
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
              style={{ textDecoration: 'none', background: t.ctaBg, borderColor: t.ctaBg, color: t.ctaFg }}
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
                background: t.frame,
                borderRadius: 'var(--radius-lg)',
                padding: 'clamp(8px, 1.5vw, 14px)',
                boxShadow: t.frameShadow,
              }}
            >
              <ProductImage
                brand={hero.brand}
                model={hero.model}
                category={hero.category}
                imageUrl={panel.heroImage ?? hero.imageUrl}
                alt={hero.model}
              />
            </div>
          </div>
        </motion.div>

        {/* Product rail under the editorial */}
        <ProductRail products={products} title={panel.eyebrow} seeAllHref={panel.ctaHref} tone={panel.tone} />
      </div>
    </section>
  );
}

function ProductRail({
  products, title, seeAllHref, tone,
}: { products: Product[]; title: string; seeAllHref: string; tone: SeriesPanel['tone'] }) {
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
            fontSize: '11px',
            fontWeight: 800,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            // The rail sits on the panel surface, so its heading follows the
            // panel tone rather than the global header colour.
            color: tone === 'dark' ? 'var(--grey-30)' : 'var(--brand-header)',
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
              background: 'white',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: 'var(--black)',
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
              background: 'white',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: 'var(--black)',
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
              background: 'white',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
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
              // 56vw showed less than two cards on a 390px phone, so each
              // rail read as one enormous tile you had to scroll to discover
              // was a rail at all. 42vw shows two and the edge of a third —
              // enough to say "there are more of these" without a hint arrow.
              width: 'clamp(150px, 42vw, 240px)',
              scrollSnapAlign: 'start',
              display: 'flex',
            }}
          >
            <ProductCard phone={p} compact />
          </div>
        ))}
      </div>
    </div>
  );
}
