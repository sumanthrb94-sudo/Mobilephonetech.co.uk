import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * The admin order list used to ask Firestore for 500 orders with no ordering.
 * Firestore then returns documents by id, ascending, and order ids are
 * ORD-<epoch ms>: so after the 500th order the screens kept the 500 OLDEST and
 * the newest vanished. The ordering has to be in the query; sorting the result
 * afterwards cannot bring back a document the query left out.
 */

const calls: Array<{ kind: string; args: unknown[] }> = [];
vi.mock('firebase/firestore', () => ({
  collection: (...args: unknown[]) => { calls.push({ kind: 'collection', args }); return { collection: args[1] }; },
  orderBy: (...args: unknown[]) => { calls.push({ kind: 'orderBy', args }); return { orderBy: args }; },
  limit: (...args: unknown[]) => { calls.push({ kind: 'limit', args }); return { limit: args[0] }; },
  query: (...args: unknown[]) => { calls.push({ kind: 'query', args }); return { query: args }; },
  getDocs: vi.fn(async () => ({ docs: [] })),
}));
vi.mock('../../lib/firebase', () => ({ auth: {}, db: {}, COL: { orders: 'orders' } }));

const { listOrders } = await import('../../lib/orders');

beforeEach(() => { calls.length = 0; });

describe('listOrders', () => {
  it('asks Firestore for the NEWEST 500 orders, not the first 500 by id', async () => {
    await listOrders();

    const query = calls.find(c => c.kind === 'query')!;
    const constraints = query.args.slice(1) as Array<{ orderBy?: unknown[]; limit?: number }>;

    expect(constraints.some(c => c.orderBy?.[0] === 'createdAt' && c.orderBy?.[1] === 'desc')).toBe(true);
    expect(constraints.some(c => c.limit === 500)).toBe(true);
    // The ordering must come before the limit, or it orders nothing that was cut.
    const orderIndex = constraints.findIndex(c => c.orderBy);
    const limitIndex = constraints.findIndex(c => c.limit != null);
    expect(orderIndex).toBeLessThan(limitIndex);
  });
});
