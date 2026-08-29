import React, { memo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Product, ProductGrade } from '../types';
import { useWishlist } from '../context/WishlistContext';
import { useUI } from '../context/UIContext';
import ProductImage from './ProductImage';
import QuickViewModal from './QuickViewModal';
import { useHoverPrefetch } from '../hooks/useHoverPrefetch';
import { getFastestDelivery } from '../utils/deliveryCalculator';

const GRADE_DOT: Record<ProductGrade, string> = {
  Pristine: '#3b82f6',
  Excellent: '#10b981',
  Good:      '#f59e0b',
  Fair:      '#ef4444',
  New:       '#6366f1',
};

const GRADE_BG: Record<ProductGrade, string> = {
  Pristine: '#eff6ff',
  Excellent: '#f0fdf4',
  Good:      '#fffbeb',
  Fair:      '#fef2f2',
  New:       '#eef2ff',
};

const SWATCHES: Record<string, string> = {
  'Natural Titanium': '#B0B0B0',
  'Blue Titanium':    '#4A90E2',
  'White Titanium':   '#F0F0F0',
  'Black Titanium':   '#1A1A1A',
  'Space Black':      '#0D0D0D',
  'Silver':           '#D8D8D8',
  'Gold':             '#C9A84C',
  'Deep Purple':      '#4B2D6E',
  'Pacific Blue':     '#0066CC',
  'Midnight':         '#1A1A2E',
  'Starlight':        '#FAF0DC',
  'Blue':             '#4A90E2',
  'Purple':           '#9333ea',
  'Pink':             '#ec4899',
  'Yellow':           '#eab308',
  'Green':            '#22c55e',
  'Red':              '#ef4444',
  'Phantom Black':    '#0D0D0D',
  'Phantom White':    '#F5F5F5',
  'Lavender':         '#C8A2C8',
  'Cream':            '#F5E6D3',
  'Snow':             '#FFFFFF',
  'Obsidian':         '#1F1F22',
  'Hazel':            '#A6907A',
  'Black':            '#111111',
  'White':            '#F5F5F5',
};

const BRAND_COLOUR_DEFAULTS: Record<string, string[]> = {
  Apple:    ['Natural Titanium', 'Blue Titanium', 'White Titanium', 'Black Titanium'],
  Samsung:  ['Phantom Black', 'Phantom White', 'Lavender', 'Cream'],
  Google:   ['Obsidian', 'Snow', 'Hazel'],
  OnePlus:  ['Black', 'Green'],
  Motorola: ['Black', 'Blue'],
};

interface ProductCardProps { phone: Product; }

