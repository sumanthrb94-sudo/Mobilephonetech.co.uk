import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * The PayPal capture route is where money meets fulfilment, so the tests are
 * about the branches that must never leak: a captured amount that does not
 * match the re-priced basket, and stock that vanished after payment. Both must
 * refund and refuse — there is no path that keeps a customer's money without
 * giving them an order.
 *
 * _paypal is mocked so no network is touched; the assertions are on what the
 * route does with each capture result, and whether it refunds.
 */

// ── Mocked PayPal SDK ──────────────────────────────────────────
const capturePayPalOrder = vi.fn();
const refundCapture = vi.fn();
vi.mock('../../../api/_paypal.js', () => ({
  paypalConfigured: () => true,
  capturePayPalOrder: (...a: unknown[]) => capturePayPalOrder(...a),
  refundCapture: (...a: unknown[]) => refundCapture(...a),
  paypalEnv: () => 'sandbox',
}));

// ── In-memory Firestore ────────────────────────────────────────
type Doc = Record<string, any>;
const store: Record<string, Record<string, Doc>> = {};

function collection(name: string) {
  store[name] ??= {};
  return {
    doc: (id: string) => ({
      id,
      collectionName: name,
      get: async () => ({
        exists: id in store[name],
        data: () => (id in store[name] ? structuredClone(store[name][id]) : undefined),
      }),
      set: async (value: Doc, opts?: { merge?: boolean }) => {
        store[name][id] = opts?.merge ? { ...(store[name][id] ?? {}), ...value } : value;
      },
    }),
  };
}
async function runTransaction<T>(fn: (tx: {
  get: (ref: any) => Promise<any>;
  update: (ref: any, patch: Doc) => void;
  set: (ref: any, value: Doc) => void;
}) => Promise<T>): Promise<T> {
  return fn({
    get: async (ref: any) => ref.get(),
    update: (ref: any, patch: Doc) => { store[ref.collectionName][ref.id] = { ...(store[ref.collectionName]?.[ref.id] ?? {}), ...patch }; },
    set: (ref: any, value: Doc) => { store[ref.collectionName] ??= {}; store[ref.collectionName][ref.id] = value; },
  });
}

let caller: { uid: string; email: string } | null = { uid: 'u1', email: 'ram@example.com' };
vi.mock('../../../api/_firebaseAdmin.js', () => ({
  adminDb: async () => ({ collection, runTransaction }),
  verifyCaller: async () => caller,
}));

vi.mock('../../../api/_email.js', async (orig) => {
  const actual = await orig<typeof import('../../../api/_email.js')>();
  return { ...actual, sendEmail: async () => ({ sent: true }) };
});

const { default: handler } = await import('../../../api/_routes/paypal/capture.js');

function res() {
  const out: { code: number; body: any } = { code: 0, body: null };
  const r: any = {
    setHeader: () => r,
    status: (c: number) => { out.code = c; return r; },
    json: (b: unknown) => { out.body = b; return r; },
  };
  return { r, out };
}

const ADDRESS = {
  fullName: 'Ram Bolla', email: 'ram@example.com', phone: '07700 900123',
  addressLine1: '14 Camden Road', city: 'London', postalCode: 'NW1 9XF', country: 'UK',
};

function body(extra: Record<string, unknown> = {}) {
  return {
    paypalOrderId: 'PP-1',
    items: [{ productId: 'apple-iphone-13-128gb', quantity: 1 }],
    shippingAddress: ADDRESS,
    ...extra,
  };
}

async function post(b: unknown) {
  const { r, out } = res();
  await handler({ method: 'POST', body: b, headers: {}, socket: {} }, r);
  return out;
}

beforeEach(() => {
  vi.clearAllMocks();
  caller = { uid: 'u1', email: 'ram@example.com' };
  delete process.env.VITE_PREVIEW_MODE;
  store.products = {
    'apple-iphone-13-128gb': { brand: 'Apple', model: 'iPhone 13', price: 389, stock: 5, grade: 'Good' },
  };
  store.orders = {};
  store.users = {};
});

describe('POST /api/paypal/capture', () => {
  // £389 + £14.99 next-day, +20% VAT = £484.79. Standard shipping is free,
  // so the default basket (no shippingOptionId) is £389 + 20% = £466.80.
  const TOTAL = 466.8;

  it('writes the order when the captured amount matches the re-priced basket', async () => {
    capturePayPalOrder.mockResolvedValue({
      ok: true, status: 200,
      data: { status: 'COMPLETED', capturedTotal: TOTAL, currency: 'GBP', captureId: 'CAP-1' },
    });

    const out = await post(body());

    expect(out.code).toBe(201);
    expect(out.body.order.total).toBe(TOTAL);
    expect(out.body.order.paymentMethod).toBe('PayPal');
    expect(refundCapture).not.toHaveBeenCalled();
    // Stock reserved, order stored.
    expect(store.products['apple-iphone-13-128gb'].stock).toBe(4);
    expect(Object.keys(store.orders)).toHaveLength(1);
  });

  it('refunds and refuses when the captured amount is wrong', async () => {
    // A penny short — a tampered client, a stale approval, anything.
    capturePayPalOrder.mockResolvedValue({
      ok: true, status: 200,
      data: { status: 'COMPLETED', capturedTotal: TOTAL - 0.01, currency: 'GBP', captureId: 'CAP-2' },
    });
    refundCapture.mockResolvedValue({ ok: true, status: 200, data: { status: 'COMPLETED' } });

    const out = await post(body());

    expect(out.code).toBe(409);
    expect(refundCapture).toHaveBeenCalledWith('CAP-2');
    // Nothing fulfilled: no order, no stock movement.
    expect(Object.keys(store.orders)).toHaveLength(0);
    expect(store.products['apple-iphone-13-128gb'].stock).toBe(5);
  });

  it('refunds when a wrong currency comes back, even at the right number', async () => {
    capturePayPalOrder.mockResolvedValue({
      ok: true, status: 200,
      data: { status: 'COMPLETED', capturedTotal: TOTAL, currency: 'USD', captureId: 'CAP-3' },
    });
    refundCapture.mockResolvedValue({ ok: true, status: 200, data: { status: 'COMPLETED' } });

    const out = await post(body());

    expect(out.code).toBe(409);
    expect(refundCapture).toHaveBeenCalledWith('CAP-3');
  });

  it('refunds when stock ran out between approval and capture', async () => {
    store.products['apple-iphone-13-128gb'].stock = 0;
    capturePayPalOrder.mockResolvedValue({
      ok: true, status: 200,
      data: { status: 'COMPLETED', capturedTotal: TOTAL, currency: 'GBP', captureId: 'CAP-4' },
    });
    refundCapture.mockResolvedValue({ ok: true, status: 200, data: { status: 'COMPLETED' } });

    const out = await post(body());

    // Priced-out baskets are refused at pricing (409) before capture; a basket
    // that priced then lost its stock is refunded after capture. Either way,
    // no order and the customer is not left charged.
    expect(out.code).toBe(409);
    expect(Object.keys(store.orders)).toHaveLength(0);
  });

  it('refuses before charging when preview mode is on', async () => {
    process.env.VITE_PREVIEW_MODE = 'true';
    const out = await post(body());
    expect(out.code).toBe(503);
    expect(capturePayPalOrder).not.toHaveBeenCalled();
  });

  it('rejects a request with no PayPal order id', async () => {
    const out = await post(body({ paypalOrderId: '' }));
    expect(out.code).toBe(400);
    expect(capturePayPalOrder).not.toHaveBeenCalled();
  });
});
