import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

export interface Crumb {
  label: string;
  to?: string;
}

/**
 * Breadcrumbs — semantic nav with chevron separators. Last crumb is rendered
 * as the current page (aria-current="page") and is non-navigable.
 */
export default function Breadcrumbs({ items }: { items: Crumb[] }) {
  if (items.length === 0) return null;
  return (
    <nav aria-label="Breadcrumb" style={{ marginBottom: 'var(--spacing-16)' }}>
      <ol
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '4px',
          listStyle: 'none',
          margin: 0,
          padding: 0,
          fontFamily: 'var(--font-body)',
          fontSize: '13px',
          color: 'var(--grey-50)',
        }}
      >
        {items.map((item, idx) => {
          const isLast = idx === items.length - 1;
          return (
            <li key={`${item.label}-${idx}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              {item.to && !isLast ? (
                <Link
                  to={item.to}
                  style={{ color: 'var(--grey-60)', textDecoration: 'none', fontWeight: 500 }}
                >
                  {item.label}
                </Link>
              ) : (
                <span aria-current={isLast ? 'page' : undefined} style={{ color: isLast ? 'var(--black)' : 'var(--grey-60)', fontWeight: isLast ? 600 : 500 }}>
                  {item.label}
                </span>
              )}
              {!isLast && <ChevronRight size={13} style={{ color: 'var(--grey-30)' }} />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
