import { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Smartphone, Tablet, Headphones, Monitor, Volume2, Gamepad2, Watch } from 'lucide-react';
import { MOCK_CATEGORIES } from '../data';
import CategoryIllustration from './CategoryIllustration';

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  smartphones: Smartphone,
  tablets: Tablet,
  accessories: Headphones,
  computing: Monitor,
  hearables: Headphones,
  speakers: Volume2,
  playables: Gamepad2,
  wearables: Watch,
};

/**
 * CategoryGrid — Redesigned with icon-chip scroll rail + clean card grid
 */
export default function CategoryGrid() {
  const [hoveredChip, setHoveredChip] = useState<string | null>(null);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const gridCategories = MOCK_CATEGORIES.slice(0, 6);

  return (
    <section
      style={{ background: '#ffffff', paddingTop: 'var(--spacing-48)', paddingBottom: 'var(--spacing-48)' }}
      id="categories"
    >
      <div className="container-bm" style={{ maxWidth: 'var(--container-max)' }}>

        {/* ── Section Header ──────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 gap-4">
          <div>
            <div className="overline mb-3">Shop by department</div>
            <h2 style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 'clamp(26px, 3vw, 36px)',
              fontWeight: 800,
              letterSpacing: '-0.025em',
              color: 'var(--black)',
            }}>
              What are you looking for?
            </h2>
            <p style={{
              fontFamily: 'var(--font-body)',
              fontSize: '15px',
              color: 'var(--grey-50)',
              marginTop: '6px',
              maxWidth: '480px',
            }}>
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

        {/* ── Chip scroll rail ──────────────────── */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '10px',
          marginBottom: '40px',
          overflowX: 'auto',
          paddingBottom: '4px',
        }}>
          {MOCK_CATEGORIES.map((cat) => {
            const IconComponent = CATEGORY_ICONS[cat.id] ?? Smartphone;
            const isActive = hoveredChip === cat.id;
            return (
              <a
                key={cat.id}
                href={`/products?category=${cat.id}`}
                onMouseEnter={() => setHoveredChip(cat.id)}
                onMouseLeave={() => setHoveredChip(null)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  height: '44px',
                  padding: '0 20px',
                  borderRadius: '999px',
                  border: isActive ? '1px solid var(--black)' : '1px solid #E5E7EB',
                  background: isActive ? 'var(--black)' : 'white',
                  fontFamily: 'var(--font-sans)',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: isActive ? 'white' : '#374151',
                  textDecoration: 'none',
                  cursor: 'pointer',
                  flexShrink: 0,
                  transition: 'background 0.18s, color 0.18s, border-color 0.18s',
                }}
              >
                <IconComponent size={16} />
                {cat.name}
              </a>
            );
          })}
        </div>

        {/* ── Category card grid ──────────────────── */}
        <div
          className="grid grid-cols-2 lg:grid-cols-3"
          style={{ gap: '20px' }}
        >
          {gridCategories.map((cat, i) => {
            const isCardHovered = hoveredCard === cat.id;
            return (
              <motion.a
                key={cat.id}
                href={`/products?category=${cat.id}`}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.4, ease: [0.2, 0, 0, 1] }}
                onMouseEnter={() => setHoveredCard(cat.id)}
                onMouseLeave={() => setHoveredCard(null)}
                id={`category-card-${cat.id}`}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  textDecoration: 'none',
                  overflow: 'hidden',
                  background: 'white',
                  borderRadius: '16px',
                  border: '1px solid #E5E7EB',
                  cursor: 'pointer',
                  transition: 'box-shadow 0.22s ease, transform 0.22s ease',
                  boxShadow: isCardHovered
                    ? '0 12px 40px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.06)'
                    : '0 1px 4px rgba(0,0,0,0.04)',
                  transform: isCardHovered ? 'translateY(-4px)' : 'translateY(0)',
                }}
              >
                {/* Illustration */}
                <div style={{ height: '160px', overflow: 'hidden', position: 'relative' }}>
                  <CategoryIllustration category={cat.id || cat.name} rounded={false} />
                </div>

                {/* Body */}
                <div style={{ padding: '16px 20px' }}>
                  <h3 style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: '16px',
                    fontWeight: 700,
                    letterSpacing: '-0.015em',
                    color: 'var(--black)',
                    marginBottom: '2px',
                  }}>
                    {cat.name}
                  </h3>
                  <p style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '13px',
                    color: 'var(--grey-50)',
                  }}>
                    {cat.productCount}+ devices
                  </p>
                </div>
              </motion.a>
            );
          })}
        </div>
      </div>
    </section>
  );
}
