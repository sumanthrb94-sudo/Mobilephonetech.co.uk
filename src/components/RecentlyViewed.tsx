import React from 'react';
import { useRecentlyViewed } from '../hooks/useRecentlyViewed';
import { MOCK_PHONES } from '../data';
import ProductCard from './ProductCard';

/**
 * RecentlyViewed — horizontal rail of the last ~12 products the user opened.
 * Falls back to null when empty or when there's only the current product.
 */
export default function RecentlyViewed({ excludeId }: { excludeId?: string }) {
  const { ids, clear } = useRecentlyViewed();
  const items = ids
    .filter((id) => id !== excludeId)
    .map((id) => MOCK_PHONES.find((p) => p.id === id))
    .filter(Boolean) as typeof MOCK_PHONES;

  if (items.length === 0) return null;

  return (
    <section aria-label="Recently viewed" style={{ paddingTop: 'var(--spacing-48)', paddingBottom: 'var(--spacing-48)', borderTop: '1px solid var(--grey-10)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--spacing-24)', gap: '16px' }}>
        <h2 style={{ fontFamily: 'var(--font-sans)', fontSize: 'clamp(20px, 2.5vw, 28px)', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--black)', margin: 0 }}>
          Recently viewed
        </h2>
        <button
          onClick={clear}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 600,
            color: 'var(--grey-50)',
          }}
        >
          Clear history
        </button>
      </div>
      <div
        style={{
          display: 'grid',
          gridAutoFlow: 'column',
          gridAutoColumns: 'minmax(220px, 1fr)',
          gap: '16px',
          overflowX: 'auto',
          paddingBottom: '8px',
          scrollSnapType: 'x mandatory',
        }}
      >
        {items.map((p) => (
          <div key={p.id} style={{ scrollSnapAlign: 'start' }}>
            <ProductCard phone={p} />
          </div>
        ))}
      </div>
    </section>
  );
}
