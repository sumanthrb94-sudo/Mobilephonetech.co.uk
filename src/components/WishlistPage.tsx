import { useWishlist } from '../context/WishlistContext';
import ProductCard from './ProductCard';
import { Heart, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';

/**
 * WishlistPage — Verified Form design philosophy
 * Space: 12-col grid, massive negative space for empty state.
 * Colour: Pure white page `var(--grey-0)`.
 * Typography: Playfair Display for title, DM Sans for functional.
 */

export default function WishlistPage() {
  const { items, clearWishlist } = useWishlist();
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh', background: 'var(--grey-0)', paddingTop: 'var(--spacing-80)', paddingBottom: 'var(--spacing-80)' }}>
      <div style={{ width: '100%', maxWidth: '1280px', marginLeft: 'auto', marginRight: 'auto', paddingLeft: '16px', paddingRight: '16px' }}>
        
        {/* Header */}
        <div style={{ marginBottom: 'var(--spacing-48)' }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 600,
              color: 'var(--grey-50)', background: 'none', border: 'none',
              cursor: 'pointer', padding: '0', marginBottom: 'var(--spacing-32)'
            }}
          >
            <ArrowLeft size={16} /> Back
          </button>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(36px, 5vw, 56px)', fontWeight: 700, color: 'var(--black)', lineHeight: 1.1, marginBottom: '12px', letterSpacing: '-0.02em' }}>
            Your Wishlist
          </h1>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '15px', color: 'var(--grey-50)', maxWidth: '440px' }}>
            {items.length === 0 ? 'Your wishlist is currently empty.' : `${items.length} item${items.length !== 1 ? 's' : ''} saved for later.`}
          </p>
        </div>

        {items.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', padding: 'var(--spacing-80) 0', textAlign: 'center'
            }}
          >
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--grey-5)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 'var(--spacing-24)' }}>
              <Heart size={32} style={{ color: 'var(--grey-30)' }} />
            </div>
            <h3 style={{ fontFamily: 'var(--font-sans)', fontSize: '24px', fontWeight: 800, color: 'var(--black)', marginBottom: '8px' }}>
              No items in your wishlist
            </h3>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '15px', color: 'var(--grey-50)', marginBottom: 'var(--spacing-32)' }}>
              Start adding products to save them for later.
            </p>
            <button onClick={() => navigate('/products')} className="btn btn-primary btn-lg">
              Browse Products
            </button>
          </motion.div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--spacing-32)', paddingBottom: 'var(--spacing-16)', borderBottom: '1px solid var(--grey-10)' }}>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--grey-50)' }}>
                Showing <strong style={{ color: 'var(--black)', fontWeight: 700 }}>{items.length}</strong> saved item{items.length !== 1 ? 's' : ''}
              </p>
              <button
                onClick={clearWishlist}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 600,
                  color: 'var(--color-sale)',
                }}
              >
                Clear wishlist
              </button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--spacing-32)' }}>
              {items.map((product) => (
                <ProductCard key={product.id} phone={product} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
