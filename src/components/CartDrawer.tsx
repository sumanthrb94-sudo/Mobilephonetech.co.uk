import React from 'react';
import { useCart } from '../context/CartContext';
import { useCheckout } from '../context/CheckoutContext';
import { X, Minus, Plus, ShoppingBag, Trash2, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';

/**
 * CartDrawer — Verified Form design philosophy
 * Space: Right-anchored panel, strict borders, clean padding.
 * Typography: Playfair Display for main title, DM Sans for items, Inter for quantities/prices.
 * Color: Pure white drawer `var(--grey-0)`, `var(--grey-5)` for item cards. Black primary actions.
 */

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const { items, removeFromCart, updateQuantity, cartTotal } = useCart();
  const { setCurrentStep } = useCheckout();
  const navigate = useNavigate();

  const handleCheckout = () => {
    setCurrentStep('shipping');
    onClose();
    navigate('/checkout');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.4)',
              backdropFilter: 'blur(2px)', zIndex: 40
            }}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            style={{
              position: 'fixed', right: 0, top: 0, height: '100%', width: '100%', maxWidth: '440px',
              background: 'var(--grey-0)', zIndex: 50, display: 'flex', flexDirection: 'column',
              boxShadow: '-8px 0 32px rgba(0, 0, 0, 0.08)'
            }}
          >
            {/* ── Header ────────────────────────────────────────────── */}
            <div
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: 'var(--spacing-24)', borderBottom: '1px solid var(--grey-10)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--grey-5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ShoppingBag size={18} style={{ color: 'var(--black)' }} />
                </div>
                <div>
                  <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '20px', fontWeight: 700, color: 'var(--black)', margin: 0, lineHeight: 1.2 }}>Shopping Cart</h2>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 600, color: 'var(--grey-40)', margin: 0 }}>
                    {items.reduce((acc, item) => acc + item.quantity, 0)} items
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                style={{
                  background: 'none', border: 'none', width: '32px', height: '32px', borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                  color: 'var(--grey-50)', transition: 'background 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = 'var(--grey-5)'}
                onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <X size={20} />
              </button>
            </div>

            {/* ── Items ─────────────────────────────────────────────── */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--spacing-24)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {items.length === 0 ? (
                <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                  <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--grey-5)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                    <ShoppingBag size={24} style={{ color: 'var(--grey-30)' }} />
                  </div>
                  <p style={{ fontFamily: 'var(--font-sans)', fontSize: '18px', fontWeight: 800, color: 'var(--black)', margin: '0 0 8px 0' }}>Your cart is empty</p>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--grey-50)', margin: 0 }}>Discover certified refurbished devices.</p>
                </div>
              ) : (
                items.map((item) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    style={{
                      display: 'flex', gap: '16px', background: 'var(--grey-0)', padding: '16px',
                      borderRadius: 'var(--radius-lg)', border: '1px solid var(--grey-10)',
                      boxShadow: 'var(--shadow-sm)'
                    }}
                  >
                    {/* Product Image */}
                    <div style={{ width: '80px', height: '80px', background: 'var(--grey-5)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, padding: '8px' }}>
                      <img src={item.imageUrl} alt={item.model} style={{ width: '100%', height: '100%', objectFit: 'contain', mixBlendMode: 'multiply' }} />
                    </div>

                    {/* Details */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <h3 style={{ fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 700, color: 'var(--black)', margin: '0 0 4px 0', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{item.model}</h3>
                          <p className="overline" style={{ margin: 0, fontSize: '10px' }}>{item.brand}</p>
                        </div>
                        <button
                          onClick={() => removeFromCart(item.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--grey-40)', padding: '4px' }}
                          onMouseOver={(e) => e.currentTarget.style.color = 'var(--red)'}
                          onMouseOut={(e) => e.currentTarget.style.color = 'var(--grey-40)'}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px' }}>
                        <p style={{ fontFamily: 'var(--font-sans)', fontSize: '16px', fontWeight: 900, color: 'var(--black)', margin: 0 }}>£{item.price}</p>
                        
                        {/* Quantity */}
                        <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--grey-20)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                          <button onClick={() => updateQuantity(item.id, item.quantity - 1)} style={{ width: '28px', height: '28px', background: 'var(--grey-0)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Minus size={12} color="var(--black)" /></button>
                          <span style={{ width: '24px', textAlign: 'center', fontFamily: 'var(--font-sans)', fontSize: '13px', fontWeight: 700, color: 'var(--black)', borderLeft: '1px solid var(--grey-10)', borderRight: '1px solid var(--grey-10)' }}>{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.id, item.quantity + 1)} style={{ width: '28px', height: '28px', background: 'var(--grey-0)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Plus size={12} color="var(--black)" /></button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>

            {/* ── Footer ────────────────────────────────────────────── */}
            {items.length > 0 && (
              <div style={{ padding: 'var(--spacing-24)', borderTop: '1px solid var(--grey-10)', background: 'var(--grey-0)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--grey-50)' }}>
                    <span>Subtotal</span> <span style={{ fontWeight: 600, color: 'var(--black)' }}>£{cartTotal.toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--grey-50)' }}>
                    <span>Shipping</span> <span style={{ fontWeight: 600, color: 'var(--trust-green)' }}>FREE</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '12px', marginTop: '4px', borderTop: '1px solid var(--grey-10)' }}>
                    <span style={{ fontFamily: 'var(--font-sans)', fontSize: '18px', fontWeight: 800, color: 'var(--black)' }}>Total</span>
                    <span style={{ fontFamily: 'var(--font-sans)', fontSize: '24px', fontWeight: 900, color: 'var(--black)' }}>£{cartTotal.toFixed(2)}</span>
                  </div>
                </div>

                <button onClick={handleCheckout} className="btn btn-primary btn-lg" style={{ width: '100%', marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  Checkout <ArrowRight size={16} />
                </button>
                <button onClick={onClose} className="btn btn-secondary btn-md" style={{ width: '100%' }}>
                  Continue Shopping
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
