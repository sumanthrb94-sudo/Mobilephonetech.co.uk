/**
 * TrustBanner — BM spec Section 2
 * Light green tint strip, ~40px height, below fixed header (scrolls with page)
 * "Best value or your money back. Learn more"
 */
export default function TrustBanner() {
  return (
    <div
      role="banner"
      style={{
        background: 'var(--green-5)',   /* #f0fdf4 — light green tint */
        borderBottom: '1px solid var(--green-20)',
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
          color: 'var(--green-60)',
          margin: 0,
          textAlign: 'center',
          lineHeight: 1.4,
        }}
      >
        Best value or your money back — 30-day free returns guaranteed.{' '}
        <a
          href="#trust"
          style={{
            color: 'var(--green-60)',
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
