import { MOCK_PHONES } from '../data';
import ProductCard from './ProductCard';
import { ArrowRight, SlidersHorizontal } from 'lucide-react';
import { motion } from 'motion/react';
import React from 'react';

const BRAND_TABS = [
  { id: 'all',      label: 'All devices' },
  { id: 'Apple',    label: 'Apple' },
  { id: 'Samsung',  label: 'Samsung' },
  { id: 'Google',   label: 'Google' },
];

export default function FeaturedProducts() {
  const [activeTab, setActiveTab] = React.useState('all');

  const filtered = activeTab === 'all'
    ? MOCK_PHONES.slice(0, 8)
    : MOCK_PHONES.filter((p) => p.brand === activeTab).slice(0, 8);

  return (
    <section
      className="py-12 md:py-20"
      style={{ background: 'var(--grey-5)' }}
      id="products"
    >
      <div className="container-bm" style={{ maxWidth: 'var(--container-max)' }}>

        {/* ── Section header ──────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
          <div>
            <div className="overline mb-3">Certified selection</div>
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
              Devices you'll actually want.
            </h2>
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '15px',
                color: 'var(--grey-50)',
                marginTop: '6px',
                maxWidth: '440px',
              }}
            >
              Hand-picked refurbished phones — tested, certified, and ready for their next owner.
            </p>
          </div>
          <a
            href="/products"
            id="products-view-all"
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
            View all {MOCK_PHONES.length} devices <ArrowRight size={15} />
          </a>
        </div>

        {/* ── Brand filter tabs — BM pill tab bar ── */}
        <div
          className="flex items-center gap-2 mb-8 overflow-x-auto pb-1"
          style={{ scrollbarWidth: 'none' }}
          role="tablist"
          aria-label="Filter by brand"
        >
          {BRAND_TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveTab(tab.id)}
                id={`brand-tab-${tab.id}`}
                style={{
                  flexShrink: 0,
                  height: '36px',
                  padding: '0 16px',
                  borderRadius: 'var(--radius-full)',
                  fontFamily: 'var(--font-body)',
                  fontSize: '14px',
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? 'var(--grey-0)' : 'var(--grey-60)',
                  background: isActive ? 'var(--brand-cyan)' : 'var(--grey-0)',
                  border: `1.5px solid ${isActive ? 'var(--brand-cyan)' : 'var(--grey-20)'}`,
                  cursor: 'pointer',
                  transition: 'all var(--duration-fast) var(--ease-default)',
                  whiteSpace: 'nowrap',
                }}
              >
                {tab.label}
              </button>
            );
          })}

          {/* Spacer + filter icon */}
          <div style={{ marginLeft: 'auto', flexShrink: 0 }}>
            <button
              className="btn btn-secondary btn-sm flex items-center gap-2"
              id="products-filter-btn"
              aria-label="Filter and sort"
            >
              <SlidersHorizontal size={14} />
              Filter
            </button>
          </div>
        </div>

        {/* ── Product Grid ── BM spec: 2-col tablet, 3-4-col desktop ── */}
        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filtered.map((phone, index) => (
              <motion.div
                key={phone.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-30px' }}
                transition={{
                  delay: Math.min(index, 3) * 0.07,
                  duration: 0.4,
                  ease: [0.2, 0, 0, 1],
                }}
              >
                <ProductCard phone={phone} />
              </motion.div>
            ))}
          </div>
        ) : (
          <div
            style={{
              textAlign: 'center',
              padding: 'var(--spacing-64) 0',
              color: 'var(--grey-40)',
              fontFamily: 'var(--font-body)',
              fontSize: '15px',
            }}
          >
            No devices found for this brand yet. More coming soon.
          </div>
        )}

        {/* ── Bottom CTA ───────────────────────── */}
        <div
          style={{
            marginTop: 'var(--spacing-48)',
            paddingTop: 'var(--spacing-40)',
            borderTop: '1px solid var(--grey-20)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <a
            href="/products"
            className="btn btn-primary btn-lg"
            id="products-see-all-btn"
            style={{ textDecoration: 'none' }}
          >
            Browse all {MOCK_PHONES.length} certified devices <ArrowRight size={18} />
          </a>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--grey-40)' }}>
            Every device includes 12-month warranty &amp; free next-day delivery
          </p>
        </div>

      </div>
    </section>
  );
}
