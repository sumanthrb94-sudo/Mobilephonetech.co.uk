import { Link } from 'react-router-dom';
import { ShoppingBag, ArrowRight, Search } from 'lucide-react';
import { useSeo, SITE_ORIGIN } from '../hooks/useSeo';

/**
 * NotFound — catches every URL that no other route matches, so a
 * typo or stale link lands on an intentional dead-end with routes
 * back into shop instead of a blank body. Emits noindex so Google
 * doesn't index typo URLs.
 */

export default function NotFound() {
  useSeo({
    title: '404 — Page not found | MobileTech',
    description:
      'The page you tried to reach doesn\'t exist anymore. Browse refurbished phones, tablets and tech from MobileTech UK.',
    canonical: `${SITE_ORIGIN}/`,
    noindex: true,
  });

  return (
    <section
      style={{
        minHeight: 'calc(100vh - var(--nav-total) - 64px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--spacing-40) var(--spacing-16)',
        background: 'var(--grey-0)',
      }}
    >
      <div style={{ maxWidth: '520px', width: '100%', textAlign: 'center' }}>
        <div
          aria-hidden
          style={{
            width: '88px',
            height: '88px',
            borderRadius: '50%',
            background: 'var(--color-brand-subtle)',
            color: 'var(--brand-cyan-hover)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 'var(--spacing-24)',
          }}
        >
          <Search size={36} strokeWidth={2} />
        </div>

        <div
          className="overline"
          style={{ marginBottom: '8px', color: 'var(--brand-cyan-hover)' }}
        >
          Error 404
        </div>
        <h1
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 'clamp(28px, 4vw, 38px)',
            fontWeight: 800,
            letterSpacing: '-0.02em',
            lineHeight: 1.1,
            color: 'var(--brand-header)',
            margin: '0 0 12px',
          }}
        >
          This page took a day off.
        </h1>
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '15px',
            color: 'var(--grey-60)',
            lineHeight: 1.55,
            margin: '0 0 var(--spacing-32)',
          }}
        >
          The link you followed might be old, or the page might have moved. Pick up from any of the places below.
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr',
            gap: '10px',
            marginBottom: 'var(--spacing-24)',
          }}
          className="sm:grid-cols-2"
        >
          <Link to="/products" className="btn btn-primary btn-lg btn-full" style={{ textDecoration: 'none' }}>
            <ShoppingBag size={18} /> Browse all devices
          </Link>
          <Link to="/" className="btn btn-secondary btn-lg btn-full" style={{ textDecoration: 'none' }}>
            Back home <ArrowRight size={18} />
          </Link>
        </div>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: '8px 16px',
            fontFamily: 'var(--font-body)',
            fontSize: '13px',
          }}
        >
          {[
            { href: '/products?brand=Apple',   label: 'iPhone' },
            { href: '/products?brand=Samsung', label: 'Samsung Galaxy' },
            { href: '/products?brand=Google',  label: 'Google Pixel' },
            { href: '/products?category=tablets', label: 'Tablets' },
            { href: '/faq',    label: 'Help centre' },
            { href: '/orders', label: 'My orders' },
          ].map((l) => (
            <Link
              key={l.href}
              to={l.href}
              style={{
                color: 'var(--grey-60)',
                textDecoration: 'none',
                fontWeight: 500,
                borderBottom: '1px solid transparent',
                transition: 'color var(--duration-fast), border-color var(--duration-fast)',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.color = 'var(--black)';
                (e.currentTarget as HTMLAnchorElement).style.borderBottomColor = 'var(--grey-30)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.color = 'var(--grey-60)';
                (e.currentTarget as HTMLAnchorElement).style.borderBottomColor = 'transparent';
              }}
            >
              {l.label}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
