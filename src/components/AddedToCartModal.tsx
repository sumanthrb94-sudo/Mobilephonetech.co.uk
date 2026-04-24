import React, { useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { useCheckout } from '../context/CheckoutContext';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, X, ArrowRight, ShoppingBag } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ProductImage from './ProductImage';

/**
 * AddedToCartModal — Amazon-style confirmation that appears when an item
 * is added to cart. Shows product details, subtotal, and clear CTAs:
 *   1. "Proceed to checkout" (primary)
 *   2. "Go to cart" (secondary)
 *   3. "Continue shopping" (ghost)
 */

export default function AddedToCartModal() {
  const { lastAddedItem, clearLastAdded, cartTotal, cartCount } = useCart();
  const { setCurrentStep } = useCheckout();
  const navigate = useNavigate();
  const isOpen = !!lastAddedItem;

  // Auto-dismiss after 8 seconds unless hovered
  const [isHovered, setIsHovered] = React.useState(false);

  useEffect(() => {
    if (!isOpen || isHovered) return;
    const timer = setTimeout(() => {
      clearLastAdded();
    }, 8000);
    return () => clearTimeout(timer);
  }, [isOpen, isHovered, clearLastAdded]);

  const handleCheckout = () => {
    clearLastAdded();
    setCurrentStep('shipping');
    navigate('/checkout');
  };

  const handleGoToCart = () => {
    clearLastAdded();
    navigate('/cart');
  };

  const handleClose = () => {
    clearLastAdded();
  };

  return (
    <AnimatePresence>
      {isOpen && lastAddedItem && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={handleClose}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.35)',
              backdropFilter: 'blur(2px)',
              zIndex: 110,
            }}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 28, stiffness: 350 }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 'min(480px, 92vw)',
              maxHeight: '90vh',
              overflowY: 'auto',
              background: 'var(--grey-0)',
              borderRadius: 'var(--radius-xl)',
              boxShadow: '0 24px 80px rgba(0,0,0,0.18)',
              zIndex: 111,
              display: 'flex',
              flexDirection: 'column',
            }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="added-to-cart-title"
          >
            {/* Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: 'var(--spacing-24) var(--spacing-24) 0',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: 'var(--color-trust-text)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <CheckCircle2 size={16} color="white" strokeWidth={3} />
                </div>
                <h2
                  id="added-to-cart-title"
                  style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: '18px',
                    fontWeight: 800,
                    color: 'var(--black)',
                    margin: 0,
                  }}
                >
                  Added to Cart
                </h2>
              </div>
              <button
                onClick={handleClose}
                aria-label="Close"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--grey-50)',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background 0.2s',
                }}
                onMouseOver={(e) => (e.currentTarget.style.background = 'var(--grey-5)')}
                onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <X size={18} />
              </button>
            </div>

            {/* Product summary */}
            <div
              style={{
                padding: 'var(--spacing-20) var(--spacing-24)',
                display: 'flex',
                gap: '16px',
                alignItems: 'center',
              }}
            >
              <div
                style={{
                  width: '72px',
                  height: '72px',
                  background: 'var(--grey-5)',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '8px',
                  flexShrink: 0,
                  overflow: 'hidden',
                }}
              >
                <ProductImage
                  brand={lastAddedItem.brand}
                  model={lastAddedItem.model}
                  category={lastAddedItem.category}
                  imageUrl={lastAddedItem.imageUrl}
                  alt={lastAddedItem.model}
                />
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <p
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '14px',
                    fontWeight: 700,
                    color: 'var(--black)',
                    margin: '0 0 4px 0',
                    lineHeight: 1.3,
                  }}
                >
                  {lastAddedItem.model}
                </p>
                <p
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '12px',
                    color: 'var(--grey-50)',
                    margin: '0 0 6px 0',
                  }}
                >
                  {lastAddedItem.brand}
                  {lastAddedItem.storage ? ` · ${lastAddedItem.storage}` : ''}
                </p>
                <p
                  style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: '16px',
                    fontWeight: 800,
                    color: 'var(--black)',
                    margin: 0,
                  }}
                >
                  £{lastAddedItem.price}
                </p>
              </div>
            </div>

            {/* Cart subtotal summary */}
            <div
              style={{
                margin: '0 var(--spacing-24)',
                padding: '14px 16px',
                background: 'var(--grey-5)',
                borderRadius: 'var(--radius-lg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <ShoppingBag size={16} style={{ color: 'var(--grey-50)' }} />
                <span
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '13px',
                    color: 'var(--grey-60)',
                  }}
                >
                  Cart subtotal ({cartCount} item{cartCount === 1 ? '' : 's'})
                </span>
              </div>
              <span
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: '16px',
                  fontWeight: 800,
                  color: 'var(--black)',
                }}
              >
                £{cartTotal.toFixed(2)}
              </span>
            </div>

            {/* Actions */}
            <div
              style={{
                padding: 'var(--spacing-24)',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              {/* Primary — Proceed to checkout (Amazon yellow style) */}
              <button
                onClick={handleCheckout}
                className="btn btn-lg btn-full"
                style={{
                  background: '#FFD814',
                  borderColor: '#FCD200',
                  color: '#0F1111',
                  fontWeight: 800,
                  boxShadow: '0 2px 5px rgba(213,217,217,0.5)',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = '#F7CA00';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = '#FFD814';
                }}
              >
                Proceed to checkout <ArrowRight size={16} />
              </button>

              {/* Secondary — Go to cart */}
              <button
                onClick={handleGoToCart}
                className="btn btn-secondary btn-md btn-full"
              >
                Go to cart
              </button>

              {/* Tertiary — Continue shopping */}
              <button
                onClick={handleClose}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-body)',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--brand-cyan-hover)',
                  textDecoration: 'underline',
                  textUnderlineOffset: '3px',
                  padding: '4px 0',
                }}
              >
                Continue shopping
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
