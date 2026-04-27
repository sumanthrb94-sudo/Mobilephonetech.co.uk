import React from 'react';
import { useCart } from '../context/CartContext';
import { useCheckout } from '../context/CheckoutContext';
import { useSeo, SITE_ORIGIN } from '../hooks/useSeo';
import { useWishlist } from '../context/WishlistContext';
import { useUI } from '../context/UIContext';
import { useNavigate } from 'react-router-dom';
import {
  Minus, Plus, ShoppingBag, ArrowRight, Bookmark,
  ShieldCheck, Truck, RotateCcw, CheckCircle2
} from 'lucide-react';
import { motion } from 'motion/react';
import ProductImage from './ProductImage';

/**
 * CartPage — Amazon-style full-page shopping cart.
 * Left column: item list with quantity controls, delete, save-for-later.
 * Right column: sticky order summary with prominent "Proceed to checkout".
 */

export default function CartPage() {
  useSeo({
    title: 'Your basket | MobilePhoneMarket',
    description: 'Review the refurbished devices in your basket before checkout.',
    canonical: `${SITE_ORIGIN}/cart`,
    noindex: true,
  });
  const { items, removeFromCart, updateQuantity, cartTotal, clearCart } = useCart();
  const { setCurrentStep } = useCheckout();
  const { addToWishlist } = useWishlist();
  const { showToast } = useUI();
  const navigate = useNavigate();

  const handleCheckout = () => {
    setCurrentStep('shipping');
    navigate('/checkout');
  };

  const saveForLater = (itemId: string) => {
    const item = items.find((i) => i.id === itemId);
    if (!item) return;
    addToWishlist(item);
    removeFromCart(itemId);
    showToast(`${item.model} saved for later`, 'info');
  };

  const itemCount = items.reduce((acc, item) => acc + item.quantity, 0);

  if (items.length === 0) {
    return (
      <div
        style={{
          minHeight: '60vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--grey-0)',
          padding: 'var(--spacing-48) var(--spacing-16)',
        }}
      >
        <div style={{ textAlign: 'center', maxWidth: '400px' }}>
          <div
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'var(--grey-5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto var(--spacing-20)',
            }}
          >
            <ShoppingBag size={32} style={{ color: 'var(--grey-30)' }} />
          </div>
          <h1
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '24px',
              fontWeight: 800,
              color: 'var(--black)',
              margin: '0 0 8px 0',
            }}
          >
            Your cart is empty
          </h1>
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '15px',
              color: 'var(--grey-50)',
              margin: '0 0 var(--spacing-24) 0',
              lineHeight: 1.5,
            }}
          >
            Discover certified refurbished devices at unbeatable prices.
          </p>
          <button
            onClick={() => navigate('/products')}
            className="btn btn-primary btn-lg"
          >
            Browse devices <ArrowRight size={16} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        background: 'var(--grey-0)',
        minHeight: 'calc(100vh - var(--nav-total))',
        padding: 'var(--spacing-32) var(--spacing-16)',
      }}
    >
      <div className="container-bm" style={{ maxWidth: 'var(--container-max)' }}>
        {/* Page title */}
        <h1
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 'clamp(22px, 4vw, 30px)',
            fontWeight: 800,
            color: 'var(--black)',
            margin: '0 0 var(--spacing-24) 0',
            letterSpacing: '-0.02em',
          }}
        >
          Shopping Cart
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* ── Left: Item list ─────────────────────────────────────── */}
          <div className="lg:col-span-2" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Top bar — select all / clear */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                background: 'var(--grey-5)',
                borderRadius: 'var(--radius-lg)',
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: 'var(--grey-60)',
                }}
              >
                {itemCount} item{itemCount === 1 ? '' : 's'} in your cart
              </span>
              <button
                onClick={clearCart}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-body)',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--brand-cyan-hover)',
                  textDecoration: 'underline',
                  textUnderlineOffset: '2px',
                }}
              >
                Remove all
              </button>
            </div>

            {/* Items */}
            {items.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05, duration: 0.25 }}
                style={{
                  display: 'flex',
                  gap: '16px',
                  padding: 'var(--spacing-20)',
                  background: 'var(--grey-0)',
                  borderRadius: 'var(--radius-xl)',
                  border: '1px solid var(--grey-10)',
                }}
              >
                {/* Image */}
                <div
                  style={{
                    width: '100px',
                    height: '100px',
                    background: 'var(--grey-5)',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    padding: '10px',
                    overflow: 'hidden',
                  }}
                >
                  <ProductImage
                    brand={item.brand}
                    model={item.model}
                    category={item.category}
                    imageUrl={item.imageUrl}
                    alt={item.model}
                  />
                </div>

                {/* Details */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minWidth: 0 }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                      <div style={{ minWidth: 0 }}>
                        <h3
                          style={{
                            fontFamily: 'var(--font-sans)',
                            fontSize: '16px',
                            fontWeight: 700,
                            color: 'var(--black)',
                            margin: '0 0 4px 0',
                            lineHeight: 1.3,
                          }}
                        >
                          {item.model}
                        </h3>
                        <p
                          style={{
                            fontFamily: 'var(--font-body)',
                            fontSize: '12px',
                            color: 'var(--grey-50)',
                            margin: 0,
                          }}
                        >
                          {item.brand}
                          {item.storage ? ` · ${item.storage}` : ''}
                          {item.grade ? ` · ${item.grade} condition` : ''}
                        </p>
                      </div>
                      <p
                        style={{
                          fontFamily: 'var(--font-sans)',
                          fontSize: '18px',
                          fontWeight: 800,
                          color: 'var(--black)',
                          margin: 0,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        £{(item.price * item.quantity).toFixed(2)}
                      </p>
                    </div>

                    {item.originalPrice > item.price && (
                      <p
                        style={{
                          fontFamily: 'var(--font-body)',
                          fontSize: '12px',
                          color: 'var(--color-trust-text)',
                          fontWeight: 600,
                          margin: '4px 0 0 0',
                        }}
                      >
                        You save £{((item.originalPrice - item.price) * item.quantity).toFixed(2)}
                      </p>
                    )}
                  </div>

                  {/* Actions row */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                      marginTop: '14px',
                      flexWrap: 'wrap',
                    }}
                  >
                    {/* Quantity stepper (Amazon uses a dropdown, but stepper fits the existing design) */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        border: '1px solid var(--grey-20)',
                        borderRadius: 'var(--radius-md)',
                        overflow: 'hidden',
                        background: 'var(--grey-0)',
                      }}
                    >
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        aria-label="Decrease quantity"
                        style={{
                          width: '32px',
                          height: '32px',
                          background: 'var(--grey-0)',
                          border: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                        }}
                      >
                        <Minus size={12} color="var(--black)" />
                      </button>
                      <span
                        style={{
                          width: '36px',
                          textAlign: 'center',
                          fontFamily: 'var(--font-sans)',
                          fontSize: '13px',
                          fontWeight: 700,
                          color: 'var(--black)',
                          borderLeft: '1px solid var(--grey-10)',
                          borderRight: '1px solid var(--grey-10)',
                          lineHeight: '32px',
                        }}
                      >
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        aria-label="Increase quantity"
                        style={{
                          width: '32px',
                          height: '32px',
                          background: 'var(--grey-0)',
                          border: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                        }}
                      >
                        <Plus size={12} color="var(--black)" />
                      </button>
                    </div>

                    <div style={{ width: '1px', height: '18px', background: 'var(--grey-20)' }} />

                    <button
                      onClick={() => removeFromCart(item.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontFamily: 'var(--font-body)',
                        fontSize: '13px',
                        fontWeight: 600,
                        color: 'var(--brand-cyan-hover)',
                      }}
                    >
                      Delete
                    </button>

                    <button
                      onClick={() => saveForLater(item.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontFamily: 'var(--font-body)',
                        fontSize: '13px',
                        fontWeight: 600,
                        color: 'var(--brand-cyan-hover)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <Bookmark size={12} />
                      Save for later
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}

            {/* Trust strip below items */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '16px',
                padding: 'var(--spacing-20)',
                background: 'var(--grey-5)',
                borderRadius: 'var(--radius-lg)',
                marginTop: '8px',
              }}
            >
              <TrustPill icon={Truck} label="Free next-day delivery" />
              <TrustPill icon={RotateCcw} label="30-day returns" />
              <TrustPill icon={ShieldCheck} label="12-month warranty" />
              <TrustPill icon={CheckCircle2} label="Certified refurbished" />
            </div>
          </div>

          {/* ── Right: Order summary (sticky on desktop) ───────────── */}
          <div
            className="lg:sticky"
            style={{
              top: 'calc(var(--nav-total) + 16px)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--spacing-20)',
            }}
          >
            <div
              style={{
                background: 'var(--grey-0)',
                borderRadius: 'var(--radius-xl)',
                padding: 'var(--spacing-24)',
                border: '1px solid var(--grey-10)',
              }}
            >
              <h2
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: '20px',
                  fontWeight: 800,
                  color: 'var(--black)',
                  margin: '0 0 var(--spacing-20) 0',
                }}
              >
                Subtotal
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: 'var(--spacing-20)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--grey-60)' }}>
                  <span>Items ({itemCount})</span>
                  <span style={{ fontWeight: 600, color: 'var(--black)' }}>£{cartTotal.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--grey-60)' }}>
                  <span>Shipping</span>
                  <span style={{ fontWeight: 700, color: 'var(--color-trust-text)' }}>FREE</span>
                </div>
              </div>

              <div
                style={{
                  borderTop: '1px solid var(--grey-10)',
                  paddingTop: '14px',
                  marginBottom: 'var(--spacing-20)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                }}
              >
                <span
                  style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: '18px',
                    fontWeight: 800,
                    color: 'var(--black)',
                  }}
                >
                  Total
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: '28px',
                    fontWeight: 900,
                    color: 'var(--black)',
                    letterSpacing: '-0.02em',
                  }}
                >
                  £{cartTotal.toFixed(2)}
                </span>
              </div>

              {/* Amazon-style yellow CTA */}
              <button
                onClick={handleCheckout}
                className="btn btn-lg btn-full"
                style={{
                  background: '#FFD814',
                  borderColor: '#FCD200',
                  color: '#0F1111',
                  fontWeight: 800,
                  boxShadow: '0 2px 5px rgba(213,217,217,0.5)',
                  marginBottom: '10px',
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

              <button
                onClick={() => navigate('/products')}
                className="btn btn-secondary btn-md btn-full"
              >
                Continue shopping
              </button>
            </div>

            {/* Secure checkout badge */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '12px',
                background: 'var(--grey-5)',
                borderRadius: 'var(--radius-lg)',
              }}
            >
              <ShieldCheck size={16} style={{ color: 'var(--grey-50)' }} />
              <span
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '12px',
                  color: 'var(--grey-50)',
                  fontWeight: 600,
                }}
              >
                Secure checkout — your data is protected
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TrustPill({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 12px',
        background: 'var(--grey-0)',
        borderRadius: 'var(--radius-full)',
        border: '1px solid var(--grey-10)',
      }}
    >
      <Icon size={14} style={{ color: 'var(--brand-cyan-hover)' }} />
      <span
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: '12px',
          fontWeight: 600,
          color: 'var(--grey-70)',
        }}
      >
        {label}
      </span>
    </div>
  );
}
