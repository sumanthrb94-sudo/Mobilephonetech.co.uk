import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Battery, ShieldCheck, Eye, Heart } from 'lucide-react';
import { Product } from '../types';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { motion, AnimatePresence } from 'motion/react';

interface ProductCardProps {
  phone: Product;
}

export default function ProductCard({ phone }: ProductCardProps) {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { isInWishlist, addToWishlist, removeFromWishlist } = useWishlist();
  const [isQuickViewOpen, setIsQuickViewOpen] = React.useState(false);
  const inWishlist = isInWishlist(phone.id);

  const handleWishlistToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (inWishlist) {
      removeFromWishlist(phone.id);
    } else {
      addToWishlist(phone);
    }
  };

  const savings = phone.originalPrice - phone.price;
  const savingsPercentage = Math.round((savings / phone.originalPrice) * 100);

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'Pristine': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'Excellent': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Good': return 'bg-amber-100 text-amber-700 border-amber-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <>
      <motion.div 
        whileHover={{ y: -8 }}
        className="group bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300"
      >
        <div className="relative aspect-[4/5] bg-slate-50 p-6 overflow-hidden" onClick={() => navigate(`/product/${phone.id}`)}>
          <img
            src={phone.imageUrl}
            alt={phone.model}
            className="w-full h-full object-contain mix-blend-multiply group-hover:scale-110 transition-transform duration-500"
          />
          
          {/* Badges */}
          <div className="absolute top-4 left-4 flex flex-col gap-2">
            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${getGradeColor(phone.grade)}`}>
              {phone.grade}
            </span>
            <span className="bg-slate-900 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
              Save {savingsPercentage}%
            </span>
          </div>

          {/* Wishlist Button */}
          <button
            onClick={handleWishlistToggle}
            className="absolute top-4 right-4 p-2 bg-white rounded-full hover:bg-slate-100 transition-colors shadow-sm"
          >
            <Heart
              size={20}
              className={inWishlist ? 'fill-red-500 text-red-500' : 'text-slate-400'}
            />
          </button>

          {/* Quick View Overlay */}
          <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setIsQuickViewOpen(true);
              }}
              className="p-3 bg-white rounded-full text-slate-900 hover:bg-blue-600 hover:text-white transition-colors shadow-lg"
            >
              <Eye size={20} />
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                addToCart(phone, 1);
              }}
              className="p-3 bg-white rounded-full text-slate-900 hover:bg-blue-600 hover:text-white transition-colors shadow-lg"
            >
              <ShoppingCart size={20} />
            </button>
            <button 
              onClick={handleWishlistToggle}
              className="p-3 bg-white rounded-full text-slate-900 hover:bg-red-600 hover:text-white transition-colors shadow-lg"
            >
              <Heart size={20} className={inWishlist ? 'fill-current' : ''} />
            </button>
          </div>
        </div>

        <div className="p-6" onClick={() => navigate(`/product/${phone.id}`)}>
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-1">{phone.brand}</p>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">{phone.model}</h3>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400 line-through font-bold">£{phone.originalPrice}</p>
              <p className="text-xl font-black text-slate-900">£{phone.price}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-slate-50">
            <div className="flex items-center gap-2 text-slate-500">
              <Battery size={14} className="text-emerald-500" />
              <span className="text-xs font-bold">{phone.batteryHealth}% Health</span>
            </div>
            <div className="flex items-center gap-2 text-slate-500">
              <ShieldCheck size={14} className="text-blue-500" />
              <span className="text-xs font-bold">12m Warranty</span>
            </div>
          </div>
          
          <button 
            className="w-full mt-6 py-3 bg-slate-50 text-slate-900 rounded-xl font-bold text-sm group-hover:bg-blue-600 group-hover:text-white transition-colors"
          >
            View Details
          </button>
        </div>
      </motion.div>

      {/* Quick View Modal */}
      <AnimatePresence>
        {isQuickViewOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsQuickViewOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-4xl bg-white rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col md:grid md:grid-cols-2"
            >
              <div className="bg-slate-50 p-8 flex items-center justify-center">
                <img src={phone.imageUrl} alt={phone.model} className="max-h-[400px] object-contain mix-blend-multiply" />
              </div>
              <div className="p-8 lg:p-12">
                <button 
                  onClick={() => setIsQuickViewOpen(false)}
                  className="absolute top-6 right-6 text-slate-400 hover:text-slate-900 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
                
                <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border mb-4 ${getGradeColor(phone.grade)}`}>
                  {phone.grade} Condition
                </span>
                <h2 className="text-3xl font-black text-slate-900 mb-2">{phone.model}</h2>
                <p className="text-slate-500 font-medium mb-6">{phone.conditionDescription}</p>
                
                <div className="flex items-baseline gap-4 mb-8">
                  <span className="text-4xl font-black text-slate-900">£{phone.price}</span>
                  <span className="text-xl text-slate-400 line-through font-bold">£{phone.originalPrice}</span>
                  <span className="text-emerald-600 font-bold text-sm">Save £{savings}</span>
                </div>

                <div className="space-y-4 mb-8">
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl">
                    <Battery className="text-emerald-500" size={20} />
                    <div>
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Battery Health</p>
                      <p className="text-sm font-bold text-slate-900">{phone.batteryHealth}% Guaranteed</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl">
                    <ShieldCheck className="text-blue-500" size={20} />
                    <div>
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Warranty</p>
                      <p className="text-sm font-bold text-slate-900">12 Months Included</p>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => {
                    addToCart(phone, 1);
                    setIsQuickViewOpen(false);
                  }}
                  className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
                >
                  Add to Cart
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