const ProductCard = memo(({ phone }: ProductCardProps) => {
  const navigate  = useNavigate();
  const { isInWishlist, addToWishlist, removeFromWishlist } = useWishlist();
  const { showToast } = useUI();
  const [isHovering, setIsHovering]   = useState(false);
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const inWishlist = isInWishlist(phone.id);

  // Nationwide default postcode: the grid has no address yet, and standard
  // delivery is free everywhere, so the date is the only variable part.
  const deliveryLabel = React.useMemo(
    () => {
      if (phone.stock <= 0) return null;
      const label = getFastestDelivery('SW1A 1AA')?.label;
      // Labels read "Get it by Tomorrow" / "Delivery by Fri 3 Jun"; strip the
      // lead-in so the card does not say "Free delivery · Delivery by …".
      return label ? label.replace(/^(Get it by|Delivery by|Express:)\s*/i, '') : null;
    },
    [phone.stock],
  );

  const savings    = phone.originalPrice - phone.price;
  const savingsPct = Math.round((savings / phone.originalPrice) * 100);
  const prefetchProductDetail = useHoverPrefetch(() => import('./ProductDetail'));

  const handleWishlist = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (inWishlist) { removeFromWishlist(phone.id); showToast('Removed from wishlist', 'info'); }
    else { addToWishlist(phone); showToast('Added to wishlist', 'success'); }
  };

  const handleViewProduct = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/product/${phone.id}`);
  };

  const handleQuickView = (e: React.MouseEvent) => {
    e.stopPropagation();
    setQuickViewOpen(true);
  };

  const fromVariants = Array.from(new Set((phone.variants ?? []).map(v => v.color).filter(Boolean) as string[]));
  const colours = phone.colorOptions?.length ? phone.colorOptions
    : fromVariants.length ? fromVariants
    : BRAND_COLOUR_DEFAULTS[phone.brand] ?? [];
  const visibleColours = colours.slice(0, 4);
  const overflowColours = colours.length - visibleColours.length;

  return (
    <>
      <motion.article
        whileHover={{ y: -4 }}
        transition={{ duration: 0.22, ease: [0.2, 0, 0, 1] }}
        onClick={() => navigate(`/product/${phone.id}`)}
        onMouseEnter={() => { setIsHovering(true); prefetchProductDetail.onMouseEnter(); }}
        onMouseLeave={() => setIsHovering(false)}
        onFocus={prefetchProductDetail.onFocus}
        onTouchStart={prefetchProductDetail.onTouchStart}
        id={`product-card-${phone.id}`}
        role="article"
        aria-label={`${phone.model} — ${phone.grade} condition, £${phone.price}`}
        style={{
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          background: '#fff',
          borderRadius: '20px',
          border: '1px solid #E5E7EB',
          overflow: 'hidden',
          transition: 'box-shadow 0.22s ease, border-color 0.22s ease',
          boxShadow: isHovering
            ? '0 16px 48px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.06)'
            : '0 1px 4px rgba(0,0,0,0.05)',
        }}
      >
        {/* ── Image zone ──
            White, not a dark panel. Catalogue photography is shot on white,
            so a dark background produced a visible white square floating
            inside a dark box inside the white card — three nested boxes for
            one product. Amazon and Back Market both put the shot straight
            onto the card, and a hairline is enough to separate it from the
            details below. Less padding too: the dark box was doing the
            framing, so the product itself can now be bigger. */}
        <div style={{
          position: 'relative',
          background: 'var(--grey-0)',
          borderBottom: '1px solid var(--grey-10)',
          aspectRatio: '1 / 1',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '18px',
          overflow: 'hidden',
        }}>
          <ProductImage
            brand={phone.brand}
            model={phone.model}
            color={phone.colorOptions?.[0] ?? phone.variants?.[0]?.color}
            storage={phone.storage}
            category={phone.category}
            imageUrl={phone.imageUrl}
            alt={phone.model}
          />

          {/* Grade badge — top left */}
          {phone.grade && (
            <span style={{
              position: 'absolute', top: 12, left: 12,
              display: 'inline-flex', alignItems: 'center', gap: 4,
              background: GRADE_BG[phone.grade],
              // The tints are pale by design; on white they need an outline
              // or the badge disappears into the card.
              border: `1px solid ${GRADE_DOT[phone.grade]}33`,
              padding: '4px 9px', borderRadius: '999px',
              fontFamily: 'var(--font-sans)', fontSize: '10px', fontWeight: 700,
              letterSpacing: '0.06em', textTransform: 'uppercase',
              color: GRADE_DOT[phone.grade],
            }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: GRADE_DOT[phone.grade], flexShrink: 0 }} />
              {phone.grade}
            </span>
          )}

          {/* Save % — bottom left */}
          {savingsPct > 0 && (
            <span style={{
              position: 'absolute', bottom: 12, left: 12,
              background: '#16a34a', color: '#fff',
              fontFamily: 'var(--font-sans)', fontSize: '11px', fontWeight: 800,
              letterSpacing: '0.04em', textTransform: 'uppercase',
              padding: '4px 9px', borderRadius: '999px',
              lineHeight: 1,
            }}>
              SAVE {savingsPct}%
            </span>
          )}

          {/* Wishlist — top right */}
          <motion.button
            onClick={handleWishlist}
            aria-label={inWishlist ? 'Remove from wishlist' : 'Save'}
            whileTap={{ scale: 1.25 }}
            transition={{ type: 'spring', stiffness: 500, damping: 15 }}
            style={{
              position: 'absolute', top: 10, right: 10,
              width: 34, height: 34,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'var(--grey-0)',
              border: '1px solid var(--grey-20)',
              borderRadius: '50%', cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(12,10,9,0.10)',
            }}
          >
            <Heart
              size={15}
              style={{
                color: inWishlist ? '#ef4444' : '#9CA3AF',
                fill: inWishlist ? '#ef4444' : 'transparent',
                transition: 'all 0.2s',
              }}
            />
          </motion.button>

          {/* Quick view — on hover */}
          <AnimatePresence>
            {isHovering && (
              <motion.button
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                transition={{ duration: 0.15 }}
                onClick={handleQuickView}
                aria-label={`Quick view ${phone.model}`}
                style={{
                  position: 'absolute', bottom: 12,
                  left: '50%', transform: 'translateX(-50%)',
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '8px 16px',
                  background: 'rgba(255,255,255,0.96)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(0,0,0,0.10)',
                  borderRadius: '999px',
                  fontFamily: 'var(--font-sans)', fontSize: '12px', fontWeight: 700,
                  color: '#111', cursor: 'pointer',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                  whiteSpace: 'nowrap',
                }}
              >
                Quick view
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* ── Card body ── */}
        <div style={{
          padding: '18px 20px 20px',
          display: 'flex',
          flexDirection: 'column',
          flexGrow: 1,
          borderTop: '1px solid #F3F4F6',
        }}>

          {/* Brand row */}
          <div style={{ marginBottom: 6 }}>
            <span style={{
              fontFamily: 'var(--font-sans)', fontSize: '9px', fontWeight: 700,
              letterSpacing: '0.12em', textTransform: 'uppercase', color: '#9CA3AF',
            }}>
              {phone.brand}
            </span>
          </div>

          {/* Model name */}
          <h3 style={{
            fontFamily: 'var(--font-sans)', fontSize: '18px', fontWeight: 900,
            letterSpacing: '-0.03em', color: '#111827',
            lineHeight: 1.25, marginBottom: 2,
          }}>
            {phone.model}
          </h3>

          {/* Storage */}
          {phone.storage && (
            <p style={{
              fontFamily: 'var(--font-body)', fontSize: '12px',
              color: '#6B7280', marginBottom: 8, lineHeight: 1,
            }}>
              {phone.storage}
            </p>
          )}

          {/* Colour swatches */}
          {visibleColours.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 8 }}>
              {visibleColours.map(c => (
                <span key={c} title={c} style={{
                  width: 13, height: 13, borderRadius: '50%',
                  background: SWATCHES[c] ?? c.toLowerCase(),
                  border: '1.5px solid rgba(0,0,0,0.10)',
                  boxShadow: '0 0 0 1.5px #fff inset',
                  flexShrink: 0,
                }} />
              ))}
              {overflowColours > 0 && (
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: '#9CA3AF' }}>
                  +{overflowColours}
                </span>
              )}
            </div>
          )}

          <div style={{ flexGrow: 1 }} />

          {/* Price row */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, marginBottom: 3 }}>
            <span style={{
              fontFamily: 'var(--font-sans)', fontSize: '26px', fontWeight: 900,
              letterSpacing: '-0.04em', color: '#111827',
            }}>
              £{phone.price}
            </span>
            {savings > 0 && (
              <span style={{
                fontFamily: 'var(--font-body)', fontSize: '13px',
                color: '#9CA3AF', textDecoration: 'line-through',
              }}>
                £{phone.originalPrice}
              </span>
            )}
          </div>

          {/* Delivery promise — Amazon puts the arrival date on every card because
              it is one of the strongest signals in the grid. Derived from the same
              calculator the product page uses, so the two cannot disagree. */}
          {deliveryLabel && (
            <p style={{
              fontFamily: 'var(--font-body)', fontSize: '12px', lineHeight: 1.3,
              color: '#047857', margin: '2px 0 0 0', fontWeight: 600,
            }}>
              Free delivery · {deliveryLabel}
            </p>
          )}

          {/* CTA */}
          <button
            onClick={handleViewProduct}
            aria-label={`View ${phone.model} details`}
            style={{
              width: '100%', height: 48,
              background: 'var(--brand-cyan)',
              color: '#fff',
              fontFamily: 'var(--font-sans)', fontSize: '14px', fontWeight: 800,
              letterSpacing: '-0.01em',
              border: 'none', borderRadius: '999px',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.18s, transform 0.12s',
              transform: 'translateZ(0)',
              marginTop: 14,
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--brand-cyan-hover)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'var(--brand-cyan)')}
          >
            Buy Now <ArrowRight size={14} style={{marginLeft: 6}} />
          </button>
        </div>
      </motion.article>

      <QuickViewModal
        phone={phone}
        isOpen={quickViewOpen}
        onClose={() => setQuickViewOpen(false)}
        onAddToCart={() => { setQuickViewOpen(false); navigate(`/product/${phone.id}`); }}
        onViewFull={() => { setQuickViewOpen(false); navigate(`/product/${phone.id}`); }}
      />
    </>
  );
});

export default ProductCard;
