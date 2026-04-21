import { Phone, Review } from '../types';
import { ShoppingBag, Star, Zap, MessageSquare, Send, X, Plus, Minus, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import React, { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { Link, useNavigate } from 'react-router-dom';

interface ProductCardProps {
  phone: Phone;
}

export default function ProductCard({ phone }: ProductCardProps) {
  const { addToCart } = useCart();
  const navigate = useNavigate();
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

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    addToCart(phone, quantity);
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
    setQuantity(1);
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'Pristine': return 'bg-blue-600 text-white';
      case 'Excellent': return 'bg-blue-100 text-blue-700';
      case 'New': return 'bg-green-600 text-white';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  const saving = Math.round(((phone.originalPrice - phone.price) / phone.originalPrice) * 100);
  const averageRating = reviews.length > 0 
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : '4.9';

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        onClick={() => navigate(`/product/${phone.id}`)}
        className="product-card flex flex-col h-full group cursor-pointer"
      >
        <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl h-48 mb-6 flex items-center justify-center relative overflow-hidden">
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
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowQuickView(true);
              }}
              className="bg-white text-slate-900 px-4 py-2 rounded-full font-bold text-xs shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-all"
            >
              Quick View
            </button>
          </div>
        </div>

        <div className="flex flex-col flex-1">
          <div className="flex justify-between items-start mb-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
              {phone.brand} • {phone.category}
            </span>
            <div className="flex items-center gap-1 text-[10px] font-black text-amber-500">
              <Star className="h-3 w-3 fill-current" />
              {averageRating} ({reviews.length || 128})
            </div>
          </div>
          <h3 className="font-bold text-lg text-slate-900 leading-[1.2] mb-1 group-hover:text-blue-600 transition-colors">
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
                onClick={(e) => {
                  e.stopPropagation();
                  setShowReviews(!showReviews);
                }}
                className="flex items-center gap-1 text-[10px] font-bold text-blue-600 uppercase tracking-widest hover:underline mt-2"
              >
                <MessageSquare className="h-3 w-3" />
                {showReviews ? 'Hide Reviews' : 'Reviews'}
              </button>
            </div>
            <button 
              onClick={handleAddToCart}
              className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all active:scale-95 ${
                addedToCart ? 'bg-green-600 border-green-600 text-white' : 'border-slate-200 text-slate-400 hover:bg-slate-900 hover:text-white hover:border-slate-900'
              }`}
            >
              {addedToCart ? <Plus className="h-4 w-4 rotate-45" /> : <ShoppingBag className="h-4 w-4" />}
            </button>
          </div>

          <AnimatePresence>
            {showReviews && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden mt-4 pt-4 border-t border-slate-100"
                onClick={(e) => e.stopPropagation()}
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
                      className="w-full bg-slate-900 text-white py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2"
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
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none"
            >
              <div className="bg-white rounded-[40px] max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl pointer-events-auto">
                <div className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-slate-100 p-8 flex justify-between items-center z-10">
                  <div>
                    <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-1 block">{phone.brand}</span>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tighter">{phone.model}</h2>
                  </div>
                  <button
                    onClick={() => setShowQuickView(false)}
                    className="p-3 hover:bg-slate-100 rounded-2xl transition-colors"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <div className="p-8 lg:p-12">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    <div className="bg-slate-50 rounded-[32px] p-8 flex items-center justify-center aspect-square">
                      <img
                        src={phone.imageUrl}
                        alt={phone.model}
                        className="max-h-full w-auto object-contain"
                        referrerPolicy="no-referrer"
                      />
                    </div>

                    <div className="flex flex-col justify-center">
                      <div className="mb-8">
                        <div className="flex items-baseline gap-3 mb-2">
                          <span className="text-4xl font-black text-slate-900">£{phone.price}</span>
                          {phone.originalPrice > phone.price && (
                            <span className="text-xl text-slate-400 line-through font-bold">£{phone.originalPrice}</span>
                          )}
                        </div>
                        <p className="text-xs font-bold text-green-600 uppercase tracking-widest">In Stock • Next Day Delivery</p>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-8">
                        <div className="bg-slate-50 p-4 rounded-2xl">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Display</p>
                          <p className="text-xs font-bold text-slate-900 line-clamp-1">{phone.specs.display}</p>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-2xl">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Processor</p>
                          <p className="text-xs font-bold text-slate-900 line-clamp-1">{phone.specs.processor}</p>
                        </div>
                      </div>

                      <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-4 bg-slate-100 p-2 rounded-2xl w-fit">
                          <button
                            onClick={() => setQuantity(Math.max(1, quantity - 1))}
                            className="w-10 h-10 flex items-center justify-center bg-white rounded-xl shadow-sm"
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <span className="w-8 text-center font-black">{quantity}</span>
                          <button
                            onClick={() => setQuantity(quantity + 1)}
                            className="w-10 h-10 flex items-center justify-center bg-white rounded-xl shadow-sm"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="flex gap-3">
                          <button
                            onClick={handleAddToCart}
                            className={`flex-grow py-4 rounded-2xl font-black uppercase tracking-widest transition-all ${
                              addedToCart ? 'bg-green-600 text-white' : 'bg-slate-900 text-white hover:bg-blue-600'
                            }`}
                          >
                            {addedToCart ? '✓ Added' : 'Add to Cart'}
                          </button>
                          <button
                            onClick={() => {
                              setShowQuickView(false);
                              navigate(`/product/${phone.id}`);
                            }}
                            className="px-6 py-4 rounded-2xl border-2 border-slate-900 font-black uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-all"
                          >
                            Full Details
                          </button>
                        </div>
                      </div>
                    </div>
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
