import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import { useCheckout, SHIPPING_OPTIONS, ShippingAddress, PaymentMethod, Order } from '../context/CheckoutContext';
import { ArrowLeft, Check, Lock, Truck, CreditCard, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

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
    createOrder,
    lastOrder,
  } = useCheckout();

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isProcessing, setIsProcessing] = useState(false);

  const shippingCost = shippingOption?.cost || 0;
  const tax = (cartTotal + shippingCost) * 0.2; // 20% VAT
  const total = cartTotal + shippingCost + tax;

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
      subtotal: cartTotal,
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
            {['Shipping', 'Payment', 'Review'].map((step, index) => (
              <div key={step} className="flex items-center flex-1">
                <motion.div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm transition-all ${
                    (index === 0 && (currentStep === 'shipping' || currentStep === 'payment' || currentStep === 'review')) ||
                    (index === 1 && (currentStep === 'payment' || currentStep === 'review')) ||
                    (index === 2 && currentStep === 'review')
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {index + 1}
                </motion.div>
                <div className={`flex-1 h-1 mx-2 rounded-full transition-all ${
                  (index === 0 && (currentStep === 'payment' || currentStep === 'review')) ||
                  (index === 1 && currentStep === 'review')
                    ? 'bg-blue-600'
                    : 'bg-slate-200'
                }`} />
              </div>
            ))}
            <div className="w-10 h-10 rounded-full flex items-center justify-center font-black text-sm bg-slate-200 text-slate-600">3</div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <AnimatePresence mode="wait">
              {currentStep === 'shipping' && (
                <motion.form
                  key="shipping"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  onSubmit={handleShippingSubmit}
                  className="bg-white rounded-3xl p-8"
                >
                  <h2 className="text-2xl font-black text-slate-900 mb-8">Shipping Address</h2>

                  <div className="grid grid-cols-2 gap-6 mb-6">
                    <div className="col-span-2">
                      <label className="block text-sm font-bold text-slate-900 mb-2">Full Name</label>
                      <input
                        type="text"
                        name="fullName"
                        defaultValue={shippingAddress?.fullName}
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl font-medium outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                      {formErrors.fullName && <p className="text-red-600 text-xs mt-1">{formErrors.fullName}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-900 mb-2">Email</label>
                      <input
                        type="email"
                        name="email"
                        defaultValue={shippingAddress?.email}
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

                    <div className="col-span-2">
                      <label className="block text-sm font-bold text-slate-900 mb-2">Country</label>
                      <input
                        type="text"
                        name="country"
                        defaultValue={shippingAddress?.country || 'United Kingdom'}
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl font-medium outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>
                  </div>

                  <div className="mb-8">
                    <h3 className="text-lg font-black text-slate-900 mb-4">Shipping Method</h3>
                    <div className="space-y-3">
                      {SHIPPING_OPTIONS.map((option) => (
                        <label key={option.id} className="flex items-start gap-4 p-4 border border-slate-200 rounded-xl cursor-pointer hover:border-blue-600 transition-colors">
                          <input
                            type="radio"
                            name="shippingOption"
                            value={option.id}
                            checked={shippingOption?.id === option.id}
                            onChange={() => setShippingOption(option)}
                            className="mt-1"
                          />
                          <div className="flex-1">
                            <p className="font-bold text-slate-900">{option.name}</p>
                            <p className="text-sm text-slate-500">{option.description}</p>
                          </div>
                          <p className="font-bold text-slate-900">£{option.cost.toFixed(2)}</p>
                        </label>
                      ))}
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full px-6 py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
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
                  <h2 className="text-2xl font-black text-slate-900 mb-8">Payment Method</h2>

                  <div className="space-y-4 mb-8">
                    <label className="flex items-center gap-4 p-4 border border-slate-200 rounded-xl cursor-pointer hover:border-blue-600 transition-colors">
                      <input type="radio" name="paymentType" value="card" defaultChecked className="w-4 h-4" />
                      <CreditCard className="h-5 w-5 text-slate-600" />
                      <span className="font-bold text-slate-900">Credit/Debit Card</span>
                    </label>

                    <label className="flex items-center gap-4 p-4 border border-slate-200 rounded-xl cursor-pointer hover:border-blue-600 transition-colors">
                      <input type="radio" name="paymentType" value="paypal" className="w-4 h-4" />
                      <span className="font-bold text-slate-900">PayPal</span>
                    </label>

                    <label className="flex items-center gap-4 p-4 border border-slate-200 rounded-xl cursor-pointer hover:border-blue-600 transition-colors">
                      <input type="radio" name="paymentType" value="apple_pay" className="w-4 h-4" />
                      <span className="font-bold text-slate-900">Apple Pay</span>
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-8">
                    <input type="hidden" name="cardLast4" value="4242" />
                    <input type="hidden" name="cardBrand" value="Visa" />
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setCurrentStep('shipping')}
                      className="flex-1 px-6 py-4 border-2 border-slate-200 text-slate-900 rounded-xl font-bold hover:border-slate-300 transition-colors flex items-center justify-center gap-2"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Back
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-6 py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                    >
                      Review Order
                      <ArrowLeft className="h-4 w-4 rotate-180" />
                    </button>
                  </div>
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
                  <h2 className="text-2xl font-black text-slate-900 mb-8">Review Your Order</h2>

                  <div className="space-y-6 mb-8">
                    <div>
                      <h3 className="font-bold text-slate-900 mb-4">Shipping Address</h3>
                      <div className="bg-slate-50 rounded-xl p-4 text-sm text-slate-600">
                        <p>{shippingAddress?.fullName}</p>
                        <p>{shippingAddress?.addressLine1}</p>
                        {shippingAddress?.addressLine2 && <p>{shippingAddress.addressLine2}</p>}
                        <p>{shippingAddress?.city}, {shippingAddress?.postalCode}</p>
                        <p>{shippingAddress?.country}</p>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-bold text-slate-900 mb-4">Shipping Method</h3>
                      <div className="bg-slate-50 rounded-xl p-4 text-sm text-slate-600">
                        <p className="font-bold text-slate-900">{shippingOption?.name}</p>
                        <p>{shippingOption?.description}</p>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-bold text-slate-900 mb-4">Payment Method</h3>
                      <div className="bg-slate-50 rounded-xl p-4 text-sm text-slate-600">
                        <p className="font-bold text-slate-900">{paymentMethod?.brand} ending in {paymentMethod?.last4}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setCurrentStep('payment')}
                      className="flex-1 px-6 py-4 border-2 border-slate-200 text-slate-900 rounded-xl font-bold hover:border-slate-300 transition-colors flex items-center justify-center gap-2"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Back
                    </button>
                    <button
                      onClick={handlePlaceOrder}
                      disabled={isProcessing}
                      className="flex-1 px-6 py-4 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isProcessing ? (
                        <>
                          <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Lock className="h-4 w-4" />
                          Place Order
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-3xl p-8 sticky top-32">
              <h3 className="font-black text-slate-900 mb-6">Order Summary</h3>

              <div className="space-y-4 mb-6 pb-6 border-b border-slate-100">
                {items.map((item) => (
                  <div key={item.id} className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-slate-900 text-sm">{item.model}</p>
                      <p className="text-xs text-slate-500">Qty: {item.quantity}</p>
                    </div>
                    <p className="font-bold text-slate-900">£{(item.price * item.quantity).toFixed(2)}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-3 mb-6 pb-6 border-b border-slate-100">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600 font-medium">Subtotal</span>
                  <span className="font-bold text-slate-900">£{cartTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600 font-medium">Shipping</span>
                  <span className="font-bold text-slate-900">£{shippingCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600 font-medium">Tax (20%)</span>
                  <span className="font-bold text-slate-900">£{tax.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className="font-black text-slate-900">Total</span>
                <span className="text-2xl font-black text-slate-900">£{total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
