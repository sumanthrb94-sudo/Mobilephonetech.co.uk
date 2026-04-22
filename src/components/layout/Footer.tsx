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
      { label: 'About us',              href: '#' },
      { label: 'Our grading guide',     href: '#' },
      { label: 'Sustainability',        href: '#' },
      { label: 'Press & media',         href: '#' },
      { label: 'Careers',               href: '#' },
    ],
  },
  {
    heading: 'Support',
    links: [
      { label: 'Help & contact',        href: '#' },
      { label: 'Track my order',        href: '/orders' },
      { label: 'Returns & warranty',    href: '#' },
      { label: 'Trade-in programme',    href: '#trade-in' },
      { label: 'Payment options',       href: '#' },
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
  { label: 'Cookie settings', href: '#' },
  { label: 'Grading guide', href: '#' },
  { label: 'Accessibility', href: '#' }
];

export default function Footer() {
  return (
    <footer style={{ background: 'var(--grey-95)', color: 'rgba(255,255,255,0.85)' }}>

      {/* ── Newsletter strip ─────────────────── */}
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div
          className="container-bm"
          style={{ maxWidth: 'var(--container-max)', padding: 'var(--spacing-48) var(--spacing-64)' }}
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
                onFocus={(e) => { (e.currentTarget as HTMLInputElement).style.borderColor = 'var(--blue-60)'; }}
                onBlur={(e) => { (e.currentTarget as HTMLInputElement).style.borderColor = 'rgba(255,255,255,0.12)'; }}
              />
              <button
                type="submit"
                className="btn btn-brand btn-md"
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
        className="container-bm"
        style={{ maxWidth: 'var(--container-max)', padding: 'var(--spacing-64) var(--spacing-64)' }}
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
                  background: 'var(--blue-60)',
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
                mobile<span style={{ color: 'var(--blue-40)' }}>tech</span>
                <span style={{ color: 'rgba(255,255,255,0.25)', fontWeight: 400, fontSize: '13px' }}>.co.uk</span>
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
                  <Star key={i} size={12} fill="#f59e0b" style={{ color: '#f59e0b' }} />
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
                    (e.currentTarget as HTMLAnchorElement).style.background = 'var(--blue-60)';
                    (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--blue-60)';
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

      {/* ── Legal strip ──────────────────────── */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        <div
          className="container-bm"
          style={{
            maxWidth: 'var(--container-max)',
            padding: 'var(--spacing-20) var(--spacing-64)',
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
