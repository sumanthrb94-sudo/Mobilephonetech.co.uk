import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MOCK_PHONES } from '../data';
import { useCart } from '../context/CartContext';
import { ShoppingBag, Star, Zap, ArrowLeft, Plus, Minus, ShieldCheck, Truck, RefreshCcw } from 'lucide-react';
import { motion } from 'motion/react';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [addedToCart, setAddedToCart] = useState(false);

  const product = MOCK_PHONES.find((p) => p.id === id);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <h2 className="text-2xl font-bold mb-4">Product not found</h2>
        <button 
          onClick={() => navigate('/')}
          className="bg-slate-900 text-white px-6 py-2 rounded-full font-bold"
        >
          Back to Home
        </button>
      </div>
    );
  }

  const handleAddToCart = () => {
    addToCart(product, quantity);
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
  };

  return (
    <div className="bg-white min-h-screen pt-24 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors mb-8 font-bold text-sm uppercase tracking-widest"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24">
          {/* Product Image */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-slate-50 rounded-[40px] p-12 flex items-center justify-center relative overflow-hidden aspect-square"
          >
            <div className="absolute top-8 left-8">
               <span className="bg-blue-600 text-white rounded-xl px-4 py-1.5 text-xs font-black uppercase tracking-widest">
                {product.grade}
              </span>
            </div>
            <img 
              src={product.imageUrl} 
              alt={product.model} 
              className="max-h-full w-auto object-contain transition-transform duration-700 hover:scale-110"
              referrerPolicy="no-referrer"
            />
          </motion.div>

          {/* Product Info */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-col"
          >
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xs font-black text-blue-600 uppercase tracking-[0.2em]">{product.brand}</span>
                <span className="h-1 w-1 rounded-full bg-slate-300"></span>
                <span className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">{product.category}</span>
              </div>
              <h1 className="text-4xl sm:text-6xl font-black text-slate-900 tracking-tighter leading-[0.95] mb-6">
                {product.model.toUpperCase()}
              </h1>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1 text-amber-500">
                  <Star className="h-5 w-5 fill-current" />
                  <span className="font-black text-lg">4.9</span>
                </div>
                <span className="text-slate-300">|</span>
                <span className="text-slate-500 font-bold text-sm uppercase tracking-widest">128 Verified Reviews</span>
              </div>
            </div>

            <div className="mb-10">
              <div className="flex items-baseline gap-4 mb-2">
                <span className="text-5xl font-black text-slate-900 tracking-tighter">£{product.price}</span>
                {product.originalPrice > product.price && (
                  <span className="text-2xl text-slate-400 line-through font-bold tracking-tighter">£{product.originalPrice}</span>
                )}
              </div>
              <p className="text-green-600 font-bold text-sm flex items-center gap-2">
                <Zap className="h-4 w-4 fill-current" />
                In Stock & Ready to Ship
              </p>
            </div>

            <div className="space-y-6 mb-10">
               <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-4">Key Specifications</h3>
                  <div className="grid grid-cols-2 gap-y-4 gap-x-8">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Display</p>
                      <p className="text-xs font-bold text-slate-700 line-clamp-1">{product.specs.display}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Processor</p>
                      <p className="text-xs font-bold text-slate-700 line-clamp-1">{product.specs.processor}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Camera</p>
                      <p className="text-xs font-bold text-slate-700 line-clamp-1">{product.specs.camera}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Battery</p>
                      <p className="text-xs font-bold text-slate-700 line-clamp-1">{product.specs.battery}</p>
                    </div>
                  </div>
               </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 mb-10">
              <div className="flex items-center gap-4 bg-slate-100 p-2 rounded-2xl">
                <button 
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-12 h-12 flex items-center justify-center bg-white rounded-xl shadow-sm hover:bg-slate-50 transition-colors"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-8 text-center font-black text-xl">{quantity}</span>
                <button 
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-12 h-12 flex items-center justify-center bg-white rounded-xl shadow-sm hover:bg-slate-50 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <button 
                onClick={handleAddToCart}
                className={`flex-grow py-5 rounded-2xl font-black text-lg uppercase tracking-widest transition-all flex items-center justify-center gap-3 ${
                  addedToCart ? 'bg-green-600 text-white' : 'bg-slate-900 text-white hover:bg-blue-600 hover:scale-[1.02] active:scale-95'
                }`}
              >
                {addedToCart ? (
                  <>✓ Added to Cart</>
                ) : (
                  <>
                    <ShoppingBag className="h-6 w-6" />
                    Add to Cart
                  </>
                )}
              </button>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="flex flex-col items-center text-center p-4">
                <ShieldCheck className="h-6 w-6 text-blue-600 mb-2" />
                <span className="text-[10px] font-black uppercase tracking-tighter">12 Month Warranty</span>
              </div>
              <div className="flex flex-col items-center text-center p-4">
                <Truck className="h-6 w-6 text-blue-600 mb-2" />
                <span className="text-[10px] font-black uppercase tracking-tighter">Free Next Day Delivery</span>
              </div>
              <div className="flex flex-col items-center text-center p-4">
                <RefreshCcw className="h-6 w-6 text-blue-600 mb-2" />
                <span className="text-[10px] font-black uppercase tracking-tighter">30 Day Returns</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
