import { describe, it, expect } from 'vitest';
import {
  todo, selling, pushToSell, accounts, ahead, readiness, isPaid,
  type InsightProduct, type InsightOrder,
} from '../../lib/dashboardInsights';

const NOW = new Date('2026-10-15T12:00:00Z');
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000).toISOString();

const product = (id: string, over: Partial<InsightProduct> = {}): InsightProduct => ({
  id, brand: 'Apple', model: id, price: 500, stock: 3, listed: true, hasPhoto: true, createdAt: daysAgo(20), ...over,
});
const order = (id: string, productId: string, over: Partial<InsightOrder> = {}): InsightOrder => ({
  id, status: 'delivered', total: 500, createdAt: daysAgo(5), paypalOrderId: `PP-${id}`,
  items: [{ productId, quantity: 1, price: 500 }], ...over,
});

describe('which orders count', () => {
  it('only PayPal-paid, unrefunded orders are sales', () => {
    expect(isPaid(order('a', 'x'))).toBe(true);
    expect(isPaid(order('b', 'x', { paypalOrderId: undefined }))).toBe(false);
    expect(isPaid(order('c', 'x', { status: 'refunded' }))).toBe(false);
  });
});

describe('needs doing now', () => {
  it('counts paid orders to pack, the overdue ones, and parcels stuck in transit', () => {
    const t = todo([
      order('new', 'x', { status: 'pending', createdAt: daysAgo(0.2) }),
      order('late', 'x', { status: 'pending', createdAt: daysAgo(3) }),
      order('test', 'x', { status: 'pending', paypalOrderId: undefined }),
      order('stuck', 'x', { status: 'dispatched', dispatchedAt: daysAgo(5) }),
      order('fine', 'x', { status: 'dispatched', dispatchedAt: daysAgo(1) }),
    ], NOW);
    expect(t).toEqual({ toPack: 2, overdue: 1, inTransitLong: 1 });
  });
});

describe('what is selling', () => {
  it('ranks best sellers over 30 days with how long their stock lasts', () => {
    const s = selling(
      [product('hot', { stock: 4 }), product('warm', { stock: 10 })],
      [
        order('1', 'hot'), order('2', 'hot'), order('3', 'hot', { createdAt: daysAgo(2) }),
        order('4', 'warm', { createdAt: daysAgo(40) }), order('5', 'warm'),
      ],
      NOW,
    );
    expect(s.top.map(t => t.id)).toEqual(['hot', 'warm']);
    expect(s.top[0]).toMatchObject({ sold: 3, stock: 4, daysOfCover: 40 });
    expect(s.units7).toBe(4);
    expect(s.units30).toBe(4);
    expect(s.revenue30).toBe(2000);
    expect(s.revenuePrev30).toBe(500);
  });
});

describe('push to sell', () => {
  it('lists unsold in-stock products, most money on the shelf first, with why', () => {
    const items = pushToSell(
      [
        product('selling'),
        product('nophoto', { hasPhoto: false, stock: 1 }),
        product('pricey', { stock: 5, price: 900 }),
        product('carted', { stock: 2 }),
        product('draft', { listed: false }),
        product('empty', { stock: 0 }),
      ],
      [order('1', 'selling')],
      [
        { productId: 'pricey', views: 40, addToCart: 0 },
        { productId: 'carted', views: 12, addToCart: 3 },
      ],
      NOW,
    );
    expect(items.map(i => i.id)).toEqual(['pricey', 'carted', 'nophoto']);
    expect(items[0]).toMatchObject({ value: 4500, action: 'Check the price' });
    expect(items[1].reason).toMatch(/3 added to cart/);
    expect(items[2].action).toBe('Upload photos');
  });
});

describe('accounts', () => {
  it('shows this month against last, leaves test orders out, and costs only what is costed', () => {
    const now = new Date('2026-10-20T12:00:00Z');
    const a = accounts(
      [product('a', { stock: 2, price: 300 }), product('b', { stock: 0 })],
      [
        order('oct1', 'a', { createdAt: '2026-10-02T10:00:00Z', total: 600, items: [{ productId: 'a', quantity: 2, price: 300, buyPrice: 200 }] }),
        order('oct2', 'a', { createdAt: '2026-10-10T10:00:00Z', total: 300 }),
        order('test', 'a', { createdAt: '2026-10-11T10:00:00Z', total: 999, paypalOrderId: undefined }),
        order('refund', 'a', { createdAt: '2026-10-12T10:00:00Z', total: 250, status: 'refunded', refundedAmount: 250 }),
        order('sep', 'a', { createdAt: '2026-09-15T10:00:00Z', total: 400 }),
      ],
      now,
    );
    expect(a.revenueMonth).toBe(900);
    expect(a.ordersMonth).toBe(2);
    expect(a.revenueLastMonth).toBe(400);
    expect(a.averageOrder).toBe(450);
    expect(a.refundsMonth).toBe(250);
    expect(a.stockValue).toBe(600);
    expect(a.stockUnits).toBe(2);
    expect(a.grossProfitMonth).toBe(200);
    expect(a.ordersWithoutCost).toBe(1);
    expect(a.unpaidExcluded).toBe(1);
  });

  it('says nothing about profit when no cost is recorded', () => {
    expect(accounts([product('a')], [order('1', 'a')], NOW).grossProfitMonth).toBeNull();
  });
});

describe('coming up', () => {
  it('warns about stock running out, demand we cannot serve, and old unsold stock', () => {
    const a = ahead(
      [
        product('fast', { stock: 1 }),
        product('gone', { stock: 0 }),
        product('wanted', { stock: 0 }),
        product('old', { stock: 4, createdAt: daysAgo(120) }),
      ],
      [order('1', 'fast'), order('2', 'fast'), order('3', 'fast'), order('4', 'gone')],
      [{ productId: 'wanted', views: 9, addToCart: 0 }],
      NOW,
    );
    expect(a.runningOut.map(i => i.id)).toEqual(['fast']);
    expect(a.runningOut[0].detail).toBe('1 left, about 10 days at this rate');
    expect(a.missedDemand.map(i => i.id).sort()).toEqual(['gone', 'wanted']);
    expect(a.ageing.map(i => i.id)).toEqual(['old']);
  });
});

describe('ready for launch', () => {
  it('reads PayPal and email from the live health check', () => {
    const live = readiness([product('a')], [order('1', 'a')], { paypalConfigured: true, paypalEnv: 'live', emailConfigured: true }, { icoRegistration: 'ZA1' });
    expect(live.every(c => c.state === 'done')).toBe(true);

    const sandbox = readiness([product('a')], [], { paypalConfigured: true, paypalEnv: 'sandbox', emailConfigured: false });
    expect(sandbox[0]).toMatchObject({ state: 'todo' });
    expect(sandbox[0].detail).toMatch(/sandbox/);
    expect(sandbox[1].state).toBe('todo');
  });

  it('says it does not know rather than guessing when the health check is unreachable', () => {
    const r = readiness([], [], null);
    expect(r[0].state).toBe('unknown');
    expect(r[1].state).toBe('unknown');
  });

  it('flags missing photos, empty listings and test orders', () => {
    const r = readiness(
      [product('a', { hasPhoto: false }), product('b'), product('c', { stock: 0 })],
      [order('t', 'a', { paypalOrderId: undefined })],
      null,
    );
    const by = Object.fromEntries(r.map(c => [c.label, c]));
    expect(by['Every product for sale has photos'].detail).toBe('1 of 2 in-stock products have photos');
    expect(by['Listed products have stock'].state).toBe('todo');
    expect(by['No test orders mixed in'].state).toBe('todo');
  });
});
