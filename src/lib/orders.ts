import { collection, getDocs, query, limit as fsLimit } from 'firebase/firestore';
import { auth, db, COL } from './firebase';

/**
 * Order management, staff side.
 *
 * Reads come straight from Firestore, because the rules already allow an admin
 * to read every order and nothing here needs a server to compute it. Writes do
 * NOT: dispatching sends email and SMS, and refunding moves real money through
 * PayPal. Both go through admin-gated API routes so the browser never holds the
 * authority to do either.
 */

export interface AdminOrder {
  id: string;
  status: string;
  total: number;
  currency: string;
  createdAt: string;
  contactEmail: string;
  customer: string;
  address: string[];
  items: Array<{ name: string; quantity: number; price: number }>;
  paypalOrderId?: string;
  courier?: string | null;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  dispatchedAt?: string | null;
  refundedAt?: string | null;
  refundedAmount?: number | null;
}

/**
 * The lifecycle a real order moves through. `pending` is what capture writes,
 * so it means "paid, nothing done yet" rather than "awaiting payment" — an
 * unpaid order never reaches the database at all.
 */
export const ORDER_STATUS_LABEL: Record<string, string> = {
  pending: 'Paid — to pack',
  confirmed: 'Paid — to pack',
  dispatched: 'In transit',
  'out-for-delivery': 'Out for delivery',
  delivered: 'Delivered',
  refunded: 'Refunded',
};

export const OPEN_STATUSES = ['pending', 'confirmed'];

/**
 * The one action an order at each stage is waiting for.
 *
 * An order moves forward one stage at a time and never back, so at any moment
 * there is exactly one "next" — which is the whole point. The screen used to
 * show Mark dispatched, Out for delivery, Resend receipt and Refund at every
 * stage, so an order already out for delivery still offered to dispatch it,
 * and nothing in the UI said which button was the right one. Picking wrong
 * emailed the customer about a parcel that had already moved on.
 *
 * api/_orderFlow.ts holds the same rules for the server, which is what
 * actually enforces them; orderFlow.test.ts asserts the two agree, so this
 * cannot quietly drift into offering something the route will refuse.
 */
export const STAGES = ['paid', 'dispatched', 'out-for-delivery', 'delivered'] as const;
export type Stage = typeof STAGES[number];

/** Which stage an order is standing at. `null` for refunded — off the line. */
export function stageOf(status: string): Stage | null {
  if (status === 'refunded') return null;
  if (status === 'dispatched') return 'dispatched';
  if (status === 'out-for-delivery') return 'out-for-delivery';
  if (status === 'delivered') return 'delivered';
  return 'paid';
}

export interface NextAction {
  kind: 'dispatched' | 'out-for-delivery' | 'delivered';
  label: string;
  /** Past tense, for the confirmation line after it succeeds. */
  done: string;
  /** Whether the courier and tracking fields are worth showing. */
  needsTracking: boolean;
}

export function nextAction(status: string): NextAction | null {
  switch (stageOf(status)) {
    case 'paid':
      return { kind: 'dispatched', label: 'Mark dispatched', done: 'dispatched, customer notified', needsTracking: true };
    case 'dispatched':
      return { kind: 'out-for-delivery', label: 'Mark out for delivery', done: 'out for delivery', needsTracking: true };
    case 'out-for-delivery':
      return { kind: 'delivered', label: 'Mark delivered', done: 'delivered', needsTracking: false };
    default:
      // Delivered, or refunded: nothing further to move.
      return null;
  }
}

export function orderStatusLabel(status: string): string {
  return ORDER_STATUS_LABEL[status] ?? status;
}

/** Money as staff read it, never as a float on screen. */
export function gbp(value: number): string {
  return `£${Number(value ?? 0).toFixed(2)}`;
}

function line(value: unknown): string {
  return String(value ?? '').trim();
}

export async function listOrders(): Promise<AdminOrder[]> {
  const snap = await getDocs(query(collection(db, COL.orders), fsLimit(500)));

  return snap.docs
    .map(d => {
      const o = d.data() as Record<string, any>;
      const addr = (o.shippingAddress ?? {}) as Record<string, unknown>;
      return {
        id: d.id,
        status: String(o.status ?? 'pending'),
        total: Number(o.total ?? 0),
        currency: String(o.currency ?? 'GBP'),
        createdAt: String(o.createdAt ?? ''),
        contactEmail: String(o.contactEmail ?? ''),
        customer: line(addr.fullName) || 'Guest',
        address: [
          line(addr.addressLine1), line(addr.addressLine2),
          line(addr.city), line(addr.postalCode), line(addr.country),
        ].filter(Boolean),
        items: (Array.isArray(o.items) ? o.items : []).map((i: Record<string, any>) => ({
          name: [i.brand, i.model].filter(Boolean).join(' ') || String(i.name ?? i.productId ?? 'Item'),
          quantity: Number(i.quantity ?? 1),
          price: Number(i.price ?? 0),
        })),
        paypalOrderId: o.paypalOrderId ? String(o.paypalOrderId) : undefined,
        courier: o.courier ?? null,
        trackingNumber: o.trackingNumber ?? null,
        trackingUrl: o.trackingUrl ?? null,
        dispatchedAt: o.dispatchedAt ?? null,
        refundedAt: o.refundedAt ?? null,
        refundedAmount: o.refundedAmount ?? null,
      } satisfies AdminOrder;
    })
    // Newest first. Firestore is not asked to order this because createdAt is a
    // string field and a composite index for 500 rows buys nothing.
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Every staff write goes through an admin-gated route, never straight to the db. */
async function adminPost(path: string, body: Record<string, unknown>): Promise<void> {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error('Your session has expired — sign in again.');

  const res = await fetch(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `That did not work (${res.status}).`);
}

export interface DispatchDetails {
  courier?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  estimatedDelivery?: string;
}

export function markDispatched(orderId: string, info: DispatchDetails): Promise<void> {
  return adminPost('/api/order-notify', { orderId, kind: 'dispatched', ...info });
}

export function markOutForDelivery(orderId: string, info: DispatchDetails): Promise<void> {
  return adminPost('/api/order-notify', { orderId, kind: 'out-for-delivery', ...info });
}

/**
 * The end of the line. Stamps deliveredAt, which is the date a return window
 * is measured from — so this is a fact about the order, not just a label.
 */
export function markDelivered(orderId: string): Promise<void> {
  return adminPost('/api/order-notify', { orderId, kind: 'delivered' });
}

/** Runs whichever move the order's stage calls for. */
export function advanceOrder(orderId: string, action: NextAction, info: DispatchDetails): Promise<void> {
  if (action.kind === 'delivered') return markDelivered(orderId);
  if (action.kind === 'out-for-delivery') return markOutForDelivery(orderId, info);
  return markDispatched(orderId, info);
}

export function resendConfirmation(orderId: string): Promise<void> {
  return adminPost('/api/order-notify', { orderId, kind: 'confirmation' });
}

/**
 * Refund in full and put the stock back.
 *
 * There is no separate cancel: an order only exists once its payment was
 * captured, so cancelling one IS refunding it.
 */
export function refundOrder(orderId: string): Promise<void> {
  return adminPost('/api/order-refund', { orderId });
}
