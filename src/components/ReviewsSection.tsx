import React, { useEffect, useRef, useState } from 'react';
import { Star, ThumbsUp, MessageCircle, ShieldCheck, Lock, Loader2, Camera, X } from 'lucide-react';
import { Review } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { sanitizeUserInput } from '../utils/sanitize';
import { useUI } from '../context/UIContext';
import { useAuth } from '../context/AuthContext';
import {
  reviewEligibility, uploadReviewPhoto, MAX_REVIEW_PHOTOS, ACCEPTED_REVIEW_PHOTO_TYPES,
  type ReviewEligibility,
} from '../lib/reviews';

interface ReviewsSectionProps {
  productId: string;
  reviews?: Review[];
  /** May reject: the server decides who is allowed to review. */
  onAddReview?: (review: Omit<Review, 'id' | 'date'>) => void | Promise<void>;
}

export default function ReviewsSection({ productId, reviews = [], onAddReview }: ReviewsSectionProps) {
  const { showToast } = useUI();
  const { user } = useAuth();
  const [isWritingReview, setIsWritingReview] = useState(false);
  const [formData, setFormData] = useState({
    rating: 5,
    comment: '',
    userName: '',
  });
  const [photos, setPhotos] = useState<{ file: File; preview: string }[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const photoInput = useRef<HTMLInputElement>(null);

  // Object URLs are a leak if the component unmounts mid-flow — same reason
  // ReturnFlowModal revokes them.
  useEffect(() => () => { photos.forEach(p => URL.revokeObjectURL(p.preview)); }, [photos]);

  const addPhotos = (files: FileList | null) => {
    if (!files) return;
    const room = MAX_REVIEW_PHOTOS - photos.length;
    const accepted = Array.from(files)
      .filter(f => ACCEPTED_REVIEW_PHOTO_TYPES.includes(f.type))
      .slice(0, room);
    if (accepted.length < files.length) {
      showToast('Photos must be JPEG, PNG, WebP or AVIF.', 'warning');
    }
    setPhotos(prev => [...prev, ...accepted.map(file => ({ file, preview: URL.createObjectURL(file) }))]);
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  /**
   * Whether this visitor may review, answered by the server before the form
   * is offered. `null` while asking.
   *
   * Reviews here come from people who bought the device and took delivery of
   * it, so most visitors cannot write one — and the honest thing is to say so
   * up front rather than to show a box and reject what they typed.
   */
  const [eligibility, setEligibility] = useState<ReviewEligibility | null>(null);

  useEffect(() => {
    let cancelled = false;
    setEligibility(null);
    reviewEligibility(productId)
      .then(r => { if (!cancelled) setEligibility(r); })
      .catch(() => {
        if (!cancelled) {
          setEligibility({
            eligible: false, code: 'no-order', waitDays: 0,
            reason: 'We could not check your orders just now. Please try again shortly.',
          });
        }
      });
    return () => { cancelled = true; };
  }, [productId]);

  const averageRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : 0;

  const ratingDistribution = [5, 4, 3, 2, 1].map(rating => ({
    rating,
    count: reviews.filter(r => r.rating === rating).length,
  }));

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    const sanitizedName = sanitizeUserInput(formData.userName);
    const sanitizedComment = sanitizeUserInput(formData.comment);

    if (sanitizedComment.trim() && sanitizedName.trim()) {
      let images: string[] = [];
      try {
        if (photos.length) {
          if (!user || user.isGuest) throw new Error('Please sign in to attach photos.');
          setUploadingPhotos(true);
          images = await Promise.all(photos.map(p => uploadReviewPhoto(user.id, p.file)));
        }
        // Awaited, unlike before: the server decides whether this person may
        // review, so "thank you" must wait until it has said yes.
        await onAddReview?.({
          productId,
          rating: formData.rating,
          comment: sanitizedComment,
          userName: sanitizedName,
          images,
        });
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'We could not save your review.', 'error');
        return;
      } finally {
        setUploadingPhotos(false);
      }
      setFormData({ rating: 5, comment: '', userName: '' });
      photos.forEach(p => URL.revokeObjectURL(p.preview));
      setPhotos([]);
      setIsWritingReview(false);
      showToast('Thank you for your review!', 'success');
    } else {
      showToast('Please fill in all fields', 'warning');
    }
  };

  /**
   * The write control, or the reason there isn't one.
   *
   * Defined once and used by both branches below. It was gated in the
   * ratings sidebar first and not in the empty state, so a product with no
   * reviews yet still offered a form to anybody — which is the branch new
   * products are always in.
   */
  const writeGate = (
    <>
      {eligibility === null && (
        <p className="rv-gate" role="status">
          <Loader2 size={15} className="admin-spin" /> Checking your orders…
        </p>
      )}

      {eligibility?.eligible && (
        <>
          <button onClick={() => setIsWritingReview(true)} className="btn btn-primary btn-md">
            Write a Review
          </button>
          <p className="rv-gate rv-gate--ok">
            <ShieldCheck size={15} /> {eligibility.reason}
          </p>
        </>
      )}

      {eligibility && !eligibility.eligible && (
        <p className="rv-gate">
          <Lock size={15} />
          <span>
            {eligibility.reason}
            {eligibility.availableFrom && (
              <> You can write one from{' '}
                <strong>
                  {new Date(eligibility.availableFrom).toLocaleDateString('en-GB', {
                    day: 'numeric', month: 'long', year: 'numeric',
                  })}
                </strong>.
              </>
            )}
          </span>
        </p>
      )}
    </>
  );

  /**
   * The form itself, shared by both branches below for the same reason
   * `writeGate` is: it used to live only in the has-reviews branch, so
   * pressing "Write a Review" on any product that had none yet — which is
   * every product before its first one — flipped `isWritingReview` to true
   * and nothing on screen ever showed it. Nobody could leave the first
   * review for anything.
   */
  const writeForm = isWritingReview && (
    <motion.form
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      onSubmit={handleSubmitReview}
      className="bg-slate-50 rounded-3xl p-8 border-2 border-[var(--brand-cyan)] text-left"
    >
      <h4 className="text-lg font-black text-slate-900 mb-6">Write Your Review</h4>

      <div className="mb-6">
        <label className="block text-sm font-bold text-slate-900 mb-3">Your Name</label>
        <input
          type="text"
          value={formData.userName}
          onChange={(e) => setFormData({ ...formData, userName: e.target.value })}
          placeholder="Enter your name"
          className="w-full px-4 py-3 border border-slate-200 rounded-xl font-medium outline-none focus:ring-2 focus:ring-[rgba(0,108,73,0.25)]"
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
          className="w-full px-4 py-3 border border-slate-200 rounded-xl font-medium outline-none focus:ring-2 focus:ring-[rgba(0,108,73,0.25)] resize-none"
        />
      </div>

      <div className="mb-6">
        <label className="block text-sm font-bold text-slate-900 mb-3">
          Photos <span className="font-medium text-slate-400">(optional)</span>
        </label>
        <div className="flex gap-2 flex-wrap">
          {photos.map((p, i) => (
            <div key={p.preview} className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-200 flex-shrink-0">
              <img src={p.preview} alt={`Review photo ${i + 1}`} className="w-full h-full object-cover" />
              <button
                type="button" onClick={() => removePhoto(i)}
                aria-label={`Remove photo ${i + 1}`}
                className="absolute top-1 right-1 w-6 h-6 grid place-items-center rounded-full bg-black/65 text-white"
              >
                <X size={12} />
              </button>
            </div>
          ))}
          {photos.length < MAX_REVIEW_PHOTOS && (
            <button
              type="button" onClick={() => photoInput.current?.click()}
              className="w-16 h-16 grid place-items-center gap-1 rounded-xl border-[1.5px] border-dashed border-slate-300 text-slate-500"
            >
              <Camera size={18} />
              <span className="text-[11px] font-semibold">Add</span>
            </button>
          )}
        </div>
        <input
          ref={photoInput} type="file" accept="image/*" multiple
          onChange={e => { addPhotos(e.target.files); e.target.value = ''; }}
          style={{ display: 'none' }} aria-label="Upload review photos"
        />
        <p className="text-xs text-slate-400 mt-2">Up to {MAX_REVIEW_PHOTOS} photos, 5MB each.</p>
      </div>

      <div className="flex gap-3">
        <button
          type="submit" disabled={uploadingPhotos}
          className="btn btn-primary btn-md" style={{ flex: 1 }}
        >
          {uploadingPhotos ? <><Loader2 size={15} className="admin-spin" /> Uploading photos…</> : 'Submit Review'}
        </button>
        <button
          type="button" disabled={uploadingPhotos}
          onClick={() => {
            photos.forEach(p => URL.revokeObjectURL(p.preview));
            setPhotos([]);
            setIsWritingReview(false);
          }}
          className="btn btn-secondary btn-md" style={{ flex: 1 }}
        >
          Cancel
        </button>
      </div>
    </motion.form>
  );

  // No heading or top rule of its own: the product page wraps this in a
  // titled section, and rendering "Customer Reviews" under "Reviews" said the
  // same thing twice with a divider between them.
  return (
    <div>

      {reviews.length === 0 ? (
        <div className="text-center py-12">
          <MessageCircle className="h-12 w-12 text-slate-200 mx-auto mb-4" />
          <p className="text-slate-600 font-medium mb-6">No reviews yet.</p>
          <div className="rv-gatewrap">{writeGate}</div>
          {writeForm && <div className="mt-8 max-w-xl mx-auto">{writeForm}</div>}
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

              <div className="rv-gatewrap mt-8">{writeGate}</div>
            </div>
          </div>

          {/* Reviews List */}
          <div className="lg:col-span-2 space-y-6">
            {writeForm}

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
                  <span
                    style={{
                      fontFamily: 'var(--font-sans)',
                      fontSize: '11px',
                      fontWeight: 700,
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                      background: 'var(--green-5)',
                      color: 'var(--color-trust-text)',
                      padding: '4px 10px',
                      borderRadius: 'var(--radius-full)',
                      border: '1px solid var(--green-20)',
                    }}
                  >
                    Verified purchase
                  </span>
                </div>

                <p className="text-slate-600 font-medium mb-4">{review.comment}</p>

                {review.images && review.images.length > 0 && (
                  <div className="flex gap-2 flex-wrap mb-4">
                    {review.images.map((src, i) => (
                      <button
                        key={src} type="button"
                        onClick={() => setLightboxSrc(src)}
                        aria-label={`Open photo ${i + 1} from this review`}
                        className="w-16 h-16 rounded-xl overflow-hidden border border-slate-200 flex-shrink-0"
                      >
                        <img src={src} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-4 pt-4 border-t border-slate-100">
                  <button className="flex items-center gap-2 text-slate-500 hover:text-[var(--brand-cyan-hover)] transition-colors text-sm font-medium">
                    <ThumbsUp size={16} />
                    Helpful
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      <AnimatePresence>
        {lightboxSrc && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setLightboxSrc(null)}
            role="dialog"
            aria-modal="true"
            aria-label="Review photo — full-screen view"
            style={{
              position: 'fixed', inset: 0, zIndex: 200,
              background: 'rgba(0,0,0,0.96)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '24px',
            }}
          >
            <motion.img
              key={lightboxSrc}
              src={lightboxSrc}
              alt="Review photo, full size"
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '90vmin', height: '90vmin', maxWidth: '100%', maxHeight: '100%',
                objectFit: 'contain',
              }}
            />
            <button
              type="button"
              onClick={() => setLightboxSrc(null)}
              aria-label="Close full-screen view"
              style={{
                position: 'absolute', top: '20px', right: '20px',
                width: '40px', height: '40px', borderRadius: '50%',
                background: 'rgba(255,255,255,0.14)', border: 'none',
                color: '#fff', display: 'grid', placeItems: 'center', cursor: 'pointer',
              }}
            >
              <X size={20} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
