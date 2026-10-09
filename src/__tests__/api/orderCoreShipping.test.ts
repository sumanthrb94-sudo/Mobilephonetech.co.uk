import { describe, it, expect } from 'vitest';
import { priceAndValidate } from '../../../api/_orderCore.js';
import { SHIPPING_OPTIONS } from '../../context/CheckoutContext';

/**
 * The checkout screen and the server must agree on every delivery option.
 *
 * The screen offers the services in SHIPPING_OPTIONS in CheckoutContext (now
 * one: free next-day) and
 * sends the chosen id to the server, which re-prices the basket from its own
 * table in _orderCore. An id the server does not recognise is not an error
 * there: it falls back to standard delivery, which is free. So a customer who
 * picked Next Day at £19.99 was charged £0 for delivery and the order was
 * written as "Standard Delivery" — the promise on the screen never reached the
 * warehouse, and the shop shipped next-day for nothing.
 *
 * That is exactly what happened: the screen sends `next_day`, the server knew
 * only `nextday`, and the two tables disagreed on the price as well.
 *
 * These drive the real priceAndValidate against a one-product catalogue with
 * every option the screen can send, and assert the server charges what the
 * screen showed and names the service the customer chose.
 */

it('sells one delivery service: free next-day', () => {
  // The rest of the site promises free next-day delivery. Checkout used to
  // offer free 3-5 day standard and charge £19.99 for next-day.
  expect(SHIPPING_OPTIONS.map(o => [o.id, o.cost])).toEqual([['next_day', 0]]);
});

const PRODUCT = { brand: 'Apple', model: 'iPhone 13', price: 100, stock: 5 };

const db = {
  collection: () => ({
    doc: () => ({ get: async () => ({ exists: true, data: () => PRODUCT }) }),
  }),
};

const basket = (shippingOptionId: string) => ({
  items: [{ productId: 'apple-iphone-13', quantity: 1 }],
  shippingOptionId,
  shippingAddress: {
    fullName: 'Ram Test', addressLine1: '1 High St', city: 'London',
    postalCode: 'SE1 3TX', phone: '07700900123', email: 'ram@example.com',
  },
});

describe('delivery pricing agrees between checkout screen and server', () => {
  it.each(SHIPPING_OPTIONS.map(o => [o.id, o.name, o.cost] as const))(
    'charges %s as "%s" at £%s, matching the screen',
    async (id, name, cost) => {
      const priced = await priceAndValidate(db, basket(id), null);
      expect(priced.ok).toBe(true);
      if (!priced.ok) return;
      expect(priced.order.shippingCost).toBe(cost);
      expect(priced.order.shippingMethod).toBe(name);
    },
  );

  it('does not silently give an unknown service away for free', async () => {
    // An id the screen never sends. Falling back to free standard delivery is
    // how the next_day bug hid; an unknown service must be refused instead.
    const priced = await priceAndValidate(db, basket('drone_delivery'), null);
    expect(priced.ok).toBe(false);
    if (priced.ok) return;
    expect(priced.status).toBe(400);
  });

  it.each(['standard', 'express'])('refuses the withdrawn %s service rather than re-pricing it', async (id) => {
    // A stale tab or an old client may still send these. Refused, never
    // quietly mapped onto next-day or charged at an old price.
    const priced = await priceAndValidate(db, basket(id), null);
    expect(priced.ok).toBe(false);
    if (priced.ok) return;
    expect(priced.status).toBe(400);
  });

  it('treats a basket with no service named as free next-day', async () => {
    const { shippingOptionId: _omit, ...rest } = basket('next_day');
    const priced = await priceAndValidate(db, rest, null);
    expect(priced.ok).toBe(true);
    if (!priced.ok) return;
    expect(priced.order.shippingCost).toBe(0);
    expect(priced.order.shippingMethod).toBe('Free Next-Day Delivery');
  });
});

/**
 * Catalogue prices are the consumer prices on the product page, and UK
 * consumer prices must already include VAT. The server used to add 20% on
 * top, so a £270 phone was charged £324 — "Estimated Tax (20%)" on a total the
 * customer had already been shown. The total is now subtotal − discount +
 * delivery, and nothing else.
 */
describe('advertised prices are what the customer pays (VAT included)', () => {
  const phoneAt = (price: number) => ({
    collection: () => ({
      doc: () => ({ get: async () => ({ exists: true, data: () => ({ ...PRODUCT, price }) }) }),
    }),
  });

  it('totals a £270 phone with free delivery at exactly £270.00', async () => {
    const priced = await priceAndValidate(phoneAt(270), basket('next_day'), null);
    expect(priced.ok).toBe(true);
    if (!priced.ok) return;
    expect(priced.order.subtotal).toBe(270);
    expect(priced.order.shippingCost).toBe(0);
    expect(priced.order.tax).toBe(0);
    expect(priced.order.total).toBe(270);
  });

  it('takes off only the discount', async () => {
    const priced = await priceAndValidate(
      phoneAt(270), { ...basket('next_day'), couponCode: 'SAVE10' }, null,
    );
    expect(priced.ok).toBe(true);
    if (!priced.ok) return;
    // £270 − £27 (10%), delivery free.
    expect(priced.order.discount).toBe(27);
    expect(priced.order.total).toBe(243);
    expect(priced.order.tax).toBe(0);
  });
});
