import { auth } from './firebase';

/**
 * Reviews, customer side.
 *
 * Both calls go to the server rather than to Firestore, because whether
 * someone may review a product is a question about their orders — has a line
 * item for it, reached delivered, long enough ago — and that is not a check a
 * browser can be trusted to make about itself.
 */

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
