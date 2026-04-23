import { Facebook, Twitter, Instagram, Youtube, ArrowRight, RefreshCw, Star } from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * Footer — BM spec Section 6
 * Dark background (grey-95/black), multi-column links,
 * newsletter signup, social links, legal strip
 * Your DNA: Blue brand accent, Playfair + DM Sans
 */

const LINK_COLS = [
  {
    heading: 'Shop',
    links: [
      { label: 'Refurbished iPhones',    href: '/products?brand=Apple' },
      { label: 'Samsung Galaxy',         href: '/products?brand=Samsung' },
      { label: 'Google Pixel',           href: '/products?brand=Google' },
      { label: 'Tablets & Computing',    href: '/products?category=computing' },
      { label: 'Accessories',            href: '/products?category=accessories' },
      { label: 'Good deals',             href: '/products?deal=true' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'About us',              href: '/about' },
      { label: 'Our grading guide',     href: '/guides' },
      { label: 'Sustainability',        href: '/sustainability' },
      { label: 'Buying guides',         href: '/guides' },
      { label: 'Press & media',         href: '/about' },
    ],
  },
  {
    heading: 'Support',
    links: [
      { label: 'Help & FAQ',            href: '/faq' },
      { label: 'Track my order',        href: '/orders' },
      { label: 'Returns & warranty',    href: '/faq' },
      { label: 'Trade-in programme',    href: '/#trade-in' },
      { label: 'Payment options',       href: '/faq' },
    ],
  },
];

const SOCIALS = [
  { icon: Instagram, label: 'Instagram' },
  { icon: Twitter,   label: 'Twitter / X' },
  { icon: Facebook,  label: 'Facebook' },
  { icon: Youtube,   label: 'YouTube' },
];

const LEGAL = [
  { label: 'Privacy policy', href: '/privacy' },
  { label: 'Terms of service', href: '/terms' },
  { label: 'Grading guide', href: '/guides' },
  { label: 'Sustainability', href: '/sustainability' },
];

