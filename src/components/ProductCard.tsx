import { Phone, Review } from '../types';
import { ShoppingBag, Star, Zap, MessageSquare, Send, X, Plus, Minus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import React, { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';

interface ProductCardProps {
  phone: Phone;
  key?: string;
}

export default function ProductCard({ phone }: ProductCardProps) {
  const { addToCart } = useCart();
  const [showReviews, setShowReviews] = useState(false);
  const [showQuickView, setShowQuickView] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [newReview, setNewReview] = useState({ rating: 5, comment: '', userName: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);

  // Load reviews from localStorage
  useEffect(() => {
    const savedReviews = localStorage.getItem(`reviews_${phone.id}`);
    if (savedReviews) {
      setReviews(JSON.parse(savedReviews));
    }
  }, [phone.id]);

  const saveReviews = (updatedReviews: Review[]) => {
    localStorage.setItem(`reviews_${phone.id}`, JSON.stringify(updatedReviews));
    setReviews(updatedReviews);
  };

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReview.comment || !newReview.userName) return;

    setIsSubmitting(true);
    
    const review: Review = {
      id: Math.random().toString(36).substr(2, 9),
      productId: phone.id,
      rating: newReview.rating,
      comment: newReview.comment,
      userName: newReview.userName,
      date: new Date().toLocaleDateString()
    };

    const updatedReviews = [review, ...reviews];
    saveReviews(updatedReviews);
    setNewReview({ rating: 5, comment: '', userName: '' });
    setIsSubmitting(false);
  };

  const handleAddToCart = () => {
    addToCart(phone, quantity);
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
    setQuantity(1);
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'Pristine': return 'bg-blue-600 text-white';
      case 'Excellent': return 'bg-blue-100 text-blue-700';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  const saving = Math.round(((phone.originalPrice - phone.price) / phone.originalPrice) * 100);
  const averageRating = reviews.length > 0 
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : 'N/A';

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="product-card flex flex-col h-full"
      >
        <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl h-48 mb-6 flex items-center justify-center relative overflow-hidden group">
          <div className="absolute top-3 left-3 z-10 flex flex-col gap-2">
            <span className={`rounded-xl px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${getGradeColor(phone.grade)}`}>
              {phone.grade}
            </span>
            {saving > 0 && (
              <span className="rounded-xl px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-green-100 text-green-700">
                Save {saving}%
              </span>
            )}
          </div>
          <img
            src={phone.imageUrl}
            alt={phone.model}
            className="h-4/5 w-4/5 object-contain transition-transform duration-500 group-hover:scale-110"
            referrerPolicy="no-referrer"
          />
          <button
            onClick={() => setShowQuickView(true)}
            className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100"
          >
            <span className="bg-white text-slate-900 px-4 py-2 rounded-full font-bold text-sm">Quick View</span>
          </button>
        </div>

        <div className="flex flex-col flex-1">
          <div className="flex justify-between items-start mb-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
              {phone.brand} • {phone.category}
            </span>
            <div className="flex items-center gap-1 text-[10px] font-black text-amber-500">
              <Star className="h-3 w-3 fill-current" />
              {averageRating} ({reviews.length})
            </div>
          </div>
          <h3 className="font-bold text-lg text-slate-900 leading-[1.2] mb-1">
            {phone.model}
          </h3>
          <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-1 flex items-center gap-1">
            <Zap className="h-3 w-3 fill-current" /> High Performance
          </p>
          <p className="text-[10px] font-medium text-slate-400 mb-4 line-clamp-1">
            {phone.specs.processor ? phone.specs.processor.split('(')[0] : phone.brand}
          </p>
          
          <div className="flex justify-between items-end mt-auto pt-4 border-t border-slate-100">
            <div className="flex flex-col">
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-black text-slate-900">£{phone.price}</span>
                {phone.originalPrice > phone.price && (
                  <span className="text-slate-400 line-through text-xs font-semibold tracking-tight">£{phone.originalPrice}</span>
                )}
              </div>
              <button 
                onClick={() => setShowReviews(!showReviews)}
                className="flex items-center gap-1 text-[10px] font-bold text-blue-600 uppercase tracking-widest hover:underline mt-2"
              >
                <MessageSquare className="h-3 w-3" />
                {showReviews ? 'Hide Reviews' : 'Reviews'}
              </button>
            </div>
            <button 
              onClick={() => setShowQuickView(true)}
              className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all active:scale-95"
            >
              <ShoppingBag className="h-4 w-4" />
            </button>
          </div>

          <AnimatePresence>
            {showReviews && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden mt-4 pt-4 border-t border-slate-100"
              >
                <div className="space-y-4">
                  <form onSubmit={handleReviewSubmit} className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-900">Write a Review</span>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setNewReview({ ...newReview, rating: star })}
                            className={`transition-colors ${newReview.rating >= star ? 'text-amber-500' : 'text-slate-300'}`}
                          >
                            <Star className={`h-4 w-4 ${newReview.rating >= star ? 'fill-current' : ''}`} />
                          </button>
                        ))}
                      </div>
                    </div>
                    <input 
                      type="text" 
                      placeholder="Your Name"
                      value={newReview.userName}
                      onChange={(e) => setNewReview({ ...newReview, userName: e.target.value })}
                      className="w-full text-xs font-bold p-2 bg-white rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500/20"
                      required
                    />
                    <textarea 
                      placeholder="Share your thoughts..."
                      value={newReview.comment}
                      onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
                      className="w-full text-xs font-medium p-3 bg-white rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500/20 min-h-[80px]"
                      required
                    />
                    <button 
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full btn-primary py-2 text-[10px] flex items-center justify-center gap-2"
                    >
                      <Send className="h-3 w-3" />
                      Submit Review
                    </button>
                  </form>

                  <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                    {reviews.length === 0 ? (
                      <p className="text-[10px] text-slate-400 text-center py-4 font-bold uppercase tracking-widest">No reviews yet. Be the first!</p>
                    ) : (
                      reviews.map((review) => (
                        <div key={review.id} className="border-b border-slate-50 pb-4 last:border-0">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-[10px] font-black text-slate-900 uppercase tracking-tight">{review.userName}</span>
                            <div className="flex gap-0.5">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star 
                                  key={star} 
                                  className={`h-2.5 w-2.5 ${review.rating >= star ? 'text-amber-500 fill-current' : 'text-slate-200'}`} 
                                />
                              ))}
                            </div>
                          </div>
                          <p className="text-xs text-slate-600 font-medium leading-relaxed italic">"{review.comment}"</p>
                          <span className="text-[9px] text-slate-400 font-bold uppercase mt-2 block tracking-widest">{review.date}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Quick View Modal */}
      <AnimatePresence>
        {showQuickView && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowQuickView(false)}
              className="fixed inset-0 bg-black/50 z-40"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white border-b border-slate-100 p-6 flex justify-between items-center">
                  <h2 className="text-2xl font-black text-slate-900">{phone.model}</h2>
                  <button
                    onClick={() => setShowQuickView(false)}
                    className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="p-6 space-y-6">
                  {/* Image */}
                  <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl h-64 flex items-center justify-center">
                    <img
                      src={phone.imageUrl}
                      alt={phone.model}
                      className="h-4/5 w-4/5 object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </div>

                  {/* Specs Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 p-4 rounded-xl">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Display</p>
                      <p className="text-sm font-bold text-slate-900">{phone.specs.display}</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Processor</p>
                      <p className="text-sm font-bold text-slate-900">{phone.specs.processor}</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Camera</p>
                      <p className="text-sm font-bold text-slate-900">{phone.specs.camera}</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Battery</p>
                      <p className="text-sm font-bold text-slate-900">{phone.specs.battery}</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">RAM</p>
                      <p className="text-sm font-bold text-slate-900">{phone.specs.ram}</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">OS</p>
                      <p className="text-sm font-bold text-slate-900">{phone.specs.os}</p>
                    </div>
                  </div>

                  {/* Pricing & Add to Cart */}
                  <div className="border-t border-slate-100 pt-6 space-y-4">
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-black text-slate-900">£{phone.price}</span>
                      {phone.originalPrice > phone.price && (
                        <span className="text-slate-400 line-through text-lg">£{phone.originalPrice}</span>
                      )}
                    </div>

                    {/* Quantity Selector */}
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-bold text-slate-600">Quantity:</span>
                      <div className="flex items-center gap-3 bg-slate-100 p-2 rounded-xl">
                        <button
                          onClick={() => setQuantity(Math.max(1, quantity - 1))}
                          className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
                        >
                          <Minus className="h-4 w-4 text-slate-600" />
                        </button>
                        <span className="w-8 text-center font-bold text-slate-900">{quantity}</span>
                        <button
                          onClick={() => setQuantity(quantity + 1)}
                          className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
                        >
                          <Plus className="h-4 w-4 text-slate-600" />
                        </button>
                      </div>
                    </div>

                    {/* Add to Cart Button */}
                    <motion.button
                      onClick={handleAddToCart}
                      className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all ${
                        addedToCart
                          ? 'bg-green-600 text-white'
                          : 'bg-slate-900 text-white hover:bg-blue-600'
                      }`}
                      whileTap={{ scale: 0.95 }}
                    >
                      {addedToCart ? (
                        <>
                          ✓ Added to Cart
                        </>
                      ) : (
                        <>
                          <ShoppingBag className="h-5 w-5" />
                          Add to Cart
                        </>
                      )}
                    </motion.button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
