import React, { memo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Star, Eye, Plus } from 'lucide-react';
import { motion } from 'motion/react';
import { Product, ProductGrade } from '../types';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useUI } from '../context/UIContext';
import { motion, AnimatePresence } from 'motion/react';
import ProductImage from './ProductImage';
import QuickViewModal from './QuickViewModal';
import { haptic } from '../utils/haptics';
import { useHoverPrefetch } from '../hooks/useHoverPrefetch';

const GRADE_CLASS: Record<ProductGrade, string> = {
  Pristine: 'badge-pristine',
  Excellent: 'badge-excellent',
  Good: 'badge-good',
  Fair: 'badge-fair',
  New: 'badge-new',
};

// Reusable colour-name → hex map for the on-card swatch row.
// Falls back to lower-cased CSS colour name when missing.
const SWATCHES: Record<string, string> = {
  'Natural Titanium': '#C0C0C0',
  'Blue Titanium':    '#4A90E2',
  'White Titanium':   '#F5F5F5',
  'Black Titanium':   '#1A1A1A',
  'Space Black':      '#0D0D0D',
  'Silver':           '#E8E8E8',
  'Gold':             '#FFD700',
  'Pacific Blue':     '#0066CC',
  'Midnight':         '#1A1A2E',
  'Starlight':        '#F0E68C',
  'Blue':             '#4A90E2',
  'Phantom Black':    '#0D0D0D',
  'Phantom White':    '#F5F5F5',
  'Lavender':         '#C8A2C8',
  'Cream':            '#F5E6D3',
  'Snow':             '#FFFFFF',
  'Obsidian':         '#1F1F22',
  'Hazel':            '#A6907A',
};

/**
 * ProductCard — Verified Form design philosophy
 * Optimized for performance using React.memo and lazy image loading.
 */

interface ProductCardProps {
  phone: Product;
}



