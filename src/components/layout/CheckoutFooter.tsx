import { Link } from 'react-router-dom';
import { Lock } from 'lucide-react';

/**
 * CheckoutFooter — minimal legal footer shown only on /checkout.
 * Replaces the full site footer so the shopper isn't given a dozen
 * "leave the funnel" exits during their purchase. Still carries the
 * trust cue + essential legal links.
 */
export default function CheckoutFooter() {
  return (
    <footer
      style={{
        marginTop: 'var(--spacing-48)',
        paddingTop: 'var(--spacing-24)',
        paddingBottom: 'var(--spacing-32)',
        borderTop: '1px solid var(--grey-10)',
      }}
    >
      <div
        className="container-bm"
        style={{
          maxWidth: '1024px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '10px',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontFamily: 'var(--font-sans)',
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--grey-50)',
          }}
        >
          <Lock size={12} /> Secure SSL · PCI DSS · GDPR
        </div>
        <div
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '12px',
            color: 'var(--grey-50)',
          }}
        >
          © 2026 MobileTech.co.uk Ltd · Registered in England &amp; Wales
        </div>
        <nav style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '14px' }}>
          {[
            { label: 'Privacy policy', to: '/privacy' },
            { label: 'Terms of service', to: '/terms' },
            { label: 'Returns', to: '/faq' },
            { label: 'Help', to: '/faq' },
          ].map((l) => (
            <Link
              key={l.label}
              to={l.to}
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '12px',
                color: 'var(--grey-50)',
                textDecoration: 'none',
              }}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
