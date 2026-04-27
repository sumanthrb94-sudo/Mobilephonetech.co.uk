import React, { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { useCheckout, SHIPPING_OPTIONS, ShippingAddress, PaymentMethod, Order } from '../context/CheckoutContext';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Check, Lock, Truck, CreditCard, CheckCircle2, Tag, X, User, LogIn, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import AuthModal from './AuthModal';
import ExpressPayRow from './ExpressPayRow';
import ProductImage from './ProductImage';
import { useSeo, SITE_ORIGIN } from '../hooks/useSeo';
import { lookupPostcode } from '../utils/postcodeLookup';

// Demo-mode payment helpers. Real card tokenisation happens through
// a PSP widget (Stripe / Adyen) in production — until then the form
// accepts whatever the user types and falls back to a Visa 4242 stub
// when fields are blank, so a walkthrough is never blocked by an
// unfilled card form.

type PaymentTypeKey = 'card' | 'klarna' | 'clearpay' | 'apple_pay' | 'google_pay' | 'paypal';

const PAYMENT_METHOD_LABELS: Record<PaymentTypeKey, { brand: string; last4: string; display: string }> = {
  card:       { brand: 'Visa',       last4: '4242', display: 'Credit or debit card' },
  klarna:     { brand: 'Klarna',     last4: 'PAY3', display: 'Klarna · Pay in 3'    },
  clearpay:   { brand: 'Clearpay',   last4: 'PAY4', display: 'Clearpay · Pay in 4'  },
  apple_pay:  { brand: 'Apple Pay',  last4: 'WLLT', display: 'Apple Pay'            },
  google_pay: { brand: 'Google Pay', last4: 'WLLT', display: 'Google Pay'           },
  paypal:     { brand: 'PayPal',     last4: 'PYPL', display: 'PayPal'               },
};

function detectCardBrand(cardNumber: string): string {
  if (/^4/.test(cardNumber)) return 'Visa';
  if (/^(5[1-5]|2[2-7])/.test(cardNumber)) return 'Mastercard';
  if (/^3[47]/.test(cardNumber)) return 'Amex';
  if (/^6(011|5)/.test(cardNumber)) return 'Discover';
  return 'Card';
}

/**
 * CheckoutFlow — three-step buy flow (shipping → payment → review → confirmation).
 * Uses the shared .btn system, cyan brand accents, and a progress indicator
 * whose step labels hide on very narrow phones.
 */

export default function CheckoutFlow() {
  useSeo({
    title: 'Checkout | MobilePhoneMarket',
    description: 'Complete your purchase securely — free next-day UK delivery, 12-month warranty, 30-day returns.',
    canonical: `${SITE_ORIGIN}/checkout`,
    noindex: true,
  });
  const { items, cartTotal, clearCart } = useCart();
  const { 
    currentStep, setCurrentStep, shippingAddress, setShippingAddress,
    shippingOption, paymentMethod, setPaymentMethod,
    appliedCoupon, applyCoupon, removeCoupon, createOrder, lastOrder,
  } = useCheckout();
  const { user, isAuthenticated, continueAsGuest } = useAuth();

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // The checkout step transitions happen in-place (same URL) so the
  // global ScrollToTop listener doesn't fire. Reset scroll manually on
  // every step change so a tall Shipping form doesn't leave Payment
  // scrolled halfway down when the user clicks Continue.
  useEffect(() => {
    try { window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior }); }
    catch { window.scrollTo(0, 0); }
  }, [currentStep]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [couponError, setCouponError] = useState('');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [checkoutMode, setCheckoutMode] = useState<'selection' | 'shipping'>(isAuthenticated || user?.isGuest ? 'shipping' : 'selection');
  const [paymentType, setPaymentType] = useState<PaymentTypeKey>('card');

  // Demo seed: checkout starts with a plausible UK address pre-selected
  // so a demo walk-through goes straight from cart -> payment. Uses the
  // authenticated user's name/email when available, otherwise a generic
  // demo profile. The user can still edit any field before continuing.
  useEffect(() => {
    if (shippingAddress) return;
    setShippingAddress({
      fullName:    user?.fullName || 'Alex Morgan',
      email:       user?.email    || 'alex@mobilephonemarket.co.uk',
      phone:       '07700 900123',
      addressLine1:'221B Baker Street',
      addressLine2:'Flat 2',
      city:        'London',
      postalCode:  'NW1 6XE',
      country:     'United Kingdom',
    });
  }, [user, shippingAddress, setShippingAddress]);

  const shippingCost = shippingOption?.cost || 0;
  const subtotal = cartTotal;
  
  let discount = 0;
  if (appliedCoupon) {
    if (appliedCoupon.discountType === 'percentage') {
      discount = subtotal * (appliedCoupon.value / 100);
    } else {
      discount = Math.min(appliedCoupon.value, subtotal);
    }
  }

  const tax = (subtotal - discount + shippingCost) * 0.2; // 20% VAT
  const total = subtotal - discount + shippingCost + tax;

  // UK-postcode regex covers the official 2016 Royal Mail format:
  // outward (A9/A9A/A99/AA9/AA9A/AA99) + space-optional + inward (9AA).
  const UK_POSTCODE_RE = /^([A-Z]{1,2}\d[A-Z\d]?)\s*(\d[A-Z]{2})$/i;
  const PHONE_RE = /^[0-9+][\d\s()+-]{7,19}$/;
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const validateShippingForm = (data: Record<string, FormDataEntryValue | null>) => {
    const errors: Record<string, string> = {};
    const fullName     = String(data.fullName ?? '').trim();
    const email        = String(data.email ?? '').trim();
    const phone        = String(data.phone ?? '').trim();
    const addressLine1 = String(data.addressLine1 ?? '').trim();
    const city         = String(data.city ?? '').trim();
    const postalCode   = String(data.postalCode ?? '').trim();

    if (!fullName) errors.fullName = 'Full name is required';
    else if (fullName.split(/\s+/).length < 2) errors.fullName = 'Please enter your first and last name';

    if (!email) errors.email = 'Email is required';
    else if (!EMAIL_RE.test(email)) errors.email = 'Please enter a valid email address';

    if (!phone) errors.phone = 'Phone number is required';
    else if (!PHONE_RE.test(phone)) errors.phone = 'Please enter a valid phone number';

    if (!addressLine1) errors.addressLine1 = 'Address is required';
    if (!city) errors.city = 'City is required';

    if (!postalCode) errors.postalCode = 'Postcode is required';
    else if (!UK_POSTCODE_RE.test(postalCode)) errors.postalCode = 'Please enter a valid UK postcode';

    return errors;
  };

  const handleShippingSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      fullName: formData.get('fullName'), email: formData.get('email'), phone: formData.get('phone'),
      addressLine1: formData.get('addressLine1'), addressLine2: formData.get('addressLine2'),
      city: formData.get('city'), postalCode: formData.get('postalCode'), country: formData.get('country') || 'United Kingdom',
    };

    const errors = validateShippingForm(data);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setFormErrors({});
    setShippingAddress(data as ShippingAddress);
    setCurrentStep('payment');
  };

  const handlePaymentSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    // Demo mode: pick whatever method the user selected. If they
    // bothered to type a card number, we use it — otherwise we ship
    // a sensible placeholder so the mock order goes through. No
    // payment method is ever blocking.
    const cardNumberRaw = String(formData.get('cardNumber') ?? '').replace(/\s+/g, '');

    let method: PaymentMethod;
    if (paymentType === 'card') {
      const last4 = cardNumberRaw.length >= 4 ? cardNumberRaw.slice(-4) : '4242';
      const brand = cardNumberRaw.length >= 4 ? detectCardBrand(cardNumberRaw) : 'Visa';
      method = {
        id: Math.random().toString(36).slice(2, 11),
        type: 'card',
        last4,
        brand,
      };
    } else {
      method = {
        id: Math.random().toString(36).slice(2, 11),
        type: paymentType === 'apple_pay' || paymentType === 'google_pay' || paymentType === 'paypal'
          ? paymentType
          : 'card',
        last4: PAYMENT_METHOD_LABELS[paymentType].last4,
        brand: PAYMENT_METHOD_LABELS[paymentType].brand,
      };
    }

    setFormErrors({});
    setPaymentMethod(method);
    setCurrentStep('review');
  };

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    setCouponError('');
    if (!couponCode.trim()) return;
    if (applyCoupon(couponCode)) { setCouponCode(''); } else { setCouponError('Invalid coupon code'); }
  };

  const handlePlaceOrder = async () => {
    if (!shippingAddress || !paymentMethod || !shippingOption) { alert('Please complete all steps'); return; }
    setIsProcessing(true);
    await new Promise(resolve => setTimeout(resolve, 2000));

    const order: Order = {
      id: `ORD-${Date.now()}`, items, shippingAddress, shippingOption, paymentMethod,
      subtotal, shippingCost, tax, total, status: 'confirmed', createdAt: new Date().toISOString(),
    };

    createOrder(order);
    clearCart();
    setCurrentStep('confirmation');
    setIsProcessing(false);
  };

  const handleGuestCheckout = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const email = new FormData(e.currentTarget).get('guestEmail') as string;
    if (email) { continueAsGuest(email); setCheckoutMode('shipping'); }
  };

  // ── CONFIRMATION PAGE ──────────────────────────────────────────────────────
  if (currentStep === 'confirmation' && lastOrder) {
    // Plausible delivery ETA — matches the "order by 4pm" promise
    const etaDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const etaStr  = etaDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

    return (
      <div style={{ minHeight: 'calc(100vh - 200px)', background: 'var(--grey-5)', padding: 'var(--spacing-32) var(--spacing-16)' }}>
        <div className="container-bm" style={{ maxWidth: '760px' }}>
          {/* Celebratory hero card */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.2, 0, 0, 1] }}
            className="checkout-card"
            style={{ background: 'var(--grey-0)', border: '1px solid var(--grey-10)', borderRadius: 'var(--radius-xl)', textAlign: 'center', marginBottom: 'var(--spacing-24)' }}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.15, type: 'spring', stiffness: 240, damping: 18 }}
              style={{
                width: '80px', height: '80px', borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--color-trust-text) 0%, #0d7f4a 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto var(--spacing-20)',
                boxShadow: '0 10px 30px rgba(22, 163, 74, 0.25)',
              }}
            >
              <CheckCircle2 size={40} color="white" strokeWidth={2.4} />
            </motion.div>

            <h1 style={{ fontFamily: 'var(--font-sans)', fontSize: 'clamp(26px, 5vw, 36px)', fontWeight: 900, letterSpacing: '-0.03em', color: 'var(--black)', margin: '0 0 8px 0', lineHeight: 1.1 }}>
              Order placed · thank you{lastOrder.shippingAddress.fullName ? `, ${lastOrder.shippingAddress.fullName.split(' ')[0]}` : ''}
            </h1>

            <p style={{ fontFamily: 'var(--font-body)', fontSize: '15px', color: 'var(--grey-60)', margin: '0 0 var(--spacing-20) 0', lineHeight: 1.55 }}>
              A confirmation has been emailed to <strong style={{ color: 'var(--black)' }}>{lastOrder.shippingAddress.email}</strong>.
            </p>

            {/* ETA pill */}
            <div
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                padding: '10px 16px',
                background: 'var(--color-brand-subtle)',
                color: 'var(--brand-header)',
                borderRadius: 'var(--radius-full)',
                fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: '14px',
                letterSpacing: '-0.005em',
              }}
            >
              <Truck size={16} />
              Arriving <strong>{etaStr}</strong>
            </div>
          </motion.div>

          {/* Order summary + shipping preview — two columns on tablet+, stacked on mobile */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }} className="md:grid-cols-2">
            {/* Summary */}
            <div className="checkout-card" style={{ background: 'var(--grey-0)', border: '1px solid var(--grey-10)', borderRadius: 'var(--radius-xl)' }}>
              <p className="overline" style={{ marginBottom: '4px' }}>Order number</p>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: '20px', fontWeight: 800, color: 'var(--black)', margin: '0 0 var(--spacing-20) 0', letterSpacing: '-0.01em' }}>
                {lastOrder.id}
              </p>
              <div style={{ borderTop: '1px solid var(--grey-10)', paddingTop: 'var(--spacing-16)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <Row label="Subtotal" value={`£${lastOrder.subtotal.toFixed(2)}`} />
                {discount > 0 && <Row label="Discount" value={`-£${discount.toFixed(2)}`} accent />}
                <Row label="Shipping" value={lastOrder.shippingCost === 0 ? 'FREE' : `£${lastOrder.shippingCost.toFixed(2)}`} trust={lastOrder.shippingCost === 0} />
                <Row label="Tax (20%)" value={`£${lastOrder.tax.toFixed(2)}`} />
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--grey-10)', paddingTop: '12px', marginTop: '4px', alignItems: 'baseline' }}>
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: '16px', fontWeight: 800, color: 'var(--black)' }}>Total</span>
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: '24px', fontWeight: 900, color: 'var(--black)', letterSpacing: '-0.02em' }}>£{lastOrder.total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Shipping preview */}
            <div className="checkout-card" style={{ background: 'var(--grey-0)', border: '1px solid var(--grey-10)', borderRadius: 'var(--radius-xl)' }}>
              <p className="overline" style={{ marginBottom: '8px' }}>Shipping to</p>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: '15px', fontWeight: 700, color: 'var(--black)', margin: '0 0 6px 0' }}>
                {lastOrder.shippingAddress.fullName}
              </p>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--grey-60)', lineHeight: 1.55 }}>
                <div>{lastOrder.shippingAddress.addressLine1}</div>
                {lastOrder.shippingAddress.addressLine2 && <div>{lastOrder.shippingAddress.addressLine2}</div>}
                <div>{lastOrder.shippingAddress.city}, {lastOrder.shippingAddress.postalCode}</div>
                <div>{lastOrder.shippingAddress.country}</div>
              </div>

              <div style={{ borderTop: '1px solid var(--grey-10)', marginTop: 'var(--spacing-20)', paddingTop: 'var(--spacing-16)' }}>
                <p className="overline" style={{ marginBottom: '8px' }}>Payment</p>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
                  <CreditCard size={18} style={{ color: 'var(--grey-60)' }} />
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--black)' }}>
                    {lastOrder.paymentMethod.brand || 'Card'} ending in {lastOrder.paymentMethod.last4 || '4242'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Exit CTAs */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px', marginTop: 'var(--spacing-24)' }} className="sm:grid-cols-2">
            <button
              onClick={() => window.location.href = '/orders'}
              className="btn btn-primary btn-lg btn-full"
            >
              <Truck size={18} /> Track order
            </button>
            <button
              onClick={() => window.location.href = '/'}
              className="btn btn-secondary btn-lg btn-full"
            >
              Continue shopping
            </button>
          </div>

          {/* Upsell / reassurance */}
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--grey-50)', textAlign: 'center', marginTop: 'var(--spacing-32)', lineHeight: 1.6 }}>
            Need to make a change? You have 30 minutes to update your delivery address.{' '}
            <a href="/faq" style={{ color: 'var(--brand-cyan-hover)', textDecoration: 'underline', textUnderlineOffset: '2px' }}>Help centre</a>.
          </p>
        </div>
      </div>
    );
  }

  // ── COMMON STYLES ──────────────────────────────────────────────────────────
  const inputStyle = { width: '100%', padding: '14px 16px', background: 'var(--grey-0)', border: '1px solid var(--grey-20)', borderRadius: 'var(--radius-md)', fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--black)', outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box' as const };
  const labelStyle = { display: 'block', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700, color: 'var(--black)', marginBottom: '8px' };
  const errorStyle = { fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: 600, color: 'var(--color-sale)', marginTop: '4px' };

  return (
    <div style={{ background: 'var(--grey-5)', minHeight: '100vh', paddingTop: 'var(--spacing-32)', paddingBottom: 'var(--spacing-80)' }}>
      <div className="container-bm" style={{ maxWidth: '1024px' }}>

        {/* Progress Indicator */}
        <div style={{ marginBottom: 'var(--spacing-32)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: '520px', margin: '0 auto' }}>
            {['Shipping', 'Payment', 'Review'].map((step, index) => {
              const isActive = (index === 0 && ['shipping', 'payment', 'review'].includes(currentStep)) || (index === 1 && ['payment', 'review'].includes(currentStep)) || (index === 2 && currentStep === 'review');
              const isCompleted = (index === 0 && ['payment', 'review'].includes(currentStep)) || (index === 1 && currentStep === 'review');
              const accent = isActive || isCompleted ? 'var(--brand-cyan-hover)' : 'var(--grey-40)';

              return (
                <div key={step} style={{ display: 'flex', alignItems: 'center', flex: 1, ...((index === 2) ? { flex: 'none' } : {}) }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                    <div
                      aria-current={isActive ? 'step' : undefined}
                      style={{
                        width: '32px', height: '32px', borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontFamily: 'var(--font-sans)', fontSize: '13px', fontWeight: 800,
                        transition: 'all 0.3s', flexShrink: 0,
                        background: isActive || isCompleted ? 'var(--brand-cyan-hover)' : 'var(--grey-10)',
                        color: isActive || isCompleted ? 'white' : 'var(--grey-40)',
                      }}
                    >
                      {isCompleted ? <Check size={16} strokeWidth={3} /> : index + 1}
                    </div>
                    <span
                      className="checkout-step-label"
                      style={{
                        fontFamily: 'var(--font-sans)',
                        fontSize: '13px',
                        fontWeight: isActive ? 700 : 500,
                        color: accent,
                        letterSpacing: '-0.01em',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {step}
                    </span>
                  </div>
                  {index < 2 && <div style={{ flex: 1, height: '2px', margin: '0 12px', background: isCompleted ? 'var(--brand-cyan-hover)' : 'var(--grey-10)', transition: 'background 0.3s', minWidth: '20px' }} />}
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* ── Main Content Area ─────────────────────────────────────────── */}
          <div className="lg:col-span-2">
            <AnimatePresence mode="wait">
              
              {/* Login / Guest Selection */}
              {checkoutMode === 'selection' && !isAuthenticated && !user?.isGuest && (
                <motion.div key="selection" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} style={{ background: 'var(--grey-0)', borderRadius: 'var(--radius-xl)', padding: 'var(--spacing-32)', border: '1px solid var(--grey-10)' }}>
                  <h2 style={{ fontFamily: 'var(--font-sans)', fontSize: 'clamp(26px, 4vw, 32px)', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--black)', marginBottom: 'var(--spacing-24)' }}>Checkout</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    <div style={{ padding: 'var(--spacing-24)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--grey-10)' }}>
                      <LogIn size={24} style={{ color: 'var(--black)', marginBottom: '16px' }} />
                      <h3 style={{ fontFamily: 'var(--font-sans)', fontSize: '18px', fontWeight: 800, color: 'var(--black)', marginBottom: '8px' }}>Returning Customer</h3>
                      <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--grey-50)', marginBottom: '24px', lineHeight: 1.5 }}>Sign in for a faster checkout experience.</p>
                      <button onClick={() => setIsAuthModalOpen(true)} className="btn btn-primary btn-md" style={{ width: '100%' }}>Sign In</button>
                    </div>

                    <div style={{ padding: 'var(--spacing-24)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--grey-10)' }}>
                      <User size={24} style={{ color: 'var(--grey-40)', marginBottom: '16px' }} />
                      <h3 style={{ fontFamily: 'var(--font-sans)', fontSize: '18px', fontWeight: 800, color: 'var(--black)', marginBottom: '8px' }}>Guest Checkout</h3>
                      <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--grey-50)', marginBottom: '24px', lineHeight: 1.5 }}>No account needed. Checkout securely as a guest.</p>
                      <form onSubmit={handleGuestCheckout} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <input type="email" name="guestEmail" required placeholder="Email address" style={inputStyle} onFocus={(e) => e.target.style.borderColor = 'var(--brand-cyan-hover)'} onBlur={(e) => e.target.style.borderColor = 'var(--grey-20)'} />
                        <button type="submit" className="btn btn-secondary btn-md" style={{ width: '100%' }}>Continue as Guest</button>
                      </form>
                    </div>

                  </div>
                </motion.div>
              )}

              {/* Shipping Form */}
              {currentStep === 'shipping' && checkoutMode === 'shipping' && (
                <motion.form key="shipping" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} onSubmit={handleShippingSubmit} className="checkout-card" style={{ background: 'var(--grey-0)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--grey-10)' }}>
                  {/* Selected-address preview — demo-seeded, shown pre-filled so the
                      walk-through flows straight through; still editable below. */}
                  {shippingAddress?.addressLine1 && (
                    <div
                      role="status"
                      aria-label="Delivering to"
                      style={{
                        display: 'flex', alignItems: 'flex-start', gap: '14px',
                        padding: '14px 16px',
                        borderRadius: 'var(--radius-lg)',
                        background: 'var(--color-brand-subtle)',
                        border: '1px solid rgba(0,186,219,0.25)',
                        marginBottom: 'var(--spacing-24)',
                      }}
                    >
                      <MapPin size={18} style={{ color: 'var(--brand-cyan-hover)', flexShrink: 0, marginTop: '2px' }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontFamily: 'var(--font-sans)',
                            fontSize: '11px',
                            fontWeight: 800,
                            letterSpacing: '0.08em',
                            textTransform: 'uppercase',
                            color: 'var(--brand-cyan-hover)',
                            marginBottom: '4px',
                          }}
                        >
                          Delivering to
                        </div>
                        <div style={{ fontFamily: 'var(--font-sans)', fontSize: '14px', fontWeight: 700, color: 'var(--black)', marginBottom: '2px' }}>
                          {shippingAddress.fullName}
                        </div>
                        <div style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--grey-60)', lineHeight: 1.5 }}>
                          {shippingAddress.addressLine1}
                          {shippingAddress.addressLine2 ? `, ${shippingAddress.addressLine2}` : ''}
                          {' · '}{shippingAddress.city}{' '}{shippingAddress.postalCode}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const el = document.querySelector<HTMLInputElement>('input[name="addressLine1"]');
                          el?.focus();
                          el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--brand-cyan-hover)',
                          fontFamily: 'var(--font-body)',
                          fontSize: '12px',
                          fontWeight: 700,
                          letterSpacing: '0.04em',
                          textTransform: 'uppercase',
                          cursor: 'pointer',
                          flexShrink: 0,
                        }}
                      >
                        Edit
                      </button>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: 'var(--spacing-24)', flexWrap: 'wrap' }}>
                    <h2 style={{ fontFamily: 'var(--font-sans)', fontSize: 'clamp(22px, 5vw, 28px)', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--black)', margin: 0, lineHeight: 1.15 }}>
                      Shipping address
                    </h2>
                    {!isAuthenticated && (
                      <button type="button" onClick={() => setCheckoutMode('selection')} style={{ background: 'none', border: 'none', color: 'var(--brand-cyan-hover)', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Change mode</button>
                    )}
                  </div>

                  {/* Postcode quick-lookup — mocks a PAF-style lookup so the
                      pattern is in place when a real PAF / Loqate feed lands. */}
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', marginBottom: 'var(--spacing-20)' }}>
                    <div style={{ flex: 1 }}>
                      <label style={labelStyle}>Postcode lookup <span style={{ fontWeight: 500, color: 'var(--grey-40)' }}>(demo)</span></label>
                      <input
                        type="text"
                        id="postcode-lookup"
                        placeholder="e.g. SW1A 1AA"
                        style={inputStyle}
                        aria-describedby="postcode-lookup-hint"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const el = document.getElementById('postcode-lookup') as HTMLInputElement | null;
                        const pc = el?.value?.trim() || '';
                        if (!pc) return;
                        const resolved = lookupPostcode(pc);
                        if (!resolved) return;
                        const line1El = document.querySelector<HTMLInputElement>('input[name="addressLine1"]');
                        const cityEl  = document.querySelector<HTMLInputElement>('input[name="city"]');
                        const pcEl    = document.querySelector<HTMLInputElement>('input[name="postalCode"]');
                        if (pcEl) pcEl.value = resolved.postcode;
                        if (cityEl) cityEl.value = resolved.city || cityEl.value;
                        if (line1El && !line1El.value) line1El.value = `1 ${resolved.street}`;
                        line1El?.focus();
                        line1El?.setSelectionRange(0, 1);
                      }}
                      className="btn btn-secondary btn-md"
                    >
                      Find address
                    </button>
                  </div>
                  <p id="postcode-lookup-hint" style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--grey-50)', margin: '0 0 var(--spacing-24) 0' }}>
                    Demo lookup — fills a sample London address. A real PAF/Loqate integration replaces this in production.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div style={{ gridColumn: '1 / -1' }}><label style={labelStyle}>Full Name</label><input type="text" name="fullName" defaultValue={shippingAddress?.fullName || user?.fullName || ''} style={inputStyle} />{formErrors.fullName && <p style={errorStyle}>{formErrors.fullName}</p>}</div>
                    <div><label style={labelStyle}>Email</label><input type="email" name="email" defaultValue={shippingAddress?.email || user?.email || ''} style={inputStyle} />{formErrors.email && <p style={errorStyle}>{formErrors.email}</p>}</div>
                    <div><label style={labelStyle}>Phone</label><input type="tel" name="phone" defaultValue={shippingAddress?.phone} style={inputStyle} />{formErrors.phone && <p style={errorStyle}>{formErrors.phone}</p>}</div>
                    <div style={{ gridColumn: '1 / -1' }}><label style={labelStyle}>Address Line 1</label><input type="text" name="addressLine1" defaultValue={shippingAddress?.addressLine1} style={inputStyle} />{formErrors.addressLine1 && <p style={errorStyle}>{formErrors.addressLine1}</p>}</div>
                    <div style={{ gridColumn: '1 / -1' }}><label style={labelStyle}>Address Line 2 (Optional)</label><input type="text" name="addressLine2" defaultValue={shippingAddress?.addressLine2} style={inputStyle} /></div>
                    <div><label style={labelStyle}>City</label><input type="text" name="city" defaultValue={shippingAddress?.city} style={inputStyle} />{formErrors.city && <p style={errorStyle}>{formErrors.city}</p>}</div>
                    <div><label style={labelStyle}>Postal Code</label><input type="text" name="postalCode" defaultValue={shippingAddress?.postalCode} style={inputStyle} />{formErrors.postalCode && <p style={errorStyle}>{formErrors.postalCode}</p>}</div>
                  </div>

                  {/* Gift message toggle */}
                  <details style={{ marginTop: 'var(--spacing-24)', background: 'var(--grey-5)', borderRadius: 'var(--radius-md)', padding: '12px 16px' }}>
                    <summary style={{ cursor: 'pointer', fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: '14px', color: 'var(--black)' }}>
                      🎁 Add a gift message <span style={{ color: 'var(--grey-50)', fontWeight: 500 }}>— free</span>
                    </summary>
                    <textarea
                      name="giftMessage"
                      maxLength={200}
                      placeholder="Your message (max 200 characters)"
                      style={{ ...inputStyle, marginTop: '10px', minHeight: '64px', padding: '10px 12px', resize: 'vertical', fontFamily: 'var(--font-body)' }}
                    />
                  </details>

                  <h3 style={{ fontFamily: 'var(--font-sans)', fontSize: '18px', fontWeight: 800, color: 'var(--black)', marginTop: 'var(--spacing-48)', marginBottom: 'var(--spacing-20)' }}>Delivery Method</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {SHIPPING_OPTIONS.map((option) => (
                      <label key={option.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', border: shippingOption?.id === option.id ? '2px solid var(--black)' : '1px solid var(--grey-20)', borderRadius: 'var(--radius-lg)', cursor: 'pointer', background: 'var(--grey-0)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                          <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: shippingOption?.id === option.id ? '5px solid var(--black)' : '1px solid var(--grey-30)', background: 'white' }} />
                          <div>
                            <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 700, color: 'var(--black)', marginBottom: '2px' }}>{option.name}</p>
                            <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--grey-50)' }}>{option.description}</p>
                          </div>
                        </div>
                        <span style={{ fontFamily: 'var(--font-sans)', fontSize: '14px', fontWeight: 800, color: 'var(--black)' }}>{option.cost === 0 ? 'FREE' : `£${option.cost.toFixed(2)}`}</span>
                      </label>
                    ))}
                  </div>

                  <button type="submit" className="btn btn-primary btn-lg btn-full" style={{ marginTop: 'var(--spacing-48)' }}>
                    Continue to Payment <ArrowLeft size={16} style={{ transform: 'rotate(180deg)' }} />
                  </button>
                </motion.form>
              )}

              {/* Payment Form */}
              {currentStep === 'payment' && (
                <motion.form key="payment" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} onSubmit={handlePaymentSubmit} className="checkout-card" style={{ background: 'var(--grey-0)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--grey-10)' }}>
                  <div style={{ marginBottom: 'var(--spacing-24)' }}>
                    <button
                      type="button"
                      onClick={() => setCurrentStep('shipping')}
                      aria-label="Back to shipping"
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                        height: '32px', padding: '0 10px 0 6px',
                        background: 'transparent', border: 'none', cursor: 'pointer',
                        color: 'var(--grey-60)', fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 600,
                        marginBottom: '10px',
                      }}
                    >
                      <ArrowLeft size={16} /> Back
                    </button>
                    <h2 style={{ fontFamily: 'var(--font-sans)', fontSize: 'clamp(22px, 5vw, 28px)', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--black)', margin: 0, lineHeight: 1.15 }}>
                      Payment method
                    </h2>
                  </div>

                  <ExpressPayRow
                    selected={paymentType === 'apple_pay' ? 'apple' : paymentType === 'google_pay' ? 'google' : paymentType === 'paypal' ? 'paypal' : null}
                    onSelect={(p) => setPaymentType(p === 'apple' ? 'apple_pay' : p === 'google' ? 'google_pay' : 'paypal')}
                  />

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: 'var(--spacing-32)' }}>
                    <PaymentRadio
                      checked={paymentType === 'card'}
                      onChange={() => setPaymentType('card')}
                      icon={<CreditCard size={20} style={{ color: 'var(--black)', flexShrink: 0 }} />}
                      label="Credit or debit card"
                    />
                    <PaymentRadio
                      checked={paymentType === 'klarna'}
                      onChange={() => setPaymentType('klarna')}
                      icon={<span style={{ fontFamily: 'var(--font-sans)', fontWeight: 800, color: '#ffa8c5', background: '#000', borderRadius: '4px', padding: '2px 6px', fontSize: '11px' }}>Klarna</span>}
                      label="Pay in 3 — 0% interest"
                    />
                    <PaymentRadio
                      checked={paymentType === 'clearpay'}
                      onChange={() => setPaymentType('clearpay')}
                      icon={<span style={{ fontFamily: 'var(--font-sans)', fontWeight: 800, color: '#000', background: '#b6ffda', borderRadius: '4px', padding: '2px 6px', fontSize: '11px' }}>Clearpay</span>}
                      label="Pay in 4 — every 2 weeks"
                    />
                  </div>

                  {paymentType === 'card' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={labelStyle} htmlFor="checkout-card-number">Card Number <span style={{ color: 'var(--grey-40)', fontWeight: 500 }}>(optional for demo)</span></label>
                      <input
                        id="checkout-card-number"
                        name="cardNumber"
                        type="text"
                        inputMode="numeric"
                        autoComplete="cc-number"
                        placeholder="0000 0000 0000 0000"
                        maxLength={23}
                        style={{ ...inputStyle, borderColor: formErrors.cardNumber ? 'var(--color-sale)' : inputStyle.border as string }}
                        aria-invalid={!!formErrors.cardNumber}
                        aria-describedby={formErrors.cardNumber ? 'err-cardNumber' : undefined}
                      />
                      {formErrors.cardNumber && <p id="err-cardNumber" style={errorStyle}>{formErrors.cardNumber}</p>}
                    </div>
                    <div>
                      <label style={labelStyle} htmlFor="checkout-card-expiry">Expiry Date</label>
                      <input
                        id="checkout-card-expiry"
                        name="cardExpiry"
                        type="text"
                        inputMode="numeric"
                        autoComplete="cc-exp"
                        placeholder="MM/YY"
                        maxLength={5}
                        style={{ ...inputStyle, borderColor: formErrors.cardExpiry ? 'var(--color-sale)' : inputStyle.border as string }}
                        aria-invalid={!!formErrors.cardExpiry}
                        aria-describedby={formErrors.cardExpiry ? 'err-cardExpiry' : undefined}
                      />
                      {formErrors.cardExpiry && <p id="err-cardExpiry" style={errorStyle}>{formErrors.cardExpiry}</p>}
                    </div>
                    <div>
                      <label style={labelStyle} htmlFor="checkout-card-cvv">CVV</label>
                      <input
                        id="checkout-card-cvv"
                        name="cardCvv"
                        type="text"
                        inputMode="numeric"
                        autoComplete="cc-csc"
                        placeholder="123"
                        maxLength={4}
                        style={{ ...inputStyle, borderColor: formErrors.cardCvv ? 'var(--color-sale)' : inputStyle.border as string }}
                        aria-invalid={!!formErrors.cardCvv}
                        aria-describedby={formErrors.cardCvv ? 'err-cardCvv' : undefined}
                      />
                      {formErrors.cardCvv && <p id="err-cardCvv" style={errorStyle}>{formErrors.cardCvv}</p>}
                    </div>
                  </div>
                  )}

                  {paymentType !== 'card' && (
                    <div
                      style={{
                        padding: '14px 16px',
                        background: 'var(--color-brand-subtle)',
                        border: '1px solid rgba(0,186,219,0.25)',
                        borderRadius: 'var(--radius-md)',
                        fontFamily: 'var(--font-body)',
                        fontSize: '13px',
                        color: 'var(--brand-cyan-hover)',
                        marginTop: 'var(--spacing-16)',
                      }}
                    >
                      <strong style={{ fontWeight: 700, marginRight: '4px' }}>{PAYMENT_METHOD_LABELS[paymentType].display}</strong>
                      selected — you'll be redirected to confirm on the next step.
                    </div>
                  )}

                  <button type="submit" className="btn btn-primary btn-lg btn-full" style={{ marginTop: 'var(--spacing-48)' }}>
                    Review Order <ArrowLeft size={16} style={{ transform: 'rotate(180deg)' }} />
                  </button>
                </motion.form>
              )}

              {/* Review Step */}
              {currentStep === 'review' && (
                <motion.div key="review" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="checkout-card" style={{ background: 'var(--grey-0)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--grey-10)' }}>
                  <div style={{ marginBottom: 'var(--spacing-24)' }}>
                    <button
                      type="button"
                      onClick={() => setCurrentStep('payment')}
                      aria-label="Back to payment"
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                        height: '32px', padding: '0 10px 0 6px',
                        background: 'transparent', border: 'none', cursor: 'pointer',
                        color: 'var(--grey-60)', fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 600,
                        marginBottom: '10px',
                      }}
                    >
                      <ArrowLeft size={16} /> Back
                    </button>
                    <h2 style={{ fontFamily: 'var(--font-sans)', fontSize: 'clamp(22px, 5vw, 28px)', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--black)', margin: 0, lineHeight: 1.15 }}>
                      Review order
                    </h2>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-24)' }}>
                    <div style={{ padding: 'var(--spacing-24)', background: 'var(--grey-5)', borderRadius: 'var(--radius-lg)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <h3 className="overline" style={{ margin: 0 }}>Shipping Address</h3>
                        <button onClick={() => setCurrentStep('shipping')} style={{ background: 'none', border: 'none', color: 'var(--brand-cyan-hover)', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>Edit</button>
                      </div>
                      <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--black)', lineHeight: 1.5 }}>
                        {shippingAddress?.fullName}<br />{shippingAddress?.addressLine1}<br />{shippingAddress?.city}, {shippingAddress?.postalCode}
                      </p>
                    </div>

                    <div style={{ padding: 'var(--spacing-24)', background: 'var(--grey-5)', borderRadius: 'var(--radius-lg)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <h3 className="overline" style={{ margin: 0 }}>Payment Method</h3>
                        <button onClick={() => setCurrentStep('payment')} style={{ background: 'none', border: 'none', color: 'var(--brand-cyan-hover)', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>Edit</button>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <CreditCard size={20} style={{ color: 'var(--black)' }} />
                        <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--black)' }}>{paymentMethod?.brand} ending in {paymentMethod?.last4}</p>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handlePlaceOrder}
                    disabled={isProcessing}
                    data-loading={isProcessing || undefined}
                    className="btn btn-lg btn-full"
                    style={{
                      marginTop: 'var(--spacing-48)',
                      background: '#FFD814',
                      borderColor: '#FCD200',
                      color: '#0F1111',
                      fontWeight: 800,
                      fontSize: 'clamp(15px, 2vw, 17px)',
                      boxShadow: '0 2px 5px rgba(213,217,217,0.5)',
                      letterSpacing: '-0.01em',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = '#F7CA00';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = '#FFD814';
                    }}
                  >
                    <Lock size={16} /> Place your order · £{total.toFixed(2)}
                  </button>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--grey-50)', textAlign: 'center', marginTop: '10px' }}>
                    By placing your order you agree to our Terms and Conditions.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── Sidebar - Order Summary ─────────────────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-24)' }}>
            <div style={{ background: 'var(--grey-0)', borderRadius: 'var(--radius-xl)', padding: 'var(--spacing-32)', border: '1px solid var(--grey-10)' }}>
              <h3 style={{ fontFamily: 'var(--font-sans)', fontSize: '18px', fontWeight: 800, color: 'var(--black)', marginBottom: 'var(--spacing-24)' }}>Order Summary</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: 'var(--spacing-24)' }}>
                {items.map((item) => (
                  <div key={item.id} style={{ display: 'flex', gap: '16px' }}>
                    <div style={{ width: '64px', height: '64px', background: 'var(--grey-5)', borderRadius: 'var(--radius-md)', padding: '4px', flexShrink: 0, overflow: 'hidden' }}>
                      <ProductImage brand={item.brand} model={item.model} category={item.category} imageUrl={item.imageUrl} alt={item.model} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 700, color: 'var(--black)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.model}</p>
                      <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--grey-50)', marginBottom: '4px' }}>Qty: {item.quantity}</p>
                      <p style={{ fontFamily: 'var(--font-sans)', fontSize: '14px', fontWeight: 800, color: 'var(--black)' }}>£{(item.price * item.quantity).toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Coupon Section */}
              <div style={{ borderTop: '1px solid var(--grey-10)', paddingTop: 'var(--spacing-24)', marginBottom: 'var(--spacing-24)' }}>
                <p className="overline" style={{ marginBottom: '12px' }}>Promo Code</p>
                {appliedCoupon ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyItems: 'space-between', padding: '12px', background: 'var(--grey-5)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--color-trust-text)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                      <Tag size={14} color="var(--color-trust-text)" />
                      <span style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 700, color: 'var(--color-trust-text)' }}>{appliedCoupon.code}</span>
                    </div>
                    <button onClick={removeCoupon} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', color: 'var(--color-trust-text)' }}><X size={14} /></button>
                  </div>
                ) : (
                  <form onSubmit={handleApplyCoupon} style={{ display: 'flex', gap: '8px' }}>
                    <input type="text" value={couponCode} onChange={(e) => setCouponCode(e.target.value)} placeholder="Enter code" style={{ ...inputStyle, padding: '10px 12px', flex: 1 }} />
                    <button type="submit" className="btn btn-secondary" style={{ padding: '0 16px', height: '42px', fontSize: '12px' }}>Apply</button>
                  </form>
                )}
                {couponError && <p style={errorStyle}>{couponError}</p>}
                {!appliedCoupon && <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--grey-40)', marginTop: '8px' }}>Got a promo code from our newsletter? Paste it above.</p>}
              </div>

              {/* Totals */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid var(--grey-10)', paddingTop: 'var(--spacing-24)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--grey-50)' }}>
                  <span>Subtotal</span> <span style={{ color: 'var(--black)', fontWeight: 600 }}>£{subtotal.toFixed(2)}</span>
                </div>
                {discount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--color-trust-text)', fontWeight: 600 }}>
                    <span>Discount</span> <span>-£{discount.toFixed(2)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--grey-50)' }}>
                  <span>Shipping</span> <span style={{ color: 'var(--black)', fontWeight: 600 }}>£{shippingCost.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--grey-50)' }}>
                  <span>Estimated Tax (20%)</span> <span style={{ color: 'var(--black)', fontWeight: 600 }}>£{tax.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--grey-10)', paddingTop: '16px', marginTop: '4px' }}>
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: '18px', fontWeight: 800, color: 'var(--black)' }}>Total</span>
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: '24px', fontWeight: 900, color: 'var(--black)' }}>£{total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Trust Signal Box */}
            <div style={{ background: 'var(--black)', borderRadius: 'var(--radius-xl)', padding: 'var(--spacing-24)', color: 'white' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <Truck size={20} color="white" />
                <p style={{ fontFamily: 'var(--font-sans)', fontSize: '14px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Fast Delivery</p>
              </div>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--grey-20)', lineHeight: 1.5, margin: 0 }}>
                Orders placed before 4 PM are eligible for Next-Day Delivery. All shipments are fully insured and tracked.
              </p>
            </div>
          </div>
        </div>
      </div>
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} onSuccess={() => setCheckoutMode('shipping')} />
    </div>
  );
}

