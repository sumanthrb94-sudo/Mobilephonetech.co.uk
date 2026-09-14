import { describe, it, expect } from 'vitest';
import { checkEligibility, REVIEW_WAIT_DAYS } from '../../../api/_reviewEligibility.js';

/**
 * Who may review a product.
 *
 * Before this, POST /api/reviews took no authentication at all: any caller
 * could post any rating for any product under any name. The badge said
 * nothing and the star average was whatever anyone typed. These tests are
 * the boundary — every case that must be refused, and the one that must not.
 */

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date('2026-09-14T12:00:00.000Z');
const daysAgo = (n: number) => new Date(NOW.getTime() - n * DAY).toISOString();

/**
 * Minimal stand-in for the two collections the check reads.
 *
 * `where` returns a NEW query over the rows it just filtered, so chained
 * calls narrow. The first version of this closed over the original rows, so
 * `.where(productId).where(userId)` applied only the second — which happened
 * to fail a test, but could as easily have passed one that should not.
 */
function query(rows: any[]) {
  return {
    where(field: string, _op: string, value: unknown) {
      return query(rows.filter((r: any) => r[field] === value));
    },
    limit(n: number) { return query(rows.slice(0, n)); },
    async get() {
      const docs = rows.map((r: any) => ({ id: r.id, data: () => r }));
      return {
        empty: docs.length === 0,
        docs,
        forEach: (fn: (d: any) => void) => docs.forEach(fn),
      };
    },
  };
}

function makeDb({ orders = [], reviews = [] }: { orders?: any[]; reviews?: any[] }) {
  return { collection: (name: string) => query(name === 'orders' ? orders : reviews) };
}

const order = (over: Record<string, unknown> = {}) => ({
  id: 'ORD-1',
  userId: 'u1',
  status: 'delivered',
  deliveredAt: daysAgo(REVIEW_WAIT_DAYS + 1),
  items: [{ productId: 'apple-iphone-15', quantity: 1 }],
  ...over,
});

describe('checkEligibility', () => {
  it('lets through a customer whose delivered order has aged past the window', async () => {
    const db = makeDb({ orders: [order()] });
    const r = await checkEligibility(db, 'u1', 'apple-iphone-15', NOW);

    expect(r.eligible).toBe(true);
    expect(r.code).toBe('eligible');
    expect(r.orderId).toBe('ORD-1');
  });

  it('refuses someone who is not signed in', async () => {
    const r = await checkEligibility(makeDb({}), null, 'apple-iphone-15', NOW);
    expect(r).toMatchObject({ eligible: false, code: 'not-signed-in' });
  });

  it('refuses someone who never bought it', async () => {
    const db = makeDb({ orders: [order({ items: [{ productId: 'something-else' }] })] });
    const r = await checkEligibility(db, 'u1', 'apple-iphone-15', NOW);
    expect(r).toMatchObject({ eligible: false, code: 'no-order' });
  });

  it("refuses another customer's order", async () => {
    // The orders query filters on userId, so this proves the filter is the
    // thing doing the work rather than the line-item match.
    const db = makeDb({ orders: [order({ userId: 'someone-else' })] });
    const r = await checkEligibility(db, 'u1', 'apple-iphone-15', NOW);
    expect(r).toMatchObject({ eligible: false, code: 'no-order' });
  });

  it('refuses an order that has not been delivered yet', async () => {
    for (const status of ['pending', 'confirmed', 'dispatched', 'out-for-delivery']) {
      const db = makeDb({ orders: [order({ status })] });
      const r = await checkEligibility(db, 'u1', 'apple-iphone-15', NOW);
      expect(r, status).toMatchObject({ eligible: false, code: 'not-delivered' });
    }
  });

  it('refuses a refunded order — they did not keep it', async () => {
    const db = makeDb({ orders: [order({ status: 'refunded' })] });
    const r = await checkEligibility(db, 'u1', 'apple-iphone-15', NOW);
    expect(r.eligible).toBe(false);
  });

  it('holds the review until the return window has closed', async () => {
    const db = makeDb({ orders: [order({ deliveredAt: daysAgo(REVIEW_WAIT_DAYS - 1) })] });
    const r = await checkEligibility(db, 'u1', 'apple-iphone-15', NOW);

    expect(r).toMatchObject({ eligible: false, code: 'too-soon' });
    // And says when, rather than only saying no.
    expect(new Date(r.availableFrom!).getTime()).toBeGreaterThan(NOW.getTime());
  });

  it('opens exactly on the boundary, not a day late', async () => {
    const db = makeDb({ orders: [order({ deliveredAt: daysAgo(REVIEW_WAIT_DAYS) })] });
    expect((await checkEligibility(db, 'u1', 'apple-iphone-15', NOW)).eligible).toBe(true);
  });

  it('allows only one review per customer per product', async () => {
    const db = makeDb({
      orders: [order()],
      reviews: [{ id: 'r1', productId: 'apple-iphone-15', userId: 'u1' }],
    });
    const r = await checkEligibility(db, 'u1', 'apple-iphone-15', NOW);
    expect(r).toMatchObject({ eligible: false, code: 'already-reviewed' });
  });

  it("does not count someone else's review against this customer", async () => {
    const db = makeDb({
      orders: [order()],
      reviews: [{ id: 'r1', productId: 'apple-iphone-15', userId: 'another-user' }],
    });
    expect((await checkEligibility(db, 'u1', 'apple-iphone-15', NOW)).eligible).toBe(true);
  });

  it('falls back to the dispatch date for orders delivered before deliveredAt existed', async () => {
    // Orders that pre-date the delivered transition carry no deliveredAt. The
    // fallback must never SHORTEN the wait, so it uses the latest date known.
    const db = makeDb({
      orders: [order({ deliveredAt: undefined, dispatchedAt: daysAgo(REVIEW_WAIT_DAYS + 5) })],
    });
    expect((await checkEligibility(db, 'u1', 'apple-iphone-15', NOW)).eligible).toBe(true);

    const recent = makeDb({
      orders: [order({ deliveredAt: undefined, dispatchedAt: daysAgo(2) })],
    });
    expect((await checkEligibility(recent, 'u1', 'apple-iphone-15', NOW)).code).toBe('too-soon');
  });

  it('uses the earliest qualifying delivery when they bought it twice', async () => {
    const db = makeDb({
      orders: [
        order({ id: 'ORD-NEW', deliveredAt: daysAgo(1) }),
        order({ id: 'ORD-OLD', deliveredAt: daysAgo(REVIEW_WAIT_DAYS + 10) }),
      ],
    });
    const r = await checkEligibility(db, 'u1', 'apple-iphone-15', NOW);

    expect(r.eligible).toBe(true);
    expect(r.orderId).toBe('ORD-OLD');
  });

  it('refuses an order with an unreadable delivery date rather than guessing', async () => {
    const db = makeDb({ orders: [order({ deliveredAt: 'not a date', dispatchedAt: undefined, createdAt: undefined })] });
    const r = await checkEligibility(db, 'u1', 'apple-iphone-15', NOW);
    expect(r).toMatchObject({ eligible: false, code: 'not-delivered' });
  });
});
