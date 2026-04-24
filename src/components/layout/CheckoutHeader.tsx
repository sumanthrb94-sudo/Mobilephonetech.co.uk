import React from 'react';
import { Link } from 'react-router-dom';
import { Lock, RefreshCw, ArrowLeft } from 'lucide-react';

/**
 * CheckoutHeader — minimal header that replaces the standard Navbar
 * during /checkout. Based on the Amazon / BackMarket pattern: keep the
 * shopper in the funnel by stripping brand tabs, search, wishlist,
 * bottom tab-bar — anything that could pull them out mid-purchase.
 *
 * Layout:
 *   [← Cart]       mobiletech                Secure checkout  🔒
 *
 * - Logo is still a link back to home but de-emphasised
 * - "Secure checkout" + lock is the trust cue
 * - Left-side "Cart" ghost-link lets them back out to the cart drawer
 *   without having to hunt for a hamburger that isn't there
 */
export default function CheckoutHeader({ onBackToCart }: { onBackToCart?: () => void }) {
  return (
    <header
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 60,
        background: 'var(--brand-header)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* Announcement bar — same dark navy stripe as the main header so the
          site identity carries through without the full catnav. */}
      <div
        style={{
          backgroundColor: 'rgba(0,0,0,0.2)',
          color: 'var(--grey-0)',
          textAlign: 'center',
          padding: '6px 16px',
          fontFamily: 'var(--font-sans)',
          fontSize: '12px',
          fontWeight: 600,
          letterSpacing: '0.02em',
        }}
      >
        Free next-day delivery · 12-month warranty · 30-day free returns
      </div>

      <div
        className="navbar-header"
        style={{
          width: '100%',
          maxWidth: 'var(--container-max)',
          marginLeft: 'auto',
          marginRight: 'auto',
          display: 'flex',
          alignItems: 'center',
          boxSizing: 'border-box',
          height: 'var(--header-h)',
        }}
      >
        {/* Back-to-cart link — ghost on mobile, labelled on tablet+ */}
        {onBackToCart ? (
          <button
            onClick={onBackToCart}
            aria-label="Back to cart"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              height: '40px',
              padding: '0 10px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'rgba(255,255,255,0.85)',
              fontFamily: 'var(--font-body)',
              fontSize: '13px',
              fontWeight: 600,
            }}
          >
            <ArrowLeft size={18} />
            <span className="hidden sm:inline">Back to cart</span>
          </button>
        ) : (
          <Link
            to="/"
            aria-label="Back to home"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              height: '40px',
              padding: '0 10px',
              color: 'rgba(255,255,255,0.85)',
              fontFamily: 'var(--font-body)',
              fontSize: '13px',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            <ArrowLeft size={18} />
            <span className="hidden sm:inline">Back to shop</span>
          </Link>
        )}

        {/* Logo — centred */}
        <Link
          to="/"
          aria-label="mobiletech.co.uk home"
          className="navbar-logo flex items-center min-w-0"
          style={{ textDecoration: 'none', margin: '0 auto' }}
        >
          <span className="navbar-logo-tile flex-shrink-0">
            <RefreshCw className="navbar-logo-icon" color="white" strokeWidth={2.5} />
          </span>
          <span
            className="navbar-logo-wordmark truncate"
            style={{
              fontFamily: 'var(--font-sans)',
              fontWeight: 900,
              letterSpacing: '-0.04em',
              color: 'var(--brand-cyan)',
              lineHeight: 1,
            }}
          >
            mobile<span style={{ color: 'var(--grey-0)' }}>tech</span>
          </span>
        </Link>

        {/* Secure checkout cue — right */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            height: '40px',
            padding: '0 8px',
            color: 'rgba(255,255,255,0.85)',
            fontFamily: 'var(--font-sans)',
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
          }}
        >
          <Lock size={14} />
          <span className="hidden sm:inline">Secure checkout</span>
        </div>
      </div>
    </header>
  );
}
