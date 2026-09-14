/**
 * Who may review a product.
 *
 * Two conditions, both checked against the orders collection on the server:
 *
 *   1. The reviewer bought the thing. Not "has an account", not "says they
 *      did" — an order of theirs contains this product and reached delivered.
 *   2. The return window has closed on that order.
 *
 * The first is the one that matters. Before this, POST /api/reviews took no
 * authentication at all: any caller could post any rating for any product
 * under any name, five a minute. Under the DMCC Act 2024, publishing reviews
 * while taking no reasonable steps to prevent fake ones is itself a banned
 * practice, so an open endpoint was not merely untidy.
 *
 * The second is a house rule rather than a legal one, and it is a real trade:
 * most people write a review in the first week, so waiting the full return
 * window loses the majority of them, and a product delivered today earns its
 * first review five weeks after somebody ordered it. Amazon does not do this —
 * it publishes soon after delivery and marks the review Verified Purchase.
 * It is one constant, so the shop can change its mind cheaply.
 */

/**
 * Days after delivery before a review may be written. The shop's return
 * window is 30 days, and the intent is that a review reflects a device the
 * customer decided to keep. Set to 0 to publish as soon as an order is
 * delivered, which is the industry norm.
 */
export const REVIEW_WAIT_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

export type EligibilityCode =
  | 'eligible'
  | 'not-signed-in'
  | 'no-order'
  | 'not-delivered'
  | 'too-soon'
  | 'already-reviewed';

export interface Eligibility {
  eligible: boolean;
  code: EligibilityCode;
  /** Shown to the customer. Plain, and never blames them. */
  reason: string;
  /** When they will be able to review, for the 'too-soon' case. */
  availableFrom?: string;
  orderId?: string;
}

/** Does this order contain the product? Line items carry productId. */
function orderHas(order: Record<string, unknown>, productId: string): boolean {
  const items = Array.isArray(order.items) ? order.items : [];
  return items.some((i) => String((i as Record<string, unknown>)?.productId ?? '') === productId);
}

/**
 * @param db     firebase-admin Firestore
 * @param uid    the signed-in caller, or null
 * @param productId the product being reviewed
 * @param now    injected so the waiting period is testable without waiting
 */
export async function checkEligibility(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  uid: string | null,
  productId: string,
  now: Date = new Date(),
): Promise<Eligibility> {
  if (!uid) {
    return {
      eligible: false,
      code: 'not-signed-in',
      reason: 'Sign in to write a review. Reviews come from customers who bought the device.',
    };
  }

  // One review per person per product. Checked before the order lookup: it is
  // a single indexed read and the commonest reason to be turned away twice.
  const existing = await db.collection('reviews')
    .where('productId', '==', productId)
    .where('userId', '==', uid)
    .limit(1)
    .get();
  if (!existing.empty) {
    return {
      eligible: false,
      code: 'already-reviewed',
      reason: 'You have already reviewed this device. Thank you — one review per customer.',
    };
  }

  const orders = await db.collection('orders').where('userId', '==', uid).get();

  let bought = false;
  let bestDelivered: Date | null = null;
  let bestOrderId: string | undefined;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  orders.forEach((doc: any) => {
    const o = doc.data() as Record<string, unknown>;
    if (!orderHas(o, productId)) return;
    bought = true;

    if (String(o.status ?? '') !== 'delivered') return;

    // deliveredAt is stamped by the delivered transition. An order delivered
    // before that existed has none, so fall back to when it was dispatched,
    // then to when it was placed — always the LATEST known date, so the wait
    // is never accidentally shortened by a missing field.
    const stamp = String(o.deliveredAt ?? o.dispatchedAt ?? o.createdAt ?? '');
    const at = stamp ? new Date(stamp) : null;
    if (!at || Number.isNaN(at.getTime())) return;

    // The earliest qualifying delivery wins: if they bought it twice, the
    // first one is the one whose window has had longest to run.
    if (!bestDelivered || at < bestDelivered) {
      bestDelivered = at;
      bestOrderId = doc.id;
    }
  });

  if (!bought) {
    return {
      eligible: false,
      code: 'no-order',
      reason: 'Reviews are written by customers who bought this device from us.',
    };
  }

  if (!bestDelivered) {
    return {
      eligible: false,
      code: 'not-delivered',
      reason: 'You can review this once your order has been delivered.',
    };
  }

  const opensAt = new Date((bestDelivered as Date).getTime() + REVIEW_WAIT_DAYS * DAY_MS);
  if (now < opensAt) {
    return {
      eligible: false,
      code: 'too-soon',
      reason: `Reviews open ${REVIEW_WAIT_DAYS} days after delivery, once the return window has closed.`,
      availableFrom: opensAt.toISOString(),
      orderId: bestOrderId,
    };
  }

  return {
    eligible: true,
    code: 'eligible',
    reason: 'You bought this device, so your review will be marked as a verified purchase.',
    orderId: bestOrderId,
  };
}
