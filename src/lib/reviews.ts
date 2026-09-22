import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, storage } from './firebase';
import { uploadViaCloudinary } from './cloudinary';
import type { Review } from '../types';

/**
 * Reviews, customer side.
 *
 * Both calls go to the server rather than to Firestore, because whether
 * someone may review a product is a question about their orders — has a line
 * item for it, reached delivered, long enough ago — and that is not a check a
 * browser can be trusted to make about itself.
 */

export const MAX_REVIEW_PHOTOS = 4;
export const MAX_REVIEW_PHOTO_BYTES = 5 * 1024 * 1024;
export const ACCEPTED_REVIEW_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];

/**
 * Uploaded straight to Storage from the browser, same as a return's evidence
 * photos — see uploadReturnPhoto. The path is keyed on the uploader's own
 * uid, which is what storage.rules checks before allowing the write, so a
 * signed-in customer can only ever add photos to their own folder.
 */
export async function uploadReviewPhoto(userId: string, file: File): Promise<string> {
  if (!ACCEPTED_REVIEW_PHOTO_TYPES.includes(file.type)) {
    throw new Error('Photos must be JPEG, PNG, WebP or AVIF.');
  }
  if (file.size > MAX_REVIEW_PHOTO_BYTES) {
    throw new Error('Each photo must be under 5MB.');
  }

  // Cloudinary when configured, Firebase Storage otherwise. The signing
  // route puts the file in a folder named after the caller's own uid, the
  // same scoping storage.rules enforces below.
  const hosted = await uploadViaCloudinary('review', file);
  if (hosted) return hosted;

  const ext = file.name.includes('.') ? file.name.split('.').pop()!.toLowerCase() : 'jpg';
  const path = `review-photos/${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const objectRef = ref(storage, path);
  await uploadBytes(objectRef, file, { contentType: file.type });
  return getDownloadURL(objectRef);
}

export type EligibilityCode =
  | 'eligible'
  | 'not-signed-in'
  | 'no-order'
  | 'not-delivered'
  | 'too-soon'
  | 'already-reviewed';

export interface ReviewEligibility {
  eligible: boolean;
  code: EligibilityCode;
  reason: string;
  availableFrom?: string;
  orderId?: string;
  waitDays: number;
}

async function authHeader(): Promise<Record<string, string>> {
  const token = await auth.currentUser?.getIdToken().catch(() => null);
  return token ? { authorization: `Bearer ${token}` } : {};
}

/**
 * Asked before the form is shown. A review box offered to someone who will be
 * refused on submit wastes what they wrote, and a box shown to everybody
 * implies anybody may review.
 */
export async function reviewEligibility(productId: string): Promise<ReviewEligibility> {
  const res = await fetch(
    `/api/review-eligibility?productId=${encodeURIComponent(productId)}`,
    { headers: await authHeader() },
  );

  if (!res.ok) {
    // Never guess "yes" when the check itself failed: that offers a form the
    // POST will refuse. Failing closed costs a review, failing open costs the
    // person their writing.
    return {
      eligible: false,
      code: 'no-order',
      reason: 'We could not check your orders just now. Please try again shortly.',
      waitDays: 0,
    };
  }
  return res.json() as Promise<ReviewEligibility>;
}

export interface NewReview {
  productId: string;
  rating: number;
  comment?: string;
  title?: string;
  userName: string;
  images?: string[];
}

export async function submitReview(review: NewReview): Promise<void> {
  const res = await fetch('/api/reviews', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(await authHeader()) },
    body: JSON.stringify(review),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'We could not save your review. Please try again.');
  }
}

interface ApiReview {
  id: string;
  rating: number;
  title: string | null;
  comment: string | null;
  user_name: string | null;
  is_verified: boolean;
  created_at: string | null;
  images?: string[];
}

/**
 * The product page's actual source of reviews. `submitReview` writes here
 * (the `reviews` collection, via the same endpoint's POST) — a product
 * document has no reviews of its own to read, so a page that never calls
 * this shows every submitted review exactly once, to the person who wrote
 * it, until they refresh.
 */
export async function listReviews(productId: string): Promise<Review[]> {
  const res = await fetch(`/api/reviews?productId=${encodeURIComponent(productId)}&limit=50`);
  if (!res.ok) return [];
  const data = await res.json().catch(() => null) as { reviews?: ApiReview[] } | null;
  return (data?.reviews ?? []).map(r => ({
    id: r.id,
    productId,
    rating: r.rating,
    comment: r.comment ?? '',
    userName: r.user_name ?? 'Customer',
    date: r.created_at ?? new Date().toISOString(),
    images: r.images ?? [],
  }));
}
