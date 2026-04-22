import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import { useCheckout, SHIPPING_OPTIONS, ShippingAddress, PaymentMethod, Order } from '../context/CheckoutContext';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Check, Lock, Truck, CreditCard, CheckCircle2, Tag, X, User, LogIn } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import AuthModal from './AuthModal';

export default function CheckoutFlow() {
  const { items, cartTotal, clearCart } = useCart();
  const { 
    currentStep, 
    setCurrentStep, 
    shippingAddress, 
    setShippingAddress,
    shippingOption,
    setShippingOption,
    paymentMethod,
    setPaymentMethod,
    appliedCoupon,
    applyCoupon,
    removeCoupon,
    createOrder,
    lastOrder,
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
      fullName: formData.get('fullName'),
      email: formData.get('email'),
      phone: formData.get('phone'),
      addressLine1: formData.get('addressLine1'),
      addressLine2: formData.get('addressLine2'),
      city: formData.get('city'),
      postalCode: formData.get('postalCode'),
      country: formData.get('country') || 'United Kingdom',
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
    const paymentType = formData.get('paymentType') as 'card' | 'paypal' | 'apple_pay';

    const method: PaymentMethod = {
      id: Math.random().toString(36).substr(2, 9),
      type: paymentType,
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
    
    const success = applyCoupon(couponCode);
    if (success) {
      setCouponCode('');
    } else {
      setCouponError('Invalid coupon code');
    }
  };

  const handlePlaceOrder = async () => {
    if (!shippingAddress || !paymentMethod || !shippingOption) {
      alert('Please complete all steps');
      return;
    }

    setIsProcessing(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));

    const order: Order = {
      id: `ORD-${Date.now()}`,
      items,
      shippingAddress,
      shippingOption,
      paymentMethod,
      subtotal,
      shippingCost,
      tax,
      total,
      status: 'confirmed',
      createdAt: new Date().toISOString(),
    };

    createOrder(order);
    clearCart();
    setCurrentStep('confirmation');
    setIsProcessing(false);
  };

  const handleGuestCheckout = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const email = new FormData(e.currentTarget).get('guestEmail') as string;
    if (email) {
      continueAsGuest(email);
      setCheckoutMode('shipping');
    }
  };

  if (currentStep === 'confirmation' && lastOrder) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl shadow-2xl p-8 max-w-md text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2 }}
            className="h-16 w-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6"
          >
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
          </motion.div>

          <h2 className="text-3xl font-black text-slate-900 mb-2">Order Confirmed!</h2>
          <p className="text-slate-600 font-medium mb-8">Thank you for your purchase</p>

          <div className="bg-slate-50 rounded-2xl p-6 mb-8 text-left">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Order Number</p>
            <p className="text-2xl font-black text-slate-900 mb-6">{lastOrder.id}</p>

            <div className="space-y-3 border-t border-slate-200 pt-6">
              <div className="flex justify-between">
                <span className="text-slate-600 font-medium">Subtotal</span>
                <span className="font-bold text-slate-900">£{lastOrder.subtotal.toFixed(2)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span className="font-medium">Discount</span>
                  <span className="font-bold">-£{discount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-600 font-medium">Shipping</span>
                <span className="font-bold text-slate-900">£{lastOrder.shippingCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 font-medium">Tax</span>
                <span className="font-bold text-slate-900">£{lastOrder.tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-3">
                <span className="font-black text-slate-900">Total</span>
                <span className="text-xl font-black text-slate-900">£{lastOrder.total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <p className="text-sm text-slate-500 font-medium mb-6">
            A confirmation email has been sent to <strong>{lastOrder.shippingAddress.email}</strong>
          </p>

          <button
            onClick={() => window.location.href = '/'}
            className="w-full px-6 py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors"
          >
            Continue Shopping
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pt-24 pb-20">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* Progress Indicator */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-8">
            {['Shipping', 'Payment', 'Review'].map((step, index) => {
              const isActive = (index === 0 && (currentStep === 'shipping' || currentStep === 'payment' || currentStep === 'review')) ||
                              (index === 1 && (currentStep === 'payment' || currentStep === 'review')) ||
                              (index === 2 && currentStep === 'review');
              const isCompleted = (index === 0 && (currentStep === 'payment' || currentStep === 'review')) ||
                                 (index === 1 && currentStep === 'review');
              
              return (
                <div key={step} className="flex items-center flex-1 last:flex-none">
                  <motion.div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm transition-all ${
                      isActive ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {isCompleted ? <Check className="h-5 w-5" /> : index + 1}
                  </motion.div>
                  {index < 2 && (
                    <div className={`flex-1 h-1 mx-2 rounded-full transition-all ${
                      isCompleted ? 'bg-blue-600' : 'bg-slate-200'
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <AnimatePresence mode="wait">
              {checkoutMode === 'selection' && !isAuthenticated && !user?.isGuest && (
                <motion.div
                  key="selection"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-6"
                >
                  <div className="bg-white rounded-3xl p-8 border border-slate-100">
                    <h2 className="text-2xl font-black text-slate-900 mb-6">Checkout</h2>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="p-6 rounded-2xl border-2 border-slate-100 hover:border-blue-500 transition-all group">
                        <LogIn className="h-8 w-8 text-blue-600 mb-4" />
                        <h3 className="text-lg font-black text-slate-900 mb-2">Returning Customer</h3>
                        <p className="text-sm text-slate-500 font-medium mb-6">Sign in to your account for a faster checkout experience.</p>
                        <button 
                          onClick={() => setIsAuthModalOpen(true)}
                          className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-blue-600 transition-colors"
                        >
                          Sign In
                        </button>
                      </div>
                      <div className="p-6 rounded-2xl border-2 border-slate-100 hover:border-blue-500 transition-all">
                        <User className="h-8 w-8 text-slate-600 mb-4" />
                        <h3 className="text-lg font-black text-slate-900 mb-2">Guest Checkout</h3>
                        <p className="text-sm text-slate-500 font-medium mb-6">No account? No problem. Checkout as a guest.</p>
                        <form onSubmit={handleGuestCheckout} className="space-y-3">
                          <input 
                            type="email" 
                            name="guestEmail"
                            required
                            placeholder="Email address"
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20"
                          />
                          <button 
                            type="submit"
                            className="w-full py-3 border-2 border-slate-900 text-slate-900 rounded-xl font-bold hover:bg-slate-900 hover:text-white transition-all"
                          >
                            Continue as Guest
                          </button>
                        </form>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {currentStep === 'shipping' && checkoutMode === 'shipping' && (
                <motion.form
                  key="shipping"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  onSubmit={handleShippingSubmit}
                  className="bg-white rounded-3xl p-8"
                >
                  <div className="flex items-center justify-between mb-8">
                    <h2 className="text-2xl font-black text-slate-900">Shipping Address</h2>
                    {!isAuthenticated && (
                      <button 
                        type="button"
                        onClick={() => setCheckoutMode('selection')}
                        className="text-xs font-black text-blue-600 uppercase tracking-widest hover:underline"
                      >
                        Change Mode
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-6 mb-6">
                    <div className="col-span-2">
                      <label className="block text-sm font-bold text-slate-900 mb-2">Full Name</label>
                      <input
                        type="text"
                        name="fullName"
                        defaultValue={shippingAddress?.fullName || user?.fullName || ''}
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl font-medium outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                      {formErrors.fullName && <p className="text-red-600 text-xs mt-1">{formErrors.fullName}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-900 mb-2">Email</label>
                      <input
                        type="email"
                        name="email"
                        defaultValue={shippingAddress?.email || user?.email || ''}
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl font-medium outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                      {formErrors.email && <p className="text-red-600 text-xs mt-1">{formErrors.email}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-900 mb-2">Phone</label>
                      <input
                        type="tel"
                        name="phone"
                        defaultValue={shippingAddress?.phone}
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl font-medium outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                      {formErrors.phone && <p className="text-red-600 text-xs mt-1">{formErrors.phone}</p>}
                    </div>

                    <div className="col-span-2">
                      <label className="block text-sm font-bold text-slate-900 mb-2">Address Line 1</label>
                      <input
                        type="text"
                        name="addressLine1"
                        defaultValue={shippingAddress?.addressLine1}
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl font-medium outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                      {formErrors.addressLine1 && <p className="text-red-600 text-xs mt-1">{formErrors.addressLine1}</p>}
                    </div>

                    <div className="col-span-2">
                      <label className="block text-sm font-bold text-slate-900 mb-2">Address Line 2 (Optional)</label>
                      <input
                        type="text"
                        name="addressLine2"
                        defaultValue={shippingAddress?.addressLine2}
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl font-medium outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-900 mb-2">City</label>
                      <input
                        type="text"
                        name="city"
                        defaultValue={shippingAddress?.city}
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl font-medium outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                      {formErrors.city && <p className="text-red-600 text-xs mt-1">{formErrors.city}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-900 mb-2">Postal Code</label>
                      <input
                        type="text"
                        name="postalCode"
                        defaultValue={shippingAddress?.postalCode}
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl font-medium outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                      {formErrors.postalCode && <p className="text-red-600 text-xs mt-1">{formErrors.postalCode}</p>}
                    </div>
                  </div>

                  <h3 className="text-lg font-black text-slate-900 mb-4 mt-8">Delivery Method</h3>
                  <div className="space-y-3">
                    {SHIPPING_OPTIONS.map((option) => (
                      <label
                        key={option.id}
                        className={`flex items-center justify-between p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                          shippingOption?.id === option.id
                            ? 'border-blue-600 bg-blue-50'
                            : 'border-slate-100 hover:border-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="shippingOption"
                            checked={shippingOption?.id === option.id}
                            onChange={() => setShippingOption(option)}
                            className="h-4 w-4 text-blue-600"
                          />
                          <div>
                            <p className="font-bold text-slate-900">{option.name}</p>
                            <p className="text-xs text-slate-500 font-medium">{option.description}</p>
                          </div>
                        </div>
                        <span className="font-black text-slate-900">
                          {option.cost === 0 ? 'FREE' : `£${option.cost.toFixed(2)}`}
                        </span>
                      </label>
                    ))}
                  </div>

                  <button
                    type="submit"
                    className="w-full mt-8 px-6 py-4 bg-slate-900 text-white rounded-xl font-bold hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
                  >
                    Continue to Payment
                    <ArrowLeft className="h-4 w-4 rotate-180" />
                  </button>
                </motion.form>
              )}

              {currentStep === 'payment' && (
                <motion.form
                  key="payment"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  onSubmit={handlePaymentSubmit}
                  className="bg-white rounded-3xl p-8"
                >
                  <div className="flex items-center gap-4 mb-8">
                    <button
                      type="button"
                      onClick={() => setCurrentStep('shipping')}
                      className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </button>
                    <h2 className="text-2xl font-black text-slate-900">Payment Method</h2>
                  </div>

                  <div className="space-y-4 mb-8">
                    <label className="flex items-center gap-4 p-4 rounded-2xl border-2 border-blue-600 bg-blue-50 cursor-pointer">
                      <input type="radio" name="paymentType" value="card" defaultChecked className="h-4 w-4 text-blue-600" />
                      <CreditCard className="h-6 w-6 text-slate-900" />
                      <span className="font-bold text-slate-900">Credit or Debit Card</span>
                    </label>
                    <label className="flex items-center gap-4 p-4 rounded-2xl border-2 border-slate-100 opacity-50 cursor-not-allowed">
                      <input type="radio" name="paymentType" value="paypal" disabled className="h-4 w-4 text-blue-600" />
                      <span className="font-bold text-slate-900">PayPal (Coming Soon)</span>
                    </label>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-900 mb-2">Card Number</label>
                      <input
                        type="text"
                        placeholder="0000 0000 0000 0000"
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl font-medium outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-slate-900 mb-2">Expiry Date</label>
                        <input
                          type="text"
                          placeholder="MM/YY"
                          className="w-full px-4 py-3 border border-slate-200 rounded-xl font-medium outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-900 mb-2">CVV</label>
                        <input
                          type="text"
                          placeholder="123"
                          className="w-full px-4 py-3 border border-slate-200 rounded-xl font-medium outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                      </div>
                    </div>
                    <input type="hidden" name="cardLast4" value="4242" />
                    <input type="hidden" name="cardBrand" value="Visa" />
                  </div>

                  <button
                    type="submit"
                    className="w-full mt-8 px-6 py-4 bg-slate-900 text-white rounded-xl font-bold hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
                  >
                    Review Order
                    <ArrowLeft className="h-4 w-4 rotate-180" />
                  </button>
                </motion.form>
              )}

              {currentStep === 'review' && (
                <motion.div
                  key="review"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="bg-white rounded-3xl p-8"
                >
                  <div className="flex items-center gap-4 mb-8">
                    <button
                      onClick={() => setCurrentStep('payment')}
                      className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </button>
                    <h2 className="text-2xl font-black text-slate-900">Review Order</h2>
                  </div>

                  <div className="space-y-6">
                    <div className="p-6 bg-slate-50 rounded-2xl">
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Shipping Address</h3>
                        <button onClick={() => setCurrentStep('shipping')} className="text-xs font-bold text-blue-600 hover:underline">Edit</button>
                      </div>
                      <p className="text-sm text-slate-600 font-medium">
                        {shippingAddress?.fullName}<br />
                        {shippingAddress?.addressLine1}<br />
                        {shippingAddress?.city}, {shippingAddress?.postalCode}
                      </p>
                    </div>

                    <div className="p-6 bg-slate-50 rounded-2xl">
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Payment Method</h3>
                        <button onClick={() => setCurrentStep('payment')} className="text-xs font-bold text-blue-600 hover:underline">Edit</button>
                      </div>
                      <div className="flex items-center gap-3">
                        <CreditCard className="h-5 w-5 text-slate-600" />
                        <p className="text-sm text-slate-600 font-medium">
                          {paymentMethod?.brand} ending in {paymentMethod?.last4}
                        </p>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handlePlaceOrder}
                    disabled={isProcessing}
                    className="w-full mt-8 px-6 py-4 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isProcessing ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full"
                        />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Lock className="h-4 w-4" />
                        Place Order • £{total.toFixed(2)}
                      </>
                    )}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Sidebar - Order Summary */}
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
              <h3 className="text-lg font-black text-slate-900 mb-6">Order Summary</h3>
              
              <div className="space-y-4 mb-6">
                {items.map((item) => (
                  <div key={item.id} className="flex gap-4">
                    <div className="h-16 w-16 bg-slate-100 rounded-xl overflow-hidden shrink-0">
                      <img src={item.image} alt={item.model} className="h-full w-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">{item.model}</p>
                      <p className="text-xs text-slate-500 font-medium">Qty: {item.quantity}</p>
                      <p className="text-sm font-black text-slate-900">£{(item.price * item.quantity).toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Coupon Section */}
              <div className="pt-6 border-t border-slate-100 mb-6">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Promo Code</p>
                {appliedCoupon ? (
                  <div className="flex items-center justify-between bg-emerald-50 border border-emerald-100 p-3 rounded-xl">
                    <div className="flex items-center gap-2">
                      <Tag className="h-4 w-4 text-emerald-600" />
                      <span className="text-sm font-bold text-emerald-700">{appliedCoupon.code}</span>
                    </div>
                    <button onClick={removeCoupon} className="p-1 hover:bg-emerald-100 rounded-full transition-colors">
                      <X className="h-4 w-4 text-emerald-600" />
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleApplyCoupon} className="flex gap-2">
                    <input
                      type="text"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      placeholder="Enter code"
                      className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                    <button 
                      type="submit"
                      className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-600 transition-colors"
                    >
                      Apply
                    </button>
                  </form>
                )}
                {couponError && <p className="text-red-500 text-[10px] font-bold mt-1 uppercase tracking-widest">{couponError}</p>}
                {!appliedCoupon && (
                  <p className="text-[9px] text-slate-400 mt-2 font-medium">Try "SAVE10" or "WELCOME20"</p>
                )}
              </div>

              <div className="space-y-3 pt-6 border-t border-slate-100">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600 font-medium">Subtotal</span>
                  <span className="font-bold text-slate-900">£{subtotal.toFixed(2)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-sm text-emerald-600">
                    <span className="font-medium">Discount</span>
                    <span className="font-bold">-£{discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600 font-medium">Shipping</span>
                  <span className="font-bold text-slate-900">£{shippingCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600 font-medium">Estimated Tax (20%)</span>
                  <span className="font-bold text-slate-900">£{tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between pt-3 border-t border-slate-100">
                  <span className="text-lg font-black text-slate-900">Total</span>
                  <span className="text-2xl font-black text-blue-600">£{total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 rounded-3xl p-6 text-white">
              <div className="flex items-center gap-3 mb-4">
                <Truck className="h-5 w-5 text-blue-400" />
                <p className="text-sm font-black uppercase tracking-widest">Fast Delivery</p>
              </div>
              <p className="text-xs text-slate-400 font-medium leading-relaxed">
                Orders placed before 4 PM are eligible for Next-Day Delivery. All shipments are fully insured.
              </p>
            </div>
          </div>
        </div>
      </div>
      
      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
        onSuccess={() => setCheckoutMode('shipping')}
      />
    </div>
  );
}
