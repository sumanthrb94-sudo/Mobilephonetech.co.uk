import { describe, it, expect } from 'vitest';
import { checkoutTotals } from '../../lib/checkoutTotals';
import { priceAndValidate } from '../../../api/_orderCore.js';
import { SHIPPING_OPTIONS } from '../../context/CheckoutContext';

/**
 * The total the checkout shows must be the total the server charges.
 *
 * The screen once added "Estimated Tax (20%)" to VAT-inclusive prices and the
 * server did the same, so the two agreed with each other and both overcharged.
 * These price the same baskets through both and require the same pennies, with
 * no VAT added by either.
 */

const CATALOGUE: Record<string, { brand: string; model: string; price: number; stock: number }> = {
  a: { brand: 'Apple', model: 'iPhone 12', price: 270, stock: 9 },
  b: { brand: 'Samsung', model: 'Galaxy S21', price: 189.99, stock: 9 },
  c: { brand: 'Google', model: 'Pixel 7', price: 213.33, stock: 9 },
};

const db = {
  collection: () => ({
    doc: (id: string) => ({ get: async () => ({ exists: id in CATALOGUE, data: () => CATALOGUE[id] }) }),
  }),
};

const ADDRESS = {
  fullName: 'Ram Test', addressLine1: '1 High St', city: 'London',
  postalCode: 'SE1 3TX', phone: '07700900123', email: 'ram@example.com',
};

const COUPONS = {
  SAVE10: { discountType: 'percentage' as const, value: 10 },
  FREESHIP: { discountType: 'fixed' as const, value: 9.99 },
};

const BASKETS: Array<[string, Record<string, number>]> = [
  ['one £270 phone', { a: 1 }],
  ['three different phones', { a: 1, b: 1, c: 1 }],
  ['multiples of an odd price', { b: 3, c: 2 }],
];

describe('checkout totals agree with the server, VAT included', () => {
  for (const [label, qty] of BASKETS) {
    for (const option of SHIPPING_OPTIONS) {
      for (const code of [null, 'SAVE10', 'FREESHIP'] as const) {
        it(`${label}, ${option.id}, ${code ?? 'no coupon'}`, async () => {
          const lines = Object.entries(qty).map(([id, quantity]) => ({ price: CATALOGUE[id].price, quantity }));
          const screen = checkoutTotals(lines, option.cost, code ? COUPONS[code] : null);

          const priced = await priceAndValidate(db, {
            items: Object.entries(qty).map(([productId, quantity]) => ({ productId, quantity })),
            shippingOptionId: option.id,
            couponCode: code,
            shippingAddress: ADDRESS,
          }, null);
          expect(priced.ok).toBe(true);
          if (!priced.ok) return;

          expect(screen.subtotal).toBe(priced.order.subtotal);
          expect(screen.discount).toBe(priced.order.discount);
          expect(screen.shippingCost).toBe(priced.order.shippingCost);
          expect(screen.total).toBe(priced.order.total);
          expect(priced.order.tax).toBe(0);
        });
      }
    }
  }

  it('a £270 phone with free delivery is £270.00, not £324.00', () => {
    expect(checkoutTotals([{ price: 270, quantity: 1 }], 0, null).total).toBe(270);
  });
});
