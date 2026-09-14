/**
 * The order lifecycle, in one place.
 *
 * An order moves forward through fixed stages and never sideways or back:
 *
 *   paid ─▶ dispatched ─▶ out-for-delivery ─▶ delivered
 *     │          │                │
 *     └──────────┴────────────────┴──▶ refunded   (terminal)
 *
 * `pending` and `confirmed` are the same stage under two names — capture
 * writes `pending`, the confirmation email writes `confirmed` — so both mean
 * "paid, nothing has left the building yet".
 *
 * This lives on the server because the server is the boundary. The admin
 * screen hides the buttons that do not apply, but a hidden button is a
 * courtesy, not a rule: the route is what a replayed request, a stale tab or
 * a second member of staff actually hits. Before this existed, every kind was
 * accepted in any order, so a delivered order could be marked dispatched
 * again — sending the customer a "your parcel is on its way" email for a
 * parcel already in their hands, and resetting dispatchedAt on the way past.
 */

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'dispatched'
  | 'out-for-delivery'
  | 'delivered'
  | 'refunded';

/** The stage each staff action moves an order to. */
export const STATUS_FOR_KIND = {
  confirmation: 'confirmed',
  dispatched: 'dispatched',
  'out-for-delivery': 'out-for-delivery',
  delivered: 'delivered',
} as const;

export type NotifyKind = keyof typeof STATUS_FOR_KIND;

/**
 * How far along each stage is. Refunded is deliberately absent: it is not a
 * point on this line but the end of it, reachable from anywhere and returning
 * nowhere. Refunds go through /api/order-refund, which moves the money before
 * it moves the books.
 */
const RANK: Record<string, number> = {
  pending: 0,
  confirmed: 0,
  dispatched: 1,
  'out-for-delivery': 2,
  delivered: 3,
};

export interface TransitionCheck {
  ok: boolean;
  /** Plain-language reason, safe to show staff. */
  reason?: string;
}

/**
 * May an order at `from` be moved to `to`?
 *
 * Resending the confirmation is not a transition at all — it re-sends an
 * email for a stage the order is already at or past — so it is allowed
 * wherever the order still exists and has not been refunded.
 */
export function canTransition(from: string, to: string, kind?: NotifyKind): TransitionCheck {
  if (from === 'refunded') {
    return { ok: false, reason: 'This order was refunded. Refunded orders cannot be moved on.' };
  }

  if (kind === 'confirmation') return { ok: true };

  const current = RANK[from];
  const next = RANK[to];

  if (current === undefined) {
    return { ok: false, reason: `Unknown order status "${from}".` };
  }
  if (next === undefined) {
    return { ok: false, reason: `"${to}" is not a stage an order can be moved to.` };
  }
  if (next === current) {
    return { ok: false, reason: `This order is already ${LABEL[to] ?? to}.` };
  }
  if (next < current) {
    return {
      ok: false,
      reason: `This order is already ${LABEL[from] ?? from}; it cannot go back to ${LABEL[to] ?? to}.`,
    };
  }
  if (next > current + 1) {
    return {
      ok: false,
      reason: `An order goes ${LABEL[from] ?? from} → ${
        LABEL[STAGE_AT[current + 1]] ?? ''
      } first. Mark that before ${LABEL[to] ?? to}.`,
    };
  }

  return { ok: true };
}

const STAGE_AT: Record<number, string> = {
  0: 'confirmed',
  1: 'dispatched',
  2: 'out-for-delivery',
  3: 'delivered',
};

export const LABEL: Record<string, string> = {
  pending: 'paid',
  confirmed: 'paid',
  dispatched: 'dispatched',
  'out-for-delivery': 'out for delivery',
  delivered: 'delivered',
  refunded: 'refunded',
};