export default function Footer() {
  return (
    <footer style={{ background: 'var(--color-surface-inverse)', color: 'rgba(255,255,255,0.85)' }}>

      {/* ── Newsletter strip ─────────────────── */}
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div
          className="container-bm py-12 md:py-16"
          style={{ maxWidth: 'var(--container-max)' }}
        >
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h3
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontWeight: 800,
                  fontSize: '22px',
                  letterSpacing: '-0.025em',
                  color: 'white',
                  marginBottom: '6px',
                }}
              >
                Get the best deals first.
              </h3>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'rgba(255,255,255,0.4)' }}>
                Flash sales, new arrivals, and certified picks — straight to your inbox.
              </p>
            </div>
            <form
              onSubmit={(e) => e.preventDefault()}
              id="footer-newsletter-form"
              style={{ display: 'flex', gap: '8px' }}
            >
              <input
                type="email"
                placeholder="your@email.com"
                aria-label="Email address for newsletter"
                style={{
                  flexGrow: 1,
                  height: '44px',
                  padding: '0 16px',
                  background: 'rgba(255,255,255,0.07)',
                  border: '1.5px solid rgba(255,255,255,0.12)',
                  borderRadius: 'var(--radius-md)',
                  fontFamily: 'var(--font-body)',
                  fontSize: '14px',
                  color: 'white',
                  outline: 'none',
                }}
                onFocus={(e) => { (e.currentTarget as HTMLInputElement).style.borderColor = 'var(--brand-cyan)'; }}
                onBlur={(e) => { (e.currentTarget as HTMLInputElement).style.borderColor = 'rgba(255,255,255,0.12)'; }}
              />
              <button
                type="submit"
                className="btn btn-primary btn-md"
                id="footer-subscribe-btn"
                style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'var(--font-sans)' }}
              >
                Subscribe <ArrowRight size={15} />
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* ── Main link columns ────────────────── */}
      <div
        className="container-bm py-12 md:py-16"
        style={{ maxWidth: 'var(--container-max)' }}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">

          {/* Brand col */}
          <div>
            {/* Logo */}
            <Link
              to="/"
              id="footer-logo"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', textDecoration: 'none', marginBottom: '16px' }}
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  background: 'var(--brand-cyan)',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <RefreshCw size={15} color="white" strokeWidth={2.5} />
              </div>
              <span
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontWeight: 900,
                  fontSize: '17px',
                  letterSpacing: '-0.04em',
                  color: 'white',
                }}
              >
                mobile<span style={{ color: 'var(--brand-cyan)' }}>tech</span>
                <span style={{ color: 'rgba(255,255,255,0.35)', fontWeight: 400, fontSize: '13px' }}>.co.uk</span>
              </span>
            </Link>

            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '13px',
                color: 'rgba(255,255,255,0.35)',
                lineHeight: 1.65,
                marginBottom: 'var(--spacing-20)',
                maxWidth: '240px',
              }}
            >
              The UK's trusted marketplace for certified refurbished phones &amp; tech.
              Trusted by 1.2 million customers.
            </p>

            {/* Trustpilot mini badge */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 14px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 'var(--radius-md)',
                marginBottom: 'var(--spacing-24)',
              }}
            >
              <div style={{ display: 'flex', gap: '2px' }}>
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={12} fill="var(--color-star)" style={{ color: 'var(--color-star)' }} />
                ))}
              </div>
              <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: '13px', color: 'white' }}>4.9</span>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>Trustpilot</span>
            </div>

            {/* Social icons */}
            <div style={{ display: 'flex', gap: '8px' }}>
              {SOCIALS.map((s) => (
                <a
                  key={s.label}
                  href="#"
                  aria-label={s.label}
                  style={{
                    width: '36px',
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 'var(--radius-md)',
                    color: 'rgba(255,255,255,0.5)',
                    textDecoration: 'none',
                    transition: 'all var(--duration-fast)',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLAnchorElement).style.background = 'var(--brand-cyan)';
                    (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--brand-cyan)';
                    (e.currentTarget as HTMLAnchorElement).style.color = 'white';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,0.06)';
                    (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(255,255,255,0.08)';
                    (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.5)';
                  }}
                >
                  <s.icon size={16} />
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {LINK_COLS.map((col) => (
            <div key={col.heading}>
              <h4
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: '11px',
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: 'rgba(255,255,255,0.5)',
                  marginBottom: 'var(--spacing-16)',
                }}
              >
                {col.heading}
              </h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.href}
                      style={{
                        fontFamily: 'var(--font-body)',
                        fontSize: '14px',
                        color: 'rgba(255,255,255,0.4)',
                        textDecoration: 'none',
                        transition: 'color var(--duration-fast)',
                        fontWeight: 400,
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.85)'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.4)'; }}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* ── Payment + Certifications strip ──────────────────────── */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        <div
          className="container-bm py-6"
          style={{
            maxWidth: 'var(--container-max)',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <span
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: '11px',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: 'rgba(255,255,255,0.5)',
                }}
              >
                Payments
              </span>
              {[
                { id: 'visa',     label: 'VISA',       fontWeight: 900, letterSpacing: '0.08em', italic: true },
                { id: 'mc',       label: 'mastercard', fontWeight: 700, letterSpacing: '-0.02em' },
                { id: 'amex',     label: 'AMEX',       fontWeight: 900, letterSpacing: '0.06em' },
                { id: 'apay',     label: 'Pay',        fontWeight: 700, letterSpacing: '-0.02em', prefix: '' },
                { id: 'gpay',     label: 'G Pay',      fontWeight: 700, letterSpacing: '-0.02em' },
                { id: 'klarna',   label: 'Klarna',     fontWeight: 800, letterSpacing: '-0.01em' },
                { id: 'clearpay', label: 'Clearpay',   fontWeight: 800, letterSpacing: '-0.01em' },
                { id: 'paypal',   label: 'PayPal',     fontWeight: 800, italic: true, letterSpacing: '-0.02em' },
              ].map((p) => (
                <span
                  key={p.id}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    height: '24px',
                    padding: '0 9px',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 'var(--radius-sm)',
                    fontFamily: 'var(--font-sans)',
                    fontSize: '11px',
                    fontWeight: p.fontWeight,
                    letterSpacing: p.letterSpacing,
                    fontStyle: p.italic ? 'italic' : 'normal',
                    color: 'rgba(255,255,255,0.7)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {p.label}
                </span>
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <span
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: '11px',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: 'rgba(255,255,255,0.5)',
                }}
              >
                Certified
              </span>
              {[
                'PCI DSS Compliant',
                'GDPR Ready',
                'B Corp Pending',
                'Carbon-neutral delivery',
              ].map((c) => (
                <span
                  key={c}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    height: '24px',
                    padding: '0 9px',
                    background: 'rgba(0,186,219,0.10)',
                    border: '1px solid rgba(0,186,219,0.18)',
                    borderRadius: 'var(--radius-full)',
                    fontFamily: 'var(--font-body)',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: 'var(--brand-cyan)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {c}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Legal strip ──────────────────────── */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <div
            className="container-bm py-6"
            style={{
              maxWidth: 'var(--container-max)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '12px',
                color: 'rgba(255,255,255,0.25)',
              }}
            >
              © 2026 MobileTech.co.uk Ltd — Registered in England &amp; Wales · All rights reserved
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
              {LEGAL.map((item) => (
                <Link
                  key={item.label}
                  to={item.href}
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '12px',
                    color: 'rgba(255,255,255,0.25)',
                    textDecoration: 'none',
                    transition: 'color var(--duration-fast)',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.6)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.25)'; }}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

    </footer>
  );
}
