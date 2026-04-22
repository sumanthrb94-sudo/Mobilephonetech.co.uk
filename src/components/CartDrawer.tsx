import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import { useCheckout } from '../context/CheckoutContext';
import { X, Minus, Plus, ShoppingBag, Trash2, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';

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
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-40"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-full max-w-md bg-white z-50 flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <ShoppingBag className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900">Shopping Cart</h2>
                  <p className="text-xs text-slate-400 font-bold">{items.reduce((acc, item) => acc + item.quantity, 0)} items</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {items.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center">
                  <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                    <ShoppingBag className="h-8 w-8 text-slate-300" />
                  </div>
                  <p className="text-slate-600 font-bold">Your cart is empty</p>
                  <p className="text-xs text-slate-400 mt-2">Add some amazing devices to get started!</p>
                </div>
              ) : (
                items.map((item) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 hover:border-blue-200 transition-colors"
                  >
                    {/* Product Image */}
                    <div className="h-24 w-24 bg-white rounded-xl flex items-center justify-center flex-shrink-0 border border-slate-100">
                      <img
                        src={item.imageUrl}
                        alt={item.model}
                        className="h-20 w-20 object-contain"
                        referrerPolicy="no-referrer"
                      />
                    </div>

                    {/* Product Details */}
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm line-clamp-1">{item.model}</h3>
                        <p className="text-xs text-slate-400 font-bold">{item.brand}</p>
                        <p className="text-sm font-black text-slate-900 mt-2">£{item.price}</p>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="h-6 w-6 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-100 transition-colors"
                        >
                          <Minus className="h-3 w-3 text-slate-600" />
                        </button>
                        <span className="w-6 text-center text-xs font-bold text-slate-900">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="h-6 w-6 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-100 transition-colors"
                        >
                          <Plus className="h-3 w-3 text-slate-600" />
                        </button>
                      </div>
                    </div>

                    {/* Remove Button */}
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="p-2 hover:bg-red-50 rounded-lg transition-colors text-slate-400 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </motion.div>
                ))
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <div className="border-t border-slate-100 p-6 space-y-4">
                {/* Totals */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600 font-medium">Subtotal</span>
                    <span className="font-bold text-slate-900">£{cartTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600 font-medium">Shipping</span>
                    <span className="font-bold text-green-600">FREE</span>
                  </div>
                  <div className="border-t border-slate-100 pt-2 flex justify-between">
                    <span className="font-black text-slate-900">Total</span>
                    <span className="font-black text-xl text-slate-900">£{cartTotal.toFixed(2)}</span>
                  </div>
                </div>

                {/* Checkout Button */}
                <button
                  onClick={handleCheckout}
                  className="w-full bg-blue-600 text-white rounded-xl py-4 font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors"
                >
                  Proceed to Checkout
                  <ArrowRight className="h-4 w-4" />
                </button>

                {/* Continue Shopping */}
                <button
                  onClick={onClose}
                  className="w-full border-2 border-slate-200 text-slate-900 rounded-xl py-3 font-bold hover:bg-slate-50 transition-colors"
                >
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