const ProductCard = memo(({ phone }: ProductCardProps) => {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { isInWishlist, addToWishlist, removeFromWishlist } = useWishlist();
  const { showToast } = useUI();
  const [added, setAdded] = React.useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const inWishlist = isInWishlist(phone.id);
  // Product image handled by ProductImage component (Gemini fallback)

  const savings = phone.originalPrice - phone.price;
  const savingsPct = Math.round((savings / phone.originalPrice) * 100);

  const handleWishlist = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (inWishlist) {
      removeFromWishlist(phone.id);
      showToast('Removed from wishlist', 'info');
    } else {
      addToWishlist(phone);
      showToast('Added to wishlist', 'success');
    }
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    addToCart(phone, 1);
    setAdded(true);
    haptic('success');
    showToast(`${phone.model} added to cart`, 'success');
    setTimeout(() => setAdded(false), 1200);
  };

  const rating = 3.8 + (parseInt(phone.id.slice(-1), 16) % 12) * 0.1;
  const ratingRounded = Math.min(5, Math.round(rating * 10) / 10);

  // Image resolution is delegated to ProductImage (Gemini fallback)

  const handleQuickView = (e: React.MouseEvent) => {
    e.stopPropagation();
    setQuickViewOpen(true);
  };

  const prefetchProductDetail = useHoverPrefetch(() => import('./ProductDetail'));

  return (
    <>
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
      className="card"
      style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column' }}
      onClick={() => navigate(`/product/${phone.id}`)}
      onMouseEnter={(e) => { setIsHovering(true); prefetchProductDetail.onMouseEnter(); }}
      onMouseLeave={() => setIsHovering(false)}
      onFocus={prefetchProductDetail.onFocus}
      onTouchStart={prefetchProductDetail.onTouchStart}
      id={`product-card-${phone.id}`}
      role="article"
      aria-label={`${phone.model} — ${phone.grade} condition, £${phone.price}`}
    >
      {/* ── Image Area ──────────────────────── */}
      <div
        style={{
          position: 'relative',
          background: 'var(--grey-0)',
          aspectRatio: '1 / 1',
          borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px'
        }}
      >
        <ProductImage brand={phone.brand} model={phone.model} storage={phone.storage} category={phone.category} imageUrl={phone.imageUrl} alt={phone.model} />

        {/* Quick-view button — appears on hover (desktop) or always on touch */}
        <AnimatePresence>
          {isHovering && (
            <motion.button
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.15 }}
              onClick={handleQuickView}
              aria-label={`Quick view ${phone.model}`}
              style={{
                position: 'absolute',
                bottom: '12px',
                left: '50%',
                transform: 'translateX(-50%)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                background: 'var(--grey-0)',
                color: 'var(--black)',
                border: '1px solid var(--grey-20)',
                borderRadius: 'var(--radius-full)',
                fontFamily: 'var(--font-sans)',
                fontSize: '12px',
                fontWeight: 700,
                letterSpacing: '-0.005em',
                cursor: 'pointer',
                boxShadow: 'var(--shadow-md)',
              }}
            >
              <Eye size={14} />
              Quick view
            </motion.button>
          )}
        </AnimatePresence>

        <div style={{ position: 'absolute', top: '12px', left: '12px', display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-start' }}>
          {phone.grade && (
            <span className={`badge ${GRADE_CLASS[phone.grade]}`}>
              {phone.grade}
            </span>
          )}
          {savingsPct > 0 && (
            <span className="badge badge-savings">
              Save {savingsPct}%
            </span>
          )}
        </div>

        <motion.button
          onClick={handleWishlist}
          aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
          whileTap={{ scale: 1.25 }}
          transition={{ type: 'spring', stiffness: 500, damping: 15 }}
          style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--grey-0)',
            border: '1px solid var(--grey-20)',
            borderRadius: 'var(--radius-full)',
            cursor: 'pointer',
            transition: 'border-color var(--duration-fast), background var(--duration-fast)',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--grey-40)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--grey-20)'; }}
        >
          <motion.div
            animate={inWishlist ? { scale: [1, 1.3, 1] } : { scale: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 12 }}
          >
            <Heart
              size={15}
              style={{
                color: inWishlist ? 'var(--color-sale)' : 'var(--grey-40)',
                fill: inWishlist ? 'var(--color-sale)' : 'transparent',
              }}
            />
          </motion.div>
        </motion.button>
      </div>

      {/* ── Card Body ───────────────────────── */}
      <div
        style={{
          padding: 'var(--spacing-20)',
          display: 'flex',
          flexDirection: 'column',
          flexGrow: 1,
        }}
      >
        <p
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--grey-40)',
            marginBottom: '4px',
          }}
        >
          {phone.brand}
        </p>

        <h3
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: '17px',
            fontWeight: 700,
            letterSpacing: '-0.02em',
            color: 'var(--black)',
            marginBottom: '2px',
            lineHeight: 1.3,
          }}
        >
          {phone.model}
        </h3>

        {phone.storage && (
          <p style={{ fontSize: '13px', color: 'var(--grey-40)', fontFamily: 'var(--font-body)', marginBottom: '8px' }}>
            {phone.storage}
          </p>
        )}

        {/* Colour-options indicator — small swatch row + count */}
        {(() => {
          const colours = phone.colorOptions ?? Array.from(new Set((phone.variants ?? []).map((v) => v.color).filter(Boolean) as string[]));
          if (colours.length === 0) return null;
          const visible = colours.slice(0, 4);
          const overflow = colours.length - visible.length;
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }} aria-label={`${colours.length} colour options`}>
              {visible.map((c) => (
                <span
                  key={c}
                  title={c}
                  style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    background: SWATCHES[c] ?? c.toLowerCase(),
                    border: '1px solid var(--grey-20)',
                    boxShadow: '0 0 0 1px var(--grey-0) inset',
                  }}
                />
              ))}
              {overflow > 0 && (
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: 600, color: 'var(--grey-50)' }}>
                  +{overflow}
                </span>
              )}
            </div>
          );
        })()}

        <div className="flex items-center gap-1.5 mb-2">
          <div className="stars flex gap-0.5">
            {[1,2,3,4,5].map((s) => (
              <Star
                key={s}
                size={12}
                style={{ fill: s <= Math.round(ratingRounded) ? 'var(--color-star)' : 'transparent', color: 'var(--color-star)' }}
              />
            ))}
          </div>
        </div>

        <div style={{ flexGrow: 1 }} />

        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '4px' }}>
          <span
            className="type-price"
            style={{ fontSize: '20px', color: 'var(--brand-header)' }}
          >
            £{phone.price}
          </span>
          {savings > 0 && (
            <span style={{ fontSize: '14px', color: 'var(--grey-40)', textDecoration: 'line-through', fontFamily: 'var(--font-body)' }}>
              £{phone.originalPrice}
            </span>
          )}
        </div>

        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '12px',
            color: 'var(--grey-50)',
            marginBottom: '4px',
          }}
        >
          or 3 payments of £{Math.ceil(phone.price / 3)} with Klarna
        </p>

        {/* Free-delivery + low-stock micro-trust row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontFamily: 'var(--font-body)',
              fontSize: '11px',
              fontWeight: 600,
              color: 'var(--color-trust-text)',
              letterSpacing: '0.01em',
            }}
          >
            <span aria-hidden style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-trust-text)' }} />
            Free next-day delivery
          </span>
          {phone.stock > 0 && phone.stock <= 5 && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                fontFamily: 'var(--font-body)',
                fontSize: '11px',
                fontWeight: 600,
                color: '#92400e',
              }}
            >
              · Only {phone.stock} left
            </span>
          )}
        </div>

        <button
          onClick={handleAddToCart}
          className="btn btn-primary btn-lg btn-full"
          style={{ fontFamily: 'var(--font-sans)' }}
          aria-label={added ? 'Added to cart' : `Add ${phone.model} to cart`}
        >
          {added ? (
            <><Plus size={16} style={{ opacity: 0.9 }} /> Added</>
          ) : phone.variants && phone.variants.length > 1 ? (
            <>Choose options</>
          ) : (
            <>Add to cart</>
          )}
        </button>
      </div>
    </motion.div>

    <QuickViewModal
      phone={phone}
      isOpen={quickViewOpen}
      onClose={() => setQuickViewOpen(false)}
      onAddToCart={() => {
        addToCart(phone, 1);
        showToast(`${phone.model} added to cart`, 'success');
        setQuickViewOpen(false);
      }}
      onViewFull={() => {
        setQuickViewOpen(false);
        navigate(`/product/${phone.id}`);
      }}
    />
    </>
  );
});

export default ProductCard;
