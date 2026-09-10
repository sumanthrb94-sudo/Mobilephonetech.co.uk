import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * PayPal is the only gateway, so the one endpoint that writes an order
 * without taking payment must be shut unless somebody opens it on purpose.
 *
 * The failure this guards against is silent and expensive: /api/orders needs
 * no sign-in, reserves stock and sends a confirmation, so an open one is free
 * merchandise for anyone who finds it. A default that flips back to "on"
 * would look exactly like working software.
 */

const adminDb = vi.fn();
vi.mock('../../../api/_firebaseAdmin.js', () => ({
  adminDb: (...a: unknown[]) => adminDb(...a),
  verifyCaller: async () => null,
}));

const { default: handler } = await import('../../../api/_routes/orders.js');

function post(body: unknown) {
  const out: { code: number; body: any } = { code: 0, body: null };
  const r: any = {
    setHeader: () => r,
    status: (c: number) => { out.code = c; return r; },
    json: (b: unknown) => { out.body = b; return r; },
  };
  return handler({ method: 'POST', body, headers: {}, socket: {} }, r).then(() => out);
}

const BASKET = {
  items: [{ productId: 'apple-iphone-13-128gb', quantity: 1 }],
  shippingAddress: {
    fullName: 'Ram Bolla', email: 'ram@example.com', phone: '07700 900123',
    addressLine1: '14 Camden Road', city: 'London', postalCode: 'NW1 9XF', country: 'UK',
  },
};

beforeEach(async () => {
  vi.clearAllMocks();
  const { resetRateLimits } = await import('../../../api/_rateLimit.js');
  resetRateLimits();
  delete process.env.ALLOW_UNPAID_ORDERS;
  delete process.env.VITE_PREVIEW_MODE;
});
afterEach(() => { delete process.env.ALLOW_UNPAID_ORDERS; });

describe('POST /api/orders — the unpaid path', () => {
  it('is refused when the flag is unset', async () => {
    const out = await post(BASKET);
    expect(out.code).toBe(503);
    // It must not even reach the database: no pricing, no stock, no write.
    expect(adminDb).not.toHaveBeenCalled();
  });

  // 503 alone proves nothing here — an unreachable database answers 503 too —
  // so these assert on whether the gate was passed, i.e. whether the handler
  // ever reached the database.
  it.each(['', 'false', 'no', '0', 'off', 'yes', '1', 'on'])(
    'stays refused for ALLOW_UNPAID_ORDERS=%j',
    async (value) => {
      process.env.ALLOW_UNPAID_ORDERS = value;
      const out = await post(BASKET);
      expect(out.code).toBe(503);
      expect(out.body.error).toMatch(/does not take payment/);
      expect(adminDb).not.toHaveBeenCalled();
    },
  );

  // Deliberately lenient about surrounding whitespace and case: a value typed
  // into a dashboard field arrives as "TRUE" or "true " often enough that
  // treating those as "off" would be a confusing way to fail.
  it.each(['true', 'TRUE', ' true ', 'True'])(
    'opens for ALLOW_UNPAID_ORDERS=%j',
    async (value) => {
      process.env.ALLOW_UNPAID_ORDERS = value;
      adminDb.mockResolvedValue(null);
      await post(BASKET);
      expect(adminDb).toHaveBeenCalled();
    },
  );

  it('opens only when explicitly set to true', async () => {
    process.env.ALLOW_UNPAID_ORDERS = 'true';
    adminDb.mockResolvedValue(null); // past the gate, then unavailable
    const out = await post(BASKET);
    expect(adminDb).toHaveBeenCalled();
    expect(out.body.error).not.toMatch(/does not take payment/);
  });
});
