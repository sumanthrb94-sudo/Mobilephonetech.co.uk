import { ShieldCheck } from 'lucide-react';

/**
 * TrustBanner — clean green trust strip under the fixed header.
 * Communicates warranty, returns and battery guarantee at a glance.
 */
export default function TrustBanner() {
  return (
    <div
      role="banner"
      style={{
        background: '#f0fdf4',
        borderBottom: '1px solid #bbf7d0',
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
          color: '#15803d',
          margin: 0,
          textAlign: 'center',
          lineHeight: 1.4,
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <ShieldCheck size={15} style={{ color: '#16a34a', flexShrink: 0 }} />
        Every device backed by 12-month warranty, 30-day free returns &amp; 85%+ battery guarantee.
      </p>
    </div>
  );
}
