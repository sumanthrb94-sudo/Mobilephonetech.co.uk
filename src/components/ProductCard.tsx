import { Phone, Review } from '../types';
import { ShoppingBag, Star, Zap, MessageSquare, Send, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import React, { useState, useEffect } from 'react';

interface ProductCardProps {
  phone: Phone;
  key?: string;
}

export default function ProductCard({ phone }: ProductCardProps) {
  const [showReviews, setShowReviews] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [newReview, setNewReview] = useState({ rating: 5, comment: '', userName: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="product-card flex flex-col"
    >
      <div className="bg-slate-50 rounded-2xl h-48 mb-6 flex items-center justify-center relative overflow-hidden group">
        <div className="absolute top-3 left-3 z-10 flex flex-col gap-2">
          <span className={`rounded-xl px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${getGradeColor(phone.grade)}`}>
            {phone.grade}
          </span>
        </div>
        <img
          src={phone.imageUrl}
          alt={phone.model}
          className="h-4/5 w-4/5 object-contain transition-transform duration-500 group-hover:scale-110"
          referrerPolicy="no-referrer"
        />
      </div>

      <div className="flex flex-col flex-1">
        <div className="flex justify-between items-start mb-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
            {phone.brand} {phone.storage ? `• ${phone.storage}` : `• ${phone.category}`}
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
          <Zap className="h-3 w-3 fill-current" /> {phone.specs.aiPerformance && phone.specs.aiPerformance.includes('TOPS') ? phone.specs.aiPerformance : 'High Performance'}
        </p>
        <p className="text-[10px] font-medium text-slate-400 mb-4 line-clamp-1">
          {phone.specs.processor ? phone.specs.processor.split('(')[0] : phone.brand} • {phone.category}
        </p>
        
        <div className="flex justify-between items-end mt-auto pt-4 border-t border-slate-100">
          <div className="flex flex-col">
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-black text-slate-900">£{phone.price}</span>
              <span className="text-slate-400 line-through text-xs font-semibold tracking-tight">£{phone.originalPrice}</span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] font-bold text-green-600 uppercase tracking-widest">
                Save {saving}%
              </span>
              <span className="h-1 w-1 bg-slate-200 rounded-full"></span>
              <button 
                onClick={() => setShowReviews(!showReviews)}
                className="flex items-center gap-1 text-[10px] font-bold text-blue-600 uppercase tracking-widest hover:underline"
              >
                <MessageSquare className="h-3 w-3" />
                {showReviews ? 'Hide Reviews' : 'Reviews'}
              </button>
            </div>
          </div>
          <button className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all active:scale-95">
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
  );
}
