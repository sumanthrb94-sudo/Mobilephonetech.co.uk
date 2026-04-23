import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { MOCK_CATEGORIES } from '../data';
import CategoryIllustration from './CategoryIllustration';

/**
 * CategoryGrid — BM spec Section 4
 * Layout: 2 large cards top row, 3 smaller cards bottom row
 * White bg, subtle border, product image (contained), heading-3, body-2, hover lift
 */
export default function CategoryGrid() {
  const topTwo   = MOCK_CATEGORIES.slice(0, 2);
  const remainingCategories = MOCK_CATEGORIES.slice(2);

  const LargeCard = ({ category, index }: { category: typeof MOCK_CATEGORIES[0]; index: number }) => (
    <motion.a
      href={`/products?category=${category.id}`}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1, duration: 0.4, ease: [0.2, 0, 0, 1] }}
      className="card card-xl"
      style={{
        display: 'flex',
        flexDirection: 'column',
        textDecoration: 'none',
        overflow: 'hidden',
        cursor: 'pointer',
      }}
      id={`category-large-${category.id}`}
    >
      {/* Claude-designed SVG category illustration */}
      <div
        style={{
          height: '220px',
          overflow: 'hidden',
          position: 'relative',
        }}
        className="category-img-wrap"
      >
        <CategoryIllustration category={category.id || category.name} rounded={false} />
      </div>

      {/* Body */}
      <div style={{ padding: 'var(--spacing-24)' }}>
        <div className="flex items-center justify-between">
          <div>
            <h3
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: '20px',
                fontWeight: 700,
                letterSpacing: '-0.02em',
                color: 'var(--black)',
                marginBottom: '4px',
              }}
            >
              {category.name}
            </h3>
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '14px',
                color: 'var(--grey-50)',
              }}
            >
              {category.productCount}+ models available
            </p>
          </div>
          <div
            style={{
              width: '40px',
              height: '40px',
              background: 'var(--grey-5)',
              border: '1px solid var(--grey-20)',
              borderRadius: 'var(--radius-full)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all var(--duration-fast)',
              flexShrink: 0,
            }}
            className="card-arrow"
          >
            <ArrowRight size={18} style={{ color: 'var(--black)' }} />
          </div>
        </div>
      </div>
    </motion.a>
  );

  const SmallCard = ({ category, index }: { category: typeof MOCK_CATEGORIES[0]; index: number }) => (
    <motion.a
      href={`/products?category=${category.id}`}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: 0.2 + index * 0.1, duration: 0.4, ease: [0.2, 0, 0, 1] }}
      className="card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        textDecoration: 'none',
        overflow: 'hidden',
        cursor: 'pointer',
      }}
      id={`category-small-${category.id}`}
    >
      {/* Claude-designed SVG category illustration */}
      <div style={{ height: '160px', overflow: 'hidden' }}>
        <CategoryIllustration category={category.id || category.name} rounded={false} />
      </div>

      {/* Body */}
      <div style={{ padding: 'var(--spacing-16) var(--spacing-20)' }}>
        <h3
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: '16px',
            fontWeight: 700,
            letterSpacing: '-0.015em',
            color: 'var(--black)',
            marginBottom: '2px',
          }}
        >
          {category.name}
        </h3>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--grey-50)' }}>
          {category.productCount}+ devices
        </p>
      </div>
    </motion.a>
  );

  return (
    <section
      className="section-y"
      style={{ background: 'var(--grey-0)' }}
      id="categories"
    >
      <div
        className="container-bm"
        style={{ maxWidth: 'var(--container-max)' }}
      >
        {/* ── Section Header ──────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 gap-4">
          <div>
            <div className="overline mb-3">Shop by department</div>
            <h2 style={{ fontFamily: 'var(--font-sans)', fontSize: 'clamp(26px, 3vw, 36px)', fontWeight: 800, letterSpacing: '-0.025em', color: 'var(--black)' }}>
              What are you looking for?
            </h2>
            <p
              style={{ fontFamily: 'var(--font-body)', fontSize: '15px', color: 'var(--grey-50)', marginTop: '6px', maxWidth: '480px' }}
            >
              Every device certified and priced below retail — discover your category.
            </p>
          </div>
          <a
            href="/products"
            id="category-view-all"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontFamily: 'var(--font-body)',
              fontSize: '14px',
              fontWeight: 600,
              color: 'var(--grey-60)',
              textDecoration: 'none',
              whiteSpace: 'nowrap',
              transition: 'color var(--duration-fast)',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--black)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--grey-60)'; }}
          >
            View all <ArrowRight size={15} />
          </a>
        </div>

        {/* ── Row 1: 2 large cards ─────────────── */}
        <div
          className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5"
          style={{ marginBottom: '20px' }}
        >
          {topTwo.map((cat, i) => (
            <LargeCard key={cat.id} category={cat} index={i} />
          ))}
        </div>

        {/* ── Row 2: supporting departments ───────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-5">
          {remainingCategories.map((cat, i) => (
            <SmallCard key={cat.id} category={cat} index={i} />
          ))}
        </div>
      </div>

      {/* Hover style via global */}
      <style>{`
        .category-img-wrap > div { transition: transform var(--duration-slow) var(--ease-default); }
        a:hover .category-img-wrap > div { transform: scale(1.05); }
        a:hover .card-arrow { background: var(--black) !important; border-color: var(--black) !important; }
        a:hover .card-arrow svg { color: white !important; }
      `}</style>
    </section>
  );
}
