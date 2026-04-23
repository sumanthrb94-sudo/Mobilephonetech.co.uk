import { ShieldCheck } from 'lucide-react';

/**
 * TrustBanner — trust strip under the fixed header.
 * On-brand cyan tint with navy text — consistent with header identity.
 */
export default function TrustBanner() {
  return (
    <div
      role="banner"
      style={{
        background: 'var(--color-brand-subtle)',
        borderBottom: '1px solid rgba(0, 186, 219, 0.18)',
        width: '100%',
        minHeight: '40px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 16px',
      }}
    >
      <p
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: '14px',
          fontWeight: 500,
          color: 'var(--brand-header)',
          margin: 0,
          textAlign: 'center',
          lineHeight: 1.4,
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <ShieldCheck size={15} style={{ color: 'var(--brand-cyan-hover)', flexShrink: 0 }} />
        Best value or your money back — 30-day free returns guaranteed.{' '}
        <a
          href="/#why-us"
          style={{
            color: 'var(--brand-cyan-hover)',
            fontWeight: 700,
            textDecoration: 'underline',
            textUnderlineOffset: '2px',
          }}
        >
          Learn more
        </a>
      </p>
    </div>
  );
}
