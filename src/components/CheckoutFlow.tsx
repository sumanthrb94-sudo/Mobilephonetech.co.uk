import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import { useCheckout, SHIPPING_OPTIONS, ShippingAddress, PaymentMethod, Order } from '../context/CheckoutContext';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Check, Lock, Truck, CreditCard, CheckCircle2, Tag, X, User, LogIn } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import AuthModal from './AuthModal';

/**
 * CheckoutFlow — Verified Form design philosophy
 * Space: Immense negative space, clean borders, minimal decoration.
 * Colour: Pure white background for form inputs, grey-5 for summaries. Black primary actions. Blue strictly for active states/trust.
 * Typography: Playfair Display for main titles. DM Sans for functional. Inter for data.
 * Structure: Clinical and trustworthy.
 */

export default function CheckoutFlow() {
  const { items, cartTotal, clearCart } = useCart();
  const { 
    currentStep, setCurrentStep, shippingAddress, setShippingAddress,
    shippingOption, setShippingOption, paymentMethod, setPaymentMethod,
    appliedCoupon, applyCoupon, removeCoupon, createOrder, lastOrder,
  } = useCheckout();
  const { user, isAuthenticated, continueAsGuest } = useAuth();

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [couponError, setCouponError] = useState('');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [checkoutMode, setCheckoutMode] = useState<'selection' | 'shipping'>(isAuthenticated || user?.isGuest ? 'shipping' : 'selection');

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

  const validateShippingForm = (data: any) => {
    const errors: Record<string, string> = {};
    if (!data.fullName) errors.fullName = 'Full name is required';
    if (!data.email) errors.email = 'Email is required';
    if (!data.phone) errors.phone = 'Phone number is required';
    if (!data.addressLine1) errors.addressLine1 = 'Address is required';
    if (!data.city) errors.city = 'City is required';
    if (!data.postalCode) errors.postalCode = 'Postal code is required';
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
    const method: PaymentMethod = {
      id: Math.random().toString(36).substr(2, 9),
      type: formData.get('paymentType') as 'card' | 'paypal' | 'apple_pay',
      last4: formData.get('cardLast4') as string,
      brand: formData.get('cardBrand') as string,
    };

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
    return (
      <div style={{ minHeight: '100vh', background: 'var(--grey-0)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--spacing-24)' }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
          style={{ background: 'var(--grey-0)', border: '1px solid var(--grey-10)', borderRadius: 'var(--radius-xl)', padding: 'var(--spacing-48)', width: '100%', maxWidth: '480px', textAlign: 'center' }}
        >
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 20 }} style={{ width: '64px', height: '64px', background: 'var(--trust-green)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto var(--spacing-24)' }}>
            <CheckCircle2 size={32} color="white" />
          </motion.div>

          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '32px', fontWeight: 700, color: 'var(--black)', marginBottom: '8px' }}>Order Confirmed</h2>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '15px', color: 'var(--grey-50)', marginBottom: 'var(--spacing-32)' }}>Thank you for your purchase.</p>

          <div style={{ background: 'var(--grey-5)', borderRadius: 'var(--radius-lg)', padding: 'var(--spacing-24)', textAlign: 'left', marginBottom: 'var(--spacing-32)' }}>
            <p className="overline" style={{ marginBottom: '4px' }}>Order Number</p>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '24px', fontWeight: 800, color: 'var(--black)', marginBottom: 'var(--spacing-24)' }}>{lastOrder.id}</p>

            <div style={{ borderTop: '1px solid var(--grey-10)', paddingTop: 'var(--spacing-16)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--grey-50)' }}>
                <span>Subtotal</span> <span style={{ color: 'var(--black)', fontWeight: 600 }}>£{lastOrder.subtotal.toFixed(2)}</span>
              </div>
              {discount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--trust-green)', fontWeight: 600 }}>
                  <span>Discount</span> <span>-£{discount.toFixed(2)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--grey-50)' }}>
                <span>Shipping</span> <span style={{ color: 'var(--black)', fontWeight: 600 }}>£{lastOrder.shippingCost.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--grey-50)' }}>
                <span>Tax (20%)</span> <span style={{ color: 'var(--black)', fontWeight: 600 }}>£{lastOrder.tax.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--grey-10)', paddingTop: '12px', marginTop: '4px' }}>
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: '16px', fontWeight: 800, color: 'var(--black)' }}>Total</span>
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: '20px', fontWeight: 900, color: 'var(--black)' }}>£{lastOrder.total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--grey-50)', marginBottom: 'var(--spacing-32)' }}>
            A confirmation email has been sent to <strong style={{ color: 'var(--black)' }}>{lastOrder.shippingAddress.email}</strong>.
          </p>

          <button onClick={() => window.location.href = '/'} className="btn btn-primary btn-lg" style={{ width: '100%' }}>Continue Shopping</button>
        </motion.div>
      </div>
    );
  }

  // ── COMMON STYLES ──────────────────────────────────────────────────────────
  const inputStyle = { width: '100%', padding: '14px 16px', background: 'var(--grey-0)', border: '1px solid var(--grey-20)', borderRadius: 'var(--radius-md)', fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--black)', outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box' as const };
  const labelStyle = { display: 'block', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700, color: 'var(--black)', marginBottom: '8px' };
  const errorStyle = { fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: 600, color: 'var(--red)', marginTop: '4px' };

  return (
    <div style={{ background: 'var(--grey-5)', minHeight: '100vh', paddingTop: '100px', paddingBottom: '80px' }}>
      <div className="container-bm" style={{ maxWidth: '1024px' }}>
        
        {/* Progress Indicator */}
        <div style={{ marginBottom: 'var(--spacing-48)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {['Shipping', 'Payment', 'Review'].map((step, index) => {
              const isActive = (index === 0 && ['shipping', 'payment', 'review'].includes(currentStep)) || (index === 1 && ['payment', 'review'].includes(currentStep)) || (index === 2 && currentStep === 'review');
              const isCompleted = (index === 0 && ['payment', 'review'].includes(currentStep)) || (index === 1 && currentStep === 'review');
              
              return (
                <div key={step} style={{ display: 'flex', alignItems: 'center', flex: 1, ...((index === 2) ? { flex: 'none' } : {}) }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-sans)', fontSize: '13px', fontWeight: 800, transition: 'all 0.3s', background: isActive ? 'var(--blue-60)' : 'var(--grey-10)', color: isActive ? 'white' : 'var(--grey-40)' }}>
                    {isCompleted ? <Check size={16} strokeWidth={3} /> : index + 1}
                  </div>
                  {index < 2 && <div style={{ flex: 1, height: '2px', margin: '0 16px', background: isCompleted ? 'var(--blue-60)' : 'var(--grey-10)', transition: 'background 0.3s' }} />}
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* ── Main Content Area ─────────────────────────────────────────── */}
          <div className="lg:col-span-2">
            <AnimatePresence mode="wait">
              
              {/* Login / Guest Selection */}
              {checkoutMode === 'selection' && !isAuthenticated && !user?.isGuest && (
                <motion.div key="selection" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} style={{ background: 'var(--grey-0)', borderRadius: 'var(--radius-xl)', padding: 'var(--spacing-32)', border: '1px solid var(--grey-10)' }}>
                  <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '32px', fontWeight: 700, color: 'var(--black)', marginBottom: 'var(--spacing-24)' }}>Checkout</h2>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-24)' }} className="md:grid-cols-2 grid-cols-1">
                    
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
                        <input type="email" name="guestEmail" required placeholder="Email address" style={inputStyle} onFocus={(e) => e.target.style.borderColor = 'var(--blue-60)'} onBlur={(e) => e.target.style.borderColor = 'var(--grey-20)'} />
                        <button type="submit" className="btn btn-secondary btn-md" style={{ width: '100%' }}>Continue as Guest</button>
                      </form>
                    </div>

                  </div>
                </motion.div>
              )}

              {/* Shipping Form */}
              {currentStep === 'shipping' && checkoutMode === 'shipping' && (
                <motion.form key="shipping" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} onSubmit={handleShippingSubmit} style={{ background: 'var(--grey-0)', borderRadius: 'var(--radius-xl)', padding: 'var(--spacing-32)', border: '1px solid var(--grey-10)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-32)' }}>
                    <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '28px', fontWeight: 700, color: 'var(--black)' }}>Shipping Address</h2>
                    {!isAuthenticated && (
                      <button type="button" onClick={() => setCheckoutMode('selection')} style={{ background: 'none', border: 'none', color: 'var(--blue-60)', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Change Mode</button>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-24)' }}>
                    <div style={{ gridColumn: '1 / -1' }}><label style={labelStyle}>Full Name</label><input type="text" name="fullName" defaultValue={shippingAddress?.fullName || user?.fullName || ''} style={inputStyle} />{formErrors.fullName && <p style={errorStyle}>{formErrors.fullName}</p>}</div>
                    <div><label style={labelStyle}>Email</label><input type="email" name="email" defaultValue={shippingAddress?.email || user?.email || ''} style={inputStyle} />{formErrors.email && <p style={errorStyle}>{formErrors.email}</p>}</div>
                    <div><label style={labelStyle}>Phone</label><input type="tel" name="phone" defaultValue={shippingAddress?.phone} style={inputStyle} />{formErrors.phone && <p style={errorStyle}>{formErrors.phone}</p>}</div>
                    <div style={{ gridColumn: '1 / -1' }}><label style={labelStyle}>Address Line 1</label><input type="text" name="addressLine1" defaultValue={shippingAddress?.addressLine1} style={inputStyle} />{formErrors.addressLine1 && <p style={errorStyle}>{formErrors.addressLine1}</p>}</div>
                    <div style={{ gridColumn: '1 / -1' }}><label style={labelStyle}>Address Line 2 (Optional)</label><input type="text" name="addressLine2" defaultValue={shippingAddress?.addressLine2} style={inputStyle} /></div>
                    <div><label style={labelStyle}>City</label><input type="text" name="city" defaultValue={shippingAddress?.city} style={inputStyle} />{formErrors.city && <p style={errorStyle}>{formErrors.city}</p>}</div>
                    <div><label style={labelStyle}>Postal Code</label><input type="text" name="postalCode" defaultValue={shippingAddress?.postalCode} style={inputStyle} />{formErrors.postalCode && <p style={errorStyle}>{formErrors.postalCode}</p>}</div>
                  </div>

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

                  <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%', marginTop: 'var(--spacing-48)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    Continue to Payment <ArrowLeft size={16} style={{ transform: 'rotate(180deg)' }} />
                  </button>
                </motion.form>
              )}

              {/* Payment Form */}
              {currentStep === 'payment' && (
                <motion.form key="payment" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} onSubmit={handlePaymentSubmit} style={{ background: 'var(--grey-0)', borderRadius: 'var(--radius-xl)', padding: 'var(--spacing-32)', border: '1px solid var(--grey-10)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: 'var(--spacing-32)' }}>
                    <button type="button" onClick={() => setCurrentStep('shipping')} style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyItems: 'center', background: 'var(--grey-5)', border: 'none', borderRadius: '50%', cursor: 'pointer', color: 'var(--black)' }}><ArrowLeft size={16} style={{margin: 'auto'}} /></button>
                    <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '28px', fontWeight: 700, color: 'var(--black)' }}>Payment Method</h2>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: 'var(--spacing-32)' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', border: '2px solid var(--black)', borderRadius: 'var(--radius-lg)', cursor: 'pointer' }}>
                      <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: '5px solid var(--black)', background: 'white' }} />
                      <CreditCard size={20} style={{ color: 'var(--black)' }} />
                      <span style={{ fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 700, color: 'var(--black)' }}>Credit or Debit Card</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', border: '1px solid var(--grey-20)', borderRadius: 'var(--radius-lg)', cursor: 'not-allowed', opacity: 0.5 }}>
                      <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: '1px solid var(--grey-30)', background: 'white' }} />
                      <span style={{ fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 700, color: 'var(--black)' }}>PayPal (Coming Soon)</span>
                    </label>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-24)' }}>
                    <div style={{ gridColumn: '1 / -1' }}><label style={labelStyle}>Card Number</label><input type="text" placeholder="0000 0000 0000 0000" style={inputStyle} /></div>
                    <div><label style={labelStyle}>Expiry Date</label><input type="text" placeholder="MM/YY" style={inputStyle} /></div>
                    <div><label style={labelStyle}>CVV</label><input type="text" placeholder="123" style={inputStyle} /></div>
                    <input type="hidden" name="cardLast4" value="4242" />
                    <input type="hidden" name="cardBrand" value="Visa" />
                  </div>

                  <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%', marginTop: 'var(--spacing-48)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    Review Order <ArrowLeft size={16} style={{ transform: 'rotate(180deg)' }} />
                  </button>
                </motion.form>
              )}

              {/* Review Step */}
              {currentStep === 'review' && (
                <motion.div key="review" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} style={{ background: 'var(--grey-0)', borderRadius: 'var(--radius-xl)', padding: 'var(--spacing-32)', border: '1px solid var(--grey-10)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: 'var(--spacing-32)' }}>
                    <button type="button" onClick={() => setCurrentStep('payment')} style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyItems: 'center', background: 'var(--grey-5)', border: 'none', borderRadius: '50%', cursor: 'pointer', color: 'var(--black)' }}><ArrowLeft size={16} style={{margin: 'auto'}} /></button>
                    <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '28px', fontWeight: 700, color: 'var(--black)' }}>Review Order</h2>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-24)' }}>
                    <div style={{ padding: 'var(--spacing-24)', background: 'var(--grey-5)', borderRadius: 'var(--radius-lg)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <h3 className="overline" style={{ margin: 0 }}>Shipping Address</h3>
                        <button onClick={() => setCurrentStep('shipping')} style={{ background: 'none', border: 'none', color: 'var(--blue-60)', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>Edit</button>
                      </div>
                      <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--black)', lineHeight: 1.5 }}>
                        {shippingAddress?.fullName}<br />{shippingAddress?.addressLine1}<br />{shippingAddress?.city}, {shippingAddress?.postalCode}
                      </p>
                    </div>

                    <div style={{ padding: 'var(--spacing-24)', background: 'var(--grey-5)', borderRadius: 'var(--radius-lg)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <h3 className="overline" style={{ margin: 0 }}>Payment Method</h3>
                        <button onClick={() => setCurrentStep('payment')} style={{ background: 'none', border: 'none', color: 'var(--blue-60)', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>Edit</button>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <CreditCard size={20} style={{ color: 'var(--black)' }} />
                        <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--black)' }}>{paymentMethod?.brand} ending in {paymentMethod?.last4}</p>
                      </div>
                    </div>
                  </div>

                  <button onClick={handlePlaceOrder} disabled={isProcessing} className="btn btn-primary btn-lg" style={{ width: '100%', marginTop: 'var(--spacing-48)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', opacity: isProcessing ? 0.7 : 1 }}>
                    {isProcessing ? (
                      <>Processing...</>
                    ) : (
                      <><Lock size={16} /> Place Order • £{total.toFixed(2)}</>
                    )}
                  </button>
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
                    <div style={{ width: '64px', height: '64px', background: 'var(--grey-5)', borderRadius: 'var(--radius-md)', padding: '4px', flexShrink: 0 }}>
                      <img src={item.imageUrl} alt={item.model} style={{ width: '100%', height: '100%', objectFit: 'contain', mixBlendMode: 'multiply' }} />
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
                  <div style={{ display: 'flex', alignItems: 'center', justifyItems: 'space-between', padding: '12px', background: 'var(--grey-5)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--trust-green)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                      <Tag size={14} color="var(--trust-green)" />
                      <span style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 700, color: 'var(--trust-green)' }}>{appliedCoupon.code}</span>
                    </div>
                    <button onClick={removeCoupon} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', color: 'var(--trust-green)' }}><X size={14} /></button>
                  </div>
                ) : (
                  <form onSubmit={handleApplyCoupon} style={{ display: 'flex', gap: '8px' }}>
                    <input type="text" value={couponCode} onChange={(e) => setCouponCode(e.target.value)} placeholder="Enter code" style={{ ...inputStyle, padding: '10px 12px', flex: 1 }} />
                    <button type="submit" className="btn btn-secondary" style={{ padding: '0 16px', height: '42px', fontSize: '12px' }}>Apply</button>
                  </form>
                )}
                {couponError && <p style={errorStyle}>{couponError}</p>}
                {!appliedCoupon && <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--grey-40)', marginTop: '8px' }}>Try "SAVE10" or "WELCOME20"</p>}
              </div>

              {/* Totals */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid var(--grey-10)', paddingTop: 'var(--spacing-24)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--grey-50)' }}>
                  <span>Subtotal</span> <span style={{ color: 'var(--black)', fontWeight: 600 }}>£{subtotal.toFixed(2)}</span>
                </div>
                {discount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--trust-green)', fontWeight: 600 }}>
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
