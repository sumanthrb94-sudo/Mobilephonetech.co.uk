import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * PayPal is asked to collect whatever priceAndValidate says the basket costs.
 * When the server added 20% VAT on top of VAT-inclusive catalogue prices, this
 * is the request that charged a customer £324 for a £270 phone. The amount
 * handed to PayPal must be the advertised price plus delivery, to the penny.
 */

const createPayPalOrder = vi.fn();
vi.mock('../../../api/_paypal.js', () => ({
  paypalConfigured: () => true,
  createPayPalOrder: (...a: unknown[]) => createPayPalOrder(...a),
}));

const PRODUCT = { brand: 'Apple', model: 'iPhone 12', price: 270, stock: 3 };
vi.mock('../../../api/_firebaseAdmin.js', () => ({
  adminDb: async () => ({
    collection: () => ({
      doc: () => ({ get: async () => ({ exists: true, data: () => PRODUCT }) }),
    }),
  }),
  verifyCaller: async () => null,
}));

const { default: handler } = await import('../../../api/_routes/paypal/create-order.js');

let testIp = 0;
async function post(b: unknown) {
  const out: { code: number; body: any } = { code: 0, body: null };
  const r: any = {
    setHeader: () => r,
    status: (c: number) => { out.code = c; return r; },
    json: (j: unknown) => { out.body = j; return r; },
  };
  testIp += 1;
  await handler({ method: 'POST', body: b, headers: { 'x-forwarded-for': `10.9.0.${testIp}` }, socket: {} }, r);
  return out;
}

const basket = (shippingOptionId: string) => ({
  items: [{ productId: 'apple-iphone-12', quantity: 1 }],
  shippingOptionId,
  shippingAddress: {
    fullName: 'Ram Test', addressLine1: '1 High St', city: 'London',
    postalCode: 'SE1 3TX', phone: '07700900123', email: 'ram@example.com',
  },
});

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.VITE_PREVIEW_MODE;
  createPayPalOrder.mockResolvedValue({ ok: true, status: 201, data: { id: 'PP-270' } });
});

describe('POST /api/paypal/create-order', () => {
  it('asks PayPal for exactly £270.00 for a £270 phone with free delivery', async () => {
    const out = await post(basket('next_day'));
    expect(out.code).toBe(200);
    expect(createPayPalOrder).toHaveBeenCalledTimes(1);
    const [amount, , currency] = createPayPalOrder.mock.calls[0];
    expect(amount).toBe(270);
    expect(currency).toBe('GBP');
  });

  it('takes off a discount and adds nothing', async () => {
    await post({ ...basket('next_day'), couponCode: 'SAVE10' });
    expect(createPayPalOrder.mock.calls[0][0]).toBe(243);
  });

  it('opens no PayPal order for a withdrawn delivery service', async () => {
    const out = await post(basket('express'));
    expect(out.code).toBe(400);
    expect(createPayPalOrder).not.toHaveBeenCalled();
  });
});
