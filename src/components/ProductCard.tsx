import React, { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Star } from 'lucide-react';
import { Product } from '../types';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useUI } from '../context/UIContext';
import { motion } from 'motion/react';
import ProductImage from './ProductImage';

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
    showToast(`${phone.model} added to cart`, 'success');
    setTimeout(() => setAdded(false), 1200);
  };

  const rating = 3.8 + (parseInt(phone.id.slice(-1), 16) % 12) * 0.1;
  const ratingRounded = Math.min(5, Math.round(rating * 10) / 10);

  // Image resolution is delegated to ProductImage (Gemini fallback)

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
        <ProductImage brand={phone.brand} model={phone.model} storage={phone.storage} imageUrl={phone.imageUrl} alt={phone.model} />

        {savingsPct > 0 && (
          <div style={{ position: 'absolute', top: '12px', left: '12px' }}>
            <span style={{ 
              background: '#ef4444', color: 'white', padding: '4px 8px', 
              borderRadius: '4px', fontSize: '11px', fontWeight: 'bold',
              textTransform: 'uppercase'
            }}>
              Sale
            </span>
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

        <div className="flex items-center gap-1.5 mb-2">
          <div className="stars flex gap-0.5">
            {[1,2,3,4,5].map((s) => (
              <Star
                key={s}
                size={12}
                style={{ fill: s <= Math.round(ratingRounded) ? '#f59e0b' : 'transparent', color: '#f59e0b' }}
              />
            ))}
          </div>
        </div>

        <div style={{ flexGrow: 1 }} />

        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '16px' }}>
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

        <button
          onClick={handleAddToCart}
          className="btn btn-primary btn-md btn-full"
          style={{ fontFamily: 'var(--font-sans)', borderRadius: '4px' }}
          aria-label={added ? 'Added to cart' : `Add ${phone.model} to cart`}
        >
          {added ? (
            <>✓ Added</>
          ) : (
            <>Choose Options</>
          )}
        </button>
      </div>
    </motion.div>
  );
});

export default ProductCard;
