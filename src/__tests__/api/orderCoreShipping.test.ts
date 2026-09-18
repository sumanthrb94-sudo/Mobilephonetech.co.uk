import { describe, it, expect } from 'vitest';
import { priceAndValidate } from '../../../api/_orderCore.js';
import { SHIPPING_OPTIONS } from '../../context/CheckoutContext';

/**
 * The checkout screen and the server must agree on every delivery option.
 *
 * The screen offers three services from SHIPPING_OPTIONS in CheckoutContext and
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
});