function Row({ label, value, accent, trust }: { label: string; value: string; accent?: boolean; trust?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: 'var(--font-body)', fontSize: '14px' }}>
      <span style={{ color: 'var(--grey-50)' }}>{label}</span>
      <span
        style={{
          color: trust ? 'var(--color-trust-text)' : accent ? 'var(--color-trust-text)' : 'var(--black)',
          fontWeight: trust || accent ? 700 : 600,
          fontFamily: trust ? 'var(--font-sans)' : 'var(--font-body)',
          letterSpacing: trust ? '0.06em' : 0,
          fontSize: trust ? '13px' : '14px',
        }}
      >
        {value}
      </span>
    </div>
  );
}

function PaymentRadio({
  checked, onChange, icon, label,
}: { checked: boolean; onChange: () => void; icon: React.ReactNode; label: string }) {
  return (
    <label
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        padding: '14px 16px',
        border: checked ? '2px solid var(--brand-cyan)' : '1px solid var(--grey-20)',
        background: checked ? 'var(--color-brand-subtle)' : 'var(--grey-0)',
        borderRadius: 'var(--radius-lg)',
        cursor: 'pointer',
        transition: 'background var(--duration-fast), border-color var(--duration-fast)',
      }}
    >
      <input
        type="radio"
        name="paymentType"
        checked={checked}
        onChange={onChange}
        style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}
      />
      <span
        aria-hidden
        style={{
          width: '18px',
          height: '18px',
          borderRadius: '50%',
          border: checked ? '2px solid var(--brand-cyan)' : '1.5px solid var(--grey-30)',
          background: 'var(--grey-0)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {checked && <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--brand-cyan)' }} />}
      </span>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', flex: 1 }}>
        {icon}
        <span style={{ fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 700, color: 'var(--black)' }}>{label}</span>
      </span>
    </label>
  );
}
