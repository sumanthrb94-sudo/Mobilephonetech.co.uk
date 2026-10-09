import { describe, it, expect } from 'vitest';
import { priceAndValidate } from '../../../api/_orderCore.js';

/**
 * A product sold in several configurations carries its cheapest price as the
 * base "from" price. A basket line that left out the variant id used to be
 * charged that base price while keeping whatever storage, colour and condition
 * the request named — so a 1TB phone could be bought at the 128GB price, and
 * staff, packing by hand, would ship the 1TB. These drive the real pricing.
 */

const PHONE = {
  brand: 'Apple', model: 'iPhone 15', price: 400, stock: 3,
  variants: [
    { id: 'v128', storage: '128GB', color: 'Black', condition: 'Good', price: 400, stock: 2 },
    { id: 'v1tb', storage: '1TB', color: 'Blue', condition: 'Pristine', price: 900, stock: 1 },
  ],
};
const CHARGER = {
  brand: 'LeHart', model: 'USB-C charger', price: 19, stock: 5,
  variants: [{ id: 'only', storage: '', color: 'White', condition: 'New', price: 19, stock: 5 }],
};

const db = (product: Record<string, unknown>) => ({
  collection: () => ({
    doc: () => ({ get: async () => ({ exists: true, data: () => product }) }),
  }),
});

const basket = (line: Record<string, unknown>) => ({
  items: [{ productId: 'apple-iphone-15', quantity: 1, ...line }],
  shippingOptionId: 'standard',
  shippingAddress: {
    fullName: 'Ram Test', addressLine1: '1 High St', city: 'London',
    postalCode: 'SE1 3TX', phone: '07700900123', email: 'ram@example.com',
  },
});

describe('configured products are priced by the configuration bought', () => {
  it('refuses a line with no variant id rather than charging the "from" price', async () => {
    const priced = await priceAndValidate(db(PHONE), basket({ selectedStorage: '1TB' }), null);
    expect(priced.ok).toBe(false);
    if (priced.ok) return;
    expect(priced.status).toBe(400);
    expect(priced.error).toMatch(/choose a configuration/i);
  });

  it('charges the chosen variant and labels the line from it, not from the request', async () => {
    const priced = await priceAndValidate(
      db(PHONE),
      basket({ variantId: 'v128', selectedStorage: '1TB', selectedColor: 'Blue', selectedCondition: 'Pristine' }),
      null,
    );
    expect(priced.ok).toBe(true);
    if (!priced.ok) return;
    expect(priced.order.items[0]).toMatchObject({
      variantId: 'v128', price: 400, selectedStorage: '128GB', selectedColor: 'Black', selectedCondition: 'Good',
    });
  });

  it('refuses a variant id the product does not have', async () => {
    const priced = await priceAndValidate(db(PHONE), basket({ variantId: 'made-up' }), null);
    expect(priced.ok).toBe(false);
  });

  it('a product with a single configuration needs no variant id', async () => {
    const priced = await priceAndValidate(db(CHARGER), basket({}), null);
    expect(priced.ok).toBe(true);
    if (!priced.ok) return;
    expect(priced.order.items[0]).toMatchObject({ variantId: 'only', price: 19 });
  });
});
