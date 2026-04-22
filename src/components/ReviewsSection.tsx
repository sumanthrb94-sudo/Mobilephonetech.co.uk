import React, { useState } from 'react';
import { Star, ThumbsUp, MessageCircle } from 'lucide-react';
import { Review } from '../types';
import { motion } from 'motion/react';

interface ReviewsSectionProps {
  productId: string;
  reviews?: Review[];
  onAddReview?: (review: Omit<Review, 'id' | 'date'>) => void;
}

export default function ReviewsSection({ productId, reviews = [], onAddReview }: ReviewsSectionProps) {
  const [isWritingReview, setIsWritingReview] = useState(false);
  const [formData, setFormData] = useState({
    rating: 5,
    comment: '',
    userName: '',
  });

  const averageRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : 0;

  const ratingDistribution = [5, 4, 3, 2, 1].map(rating => ({
    rating,
    count: reviews.filter(r => r.rating === rating).length,
  }));

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.comment.trim() && formData.userName.trim()) {
      onAddReview?.({
        productId,
        rating: formData.rating,
        comment: formData.comment,
        userName: formData.userName,
      });
      setFormData({ rating: 5, comment: '', userName: '' });
      setIsWritingReview(false);
    }
  };

  return (
    <div className="border-t border-slate-100 pt-12 mt-12">
      <h3 className="text-2xl font-black text-slate-900 mb-8">Customer Reviews</h3>

      {reviews.length === 0 ? (
        <div className="text-center py-12">
          <MessageCircle className="h-12 w-12 text-slate-200 mx-auto mb-4" />
          <p className="text-slate-600 font-medium mb-6">No reviews yet. Be the first to review this product!</p>
          <button
            onClick={() => setIsWritingReview(true)}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors"
          >
            Write a Review
          </button>
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-12">
          {/* Rating Summary */}
          <div className="lg:col-span-1">
            <div className="bg-slate-50 rounded-3xl p-8 sticky top-32">
              <div className="text-center mb-8">
                <div className="text-5xl font-black text-slate-900 mb-2">{averageRating}</div>
                <div className="flex items-center justify-center gap-1 mb-2">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      size={16}
                      className={i < Math.round(Number(averageRating)) ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}
                    />
                  ))}
                </div>
                <p className="text-sm text-slate-500 font-medium">Based on {reviews.length} reviews</p>
              </div>

              {/* Rating Distribution */}
              <div className="space-y-3">
                {ratingDistribution.map(({ rating, count }) => (
                  <div key={rating} className="flex items-center gap-3">
                    <span className="text-xs font-bold text-slate-600 w-8">{rating}★</span>
                    <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-400 transition-all"
                        style={{ width: `${reviews.length > 0 ? (count / reviews.length) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold text-slate-600 w-8">{count}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setIsWritingReview(true)}
                className="w-full mt-8 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors"
              >
                Write a Review
              </button>
            </div>
          </div>

          {/* Reviews List */}
          <div className="lg:col-span-2 space-y-6">
            {isWritingReview && (
              <motion.form
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                onSubmit={handleSubmitReview}
                className="bg-slate-50 rounded-3xl p-8 border-2 border-blue-600"
              >
                <h4 className="text-lg font-black text-slate-900 mb-6">Write Your Review</h4>

                <div className="mb-6">
                  <label className="block text-sm font-bold text-slate-900 mb-3">Your Name</label>
                  <input
                    type="text"
                    value={formData.userName}
                    onChange={(e) => setFormData({ ...formData, userName: e.target.value })}
                    placeholder="Enter your name"
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl font-medium outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-bold text-slate-900 mb-3">Rating</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setFormData({ ...formData, rating: star })}
                        className="transition-transform hover:scale-110"
                      >
                        <Star
                          size={24}
                          className={star <= formData.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-bold text-slate-900 mb-3">Your Review</label>
                  <textarea
                    value={formData.comment}
                    onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                    placeholder="Share your experience with this product..."
                    rows={4}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl font-medium outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors"
                  >
                    Submit Review
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsWritingReview(false)}
                    className="flex-1 px-6 py-3 bg-slate-200 text-slate-900 rounded-xl font-bold hover:bg-slate-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </motion.form>
            )}

            {reviews.map((review) => (
              <motion.div
                key={review.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="border border-slate-100 rounded-2xl p-6 hover:border-slate-200 transition-colors"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h4 className="font-bold text-slate-900">{review.userName}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            size={14}
                            className={i < review.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-slate-500 font-medium">{review.date}</span>
                    </div>
                  </div>
                  <span className="text-xs font-black bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full">
                    Verified Purchase
                  </span>
                </div>

                <p className="text-slate-600 font-medium mb-4">{review.comment}</p>

                <div className="flex items-center gap-4 pt-4 border-t border-slate-100">
                  <button className="flex items-center gap-2 text-slate-500 hover:text-blue-600 transition-colors text-sm font-medium">
                    <ThumbsUp size={16} />
                    Helpful
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
