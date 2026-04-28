import React, { useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { useCheckout } from '../context/CheckoutContext';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, X, ArrowRight, ShoppingBag } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ProductImage from './ProductImage';

export default function AddedToCartModal() {
  const { lastAddedItem, clearLastAdded, cartTotal, cartCount } = useCart();
  const { setCurrentStep } = useCheckout();
  const navigate = useNavigate();
  const isOpen = !!lastAddedItem;

  const [isHovered, setIsHovered] = React.useState(false);

  useEffect(() => {
    if (!isOpen || isHovered) return;
    const timer = setTimeout(() => clearLastAdded(), 8000);
    return () => clearTimeout(timer);
  }, [isOpen, isHovered, clearLastAdded]);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [isOpen]);

  const handleCheckout = () => {
    clearLastAdded();
    setCurrentStep('shipping');
    navigate('/checkout');
  };

  const handleGoToCart = () => {
    clearLastAdded();
    navigate('/cart');
  };

  return (
    <AnimatePresence>
      {isOpen && lastAddedItem && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={clearLastAdded}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.35)',
              backdropFilter: 'blur(2px)',
              zIndex: 110,
            }}
          />

          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 111,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px',
              pointerEvents: 'none',
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 24 }}
              transition={{ type: 'spring', damping: 26, stiffness: 320 }}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              style={{
                width: '100%',
                maxWidth: '460px',
                maxHeight: 'calc(100vh - 32px)',
                overflowY: 'auto',
                background: 'var(--grey-0)',
                borderRadius: 'var(--radius-xl)',
                boxShadow: '0 24px 80px rgba(0,0,0,0.18)',
                display: 'flex',
                flexDirection: 'column',
                pointerEvents: 'auto',
              }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="added-to-cart-title"
            >
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 20px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '28px', height: '28px',
                      borderRadius: '50%',
                      background: 'var(--color-trust-text)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <CheckCircle2 size={16} color="white" strokeWidth={3} />
                  </div>
                  <h2
                    id="added-to-cart-title"
                    style={{ fontFamily: 'var(--font-sans)', fontSize: '17px', fontWeight: 800, color: 'var(--black)', margin: 0 }}
                  >
                    Added to Cart
                  </h2>
                </div>
                <button
                  onClick={clearLastAdded}
                  aria-label="Close"
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--grey-50)', width: '32px', height: '32px',
                    borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'background 0.2s', flexShrink: 0,
                  }}
                  onMouseOver={(e) => ((e.currentTarget as HTMLButtonElement).style.background = 'var(--grey-5)')}
                  onMouseOut={(e) => ((e.currentTarget as HTMLButtonElement).style.background = 'transparent')}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Product summary */}
              <div style={{ padding: '16px 20px', display: 'flex', gap: '14px', alignItems: 'center' }}>
                <div
                  style={{
                    width: '64px', height: '64px',
                    background: 'var(--grey-5)',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '8px', flexShrink: 0, overflow: 'hidden',
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
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 700, color: 'var(--black)', margin: '0 0 4px', lineHeight: 1.3 }}>
                    {lastAddedItem.model}
                  </p>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--grey-50)', margin: '0 0 6px' }}>
                    {lastAddedItem.brand}{lastAddedItem.storage ? ` · ${lastAddedItem.storage}` : ''}
                  </p>
                  <p style={{ fontFamily: 'var(--font-sans)', fontSize: '15px', fontWeight: 800, color: 'var(--black)', margin: 0 }}>
                    £{lastAddedItem.price}
                  </p>
                </div>
              </div>

              {/* Cart subtotal */}
              <div
                style={{
                  margin: '0 20px',
                  padding: '12px 14px',
                  background: 'var(--grey-5)',
                  borderRadius: 'var(--radius-lg)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                  <ShoppingBag size={15} style={{ color: 'var(--grey-50)', flexShrink: 0 }} />
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--grey-60)' }}>
                    Cart subtotal ({cartCount} item{cartCount === 1 ? '' : 's'})
                  </span>
                </div>
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: '15px', fontWeight: 800, color: 'var(--black)', whiteSpace: 'nowrap' }}>
                  £{cartTotal.toFixed(2)}
                </span>
              </div>

              {/* Actions */}
              <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button
                  onClick={handleCheckout}
                  className="btn btn-lg btn-full"
                  style={{
                    background: '#FFD814', borderColor: '#FCD200', color: '#0F1111',
                    fontWeight: 800, boxShadow: '0 2px 5px rgba(213,217,217,0.5)',
                  }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = '#F7CA00')}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = '#FFD814')}
                >
                  Proceed to checkout <ArrowRight size={16} />
                </button>
                <button onClick={handleGoToCart} className="btn btn-secondary btn-md btn-full">
                  Go to cart
                </button>
                <button
                  onClick={clearLastAdded}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 600,
                    color: 'var(--brand-cyan-hover)',
                    textDecoration: 'underline', textUnderlineOffset: '3px',
                    padding: '4px 0',
                  }}
                >
                  Continue shopping
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
