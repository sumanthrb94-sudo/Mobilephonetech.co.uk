import React, { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, Battery, ShieldCheck, Heart, Star } from 'lucide-react';
import { Product } from '../types';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useUI } from '../context/UIContext';
import { motion } from 'motion/react';

/**
 * ProductCard — Verified Form design philosophy
 * Optimized for performance using React.memo and lazy image loading.
 */

interface ProductCardProps {
  phone: Product;
}

function getBadgeClass(grade: string): string {
  switch (grade) {
    case 'Pristine':  return 'badge badge-pristine';
    case 'Excellent': return 'badge badge-excellent';
    case 'Good':      return 'badge badge-good';
    case 'Fair':      return 'badge badge-fair';
    case 'New':       return 'badge badge-new';
    default:          return 'badge badge-tag';
  }
}

const ProductCard = memo(({ phone }: ProductCardProps) => {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { isInWishlist, addToWishlist, removeFromWishlist } = useWishlist();
  const { showToast } = useUI();
  const [added, setAdded] = React.useState(false);
  const inWishlist = isInWishlist(phone.id);

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
    showToast(`${phone.model} added to cart`, 'success');
    setTimeout(() => setAdded(false), 1200);
  };

  const rating = 3.8 + (parseInt(phone.id.slice(-1), 16) % 12) * 0.1;
  const ratingRounded = Math.min(5, Math.round(rating * 10) / 10);

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
      className="card"
      style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column' }}
      onClick={() => navigate(`/product/${phone.id}`)}
      id={`product-card-${phone.id}`}
      role="article"
      aria-label={`${phone.model} — ${phone.grade} condition, £${phone.price}`}
    >
      {/* ── Image Area ──────────────────────── */}
      <div
        style={{
          position: 'relative',
          background: 'var(--grey-5)',
          aspectRatio: '1 / 1',
          borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
          overflow: 'hidden',
        }}
      >
        <img
          src={phone.imageUrl}
          alt={phone.model}
          loading="lazy"
          decoding="async"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            padding: '16px',
            mixBlendMode: 'multiply',
            transition: 'transform var(--duration-slow) var(--ease-default)',
          }}
          className="group-img"
        />

        <div style={{ position: 'absolute', top: '12px', left: '12px' }}>
          <span className={getBadgeClass(phone.grade)}>{phone.grade}</span>
        </div>

        {savingsPct > 0 && (
          <div style={{ position: 'absolute', top: '12px', right: '40px' }}>
            <span className="badge badge-savings">-{savingsPct}%</span>
          </div>
        )}

        <button
          onClick={handleWishlist}
          aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
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
          <Heart
            size={15}
            style={{
              color: inWishlist ? '#ef4444' : 'var(--grey-40)',
              fill: inWishlist ? '#ef4444' : 'transparent',
            }}
          />
        </button>
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

        <div className="flex items-center gap-1.5 mb-10">
          <div className="stars flex gap-0.5">
            {[1,2,3,4,5].map((s) => (
              <Star
                key={s}
                size={12}
                style={{ fill: s <= Math.round(ratingRounded) ? '#f59e0b' : 'transparent', color: '#f59e0b' }}
              />
            ))}
          </div>
          <span style={{ fontSize: '12px', color: 'var(--grey-40)', fontFamily: 'var(--font-body)' }}>
            ({ratingRounded})
          </span>
        </div>

        <div style={{ flexGrow: 1 }} />

        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '12px' }}>
          <span
            className="type-price"
            style={{ fontSize: '22px', color: 'var(--black)' }}
          >
            £{phone.price}
          </span>
          {savings > 0 && (
            <span style={{ fontSize: '14px', color: 'var(--grey-40)', textDecoration: 'line-through', fontFamily: 'var(--font-body)' }}>
              £{phone.originalPrice}
            </span>
          )}
        </div>

        <div
          className="flex items-center gap-4 pb-4 mb-4"
          style={{ borderBottom: '1px solid var(--grey-10)' }}
        >
          <div className="flex items-center gap-1.5">
            <Battery size={12} style={{ color: '#10b981' }} />
            <span style={{ fontSize: '12px', fontFamily: 'var(--font-body)', color: 'var(--grey-50)', fontWeight: 500 }}>
              {phone.batteryHealth}%
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <ShieldCheck size={12} style={{ color: 'var(--blue-60)' }} />
            <span style={{ fontSize: '12px', fontFamily: 'var(--font-body)', color: 'var(--grey-50)', fontWeight: 500 }}>
              12m warranty
            </span>
          </div>
        </div>

        <button
          onClick={handleAddToCart}
          className="btn btn-primary btn-md btn-full"
          style={{ fontFamily: 'var(--font-sans)' }}
          aria-label={added ? 'Added to cart' : `Add ${phone.model} to cart`}
        >
          {added ? (
            <>✓ Added</>
          ) : (
            <><ShoppingBag size={15} /> Add to cart</>
          )}
        </button>
      </div>
    </motion.div>
  );
});

export default ProductCard;
