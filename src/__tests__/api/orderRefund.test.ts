import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Refunding is the only admin action that moves real money, and it moves it
 * outward. These tests are about the two orderings that matter: the money must
 * go back before the books are touched, and nothing may be refunded twice.
 */

const refundCapture = vi.fn();
const lookupCaptureId = vi.fn();
vi.mock('../../../api/_paypal.js', () => ({
  paypalConfigured: () => true,
  refundCapture: (...a: unknown[]) => refundCapture(...a),
  lookupCaptureId: (...a: unknown[]) => lookupCaptureId(...a),
}));

type Doc = Record<string, any>;
const store: Record<string, Record<string, Doc>> = {};

let autoId = 0;
function collection(name: string) {
  store[name] ??= {};
  return {
    add: async (value: Doc) => { store[name][`auto-${++autoId}`] = value; return { id: `auto-${autoId}` }; },
    doc: (id: string) => ({
      id,
      collectionName: name,
      get: async () => ({
        exists: id in store[name],
        data: () => (id in store[name] ? structuredClone(store[name][id]) : undefined),
      }),
    }),
  };
}

/** Flipped by the test that needs the books to fail after the money moved. */
let transactionFails: string | null = null;
async function runTransaction<T>(fn: (tx: any) => Promise<T>): Promise<T> {
  if (transactionFails) throw new Error(transactionFails);
  return fn({
    get: async (ref: any) => ref.get(),
    update: (ref: any, patch: Doc) => {
      store[ref.collectionName][ref.id] = { ...(store[ref.collectionName]?.[ref.id] ?? {}), ...patch };
    },
    set: (ref: any, value: Doc, opts?: { merge?: boolean }) => {
      store[ref.collectionName] ??= {};
      store[ref.collectionName][ref.id] = opts?.merge
        ? { ...(store[ref.collectionName][ref.id] ?? {}), ...value }
        : value;
    },
  });
}

let isAdmin = true;
vi.mock('../../../api/_firebaseAdmin.js', () => ({
  adminDb: async () => ({ collection, runTransaction }),
  callerIsAdmin: async () => isAdmin,
}));

const sendEmail = vi.fn(async () => ({ sent: true }));
vi.mock('../../../api/_email.js', async (orig) => {
  const actual = await orig<typeof import('../../../api/_email.js')>();
  return { ...actual, sendEmail: (...a: unknown[]) => sendEmail(...(a as [])) };
});

const { default: handler } = await import('../../../api/_routes/order-refund.js');

let testIp = 0;
async function post(body: unknown) {
  const out: { code: number; body: any } = { code: 0, body: null };
  const r: any = {
    setHeader: () => r,
    status: (c: number) => { out.code = c; return r; },
    json: (b: unknown) => { out.body = b; return r; },
  };
  await handler(
    { method: 'POST', body, headers: { 'x-forwarded-for': `10.1.0.${testIp}` }, socket: {} },
    r,
  );
  return out;
}

const incidents = () => Object.values(store.payment_incidents ?? {});
const order = () => store.orders['ORD-1'];
const stock = () => store.products['p1'].stock;

beforeEach(() => {
  testIp += 1;
  vi.clearAllMocks();
  isAdmin = true;
  transactionFails = null;
  refundCapture.mockResolvedValue({ ok: true, status: 200, data: { status: 'COMPLETED' } });
  store.products = { p1: { brand: 'Apple', model: 'iPhone 13', price: 389, stock: 4 } };
  store.orders = {
    'ORD-1': {
      id: 'ORD-1', status: 'pending', total: 466.8, currency: 'GBP',
      contactEmail: 'ram@example.com', captureId: 'CAP-1', paypalOrderId: 'PP-1',
      shippingAddress: { fullName: 'Ram Bolla' },
      items: [{ productId: 'p1', quantity: 2 }],
    },
  };
  store.payment_incidents = {};
});

describe('POST /api/order-refund', () => {
  it('refuses a caller who is not staff', async () => {
    isAdmin = false;
    const out = await post({ orderId: 'ORD-1' });
    expect(out.code).toBe(403);
    expect(refundCapture).not.toHaveBeenCalled();
  });

  it('refunds, restocks and marks the order refunded', async () => {
    const out = await post({ orderId: 'ORD-1' });

    expect(out.code).toBe(200);
    expect(refundCapture).toHaveBeenCalledWith('CAP-1');
    expect(order().status).toBe('refunded');
    expect(order().refundedAmount).toBe(466.8);
    expect(stock()).toBe(6); // 4 back to 6 — the two units returned
    expect(sendEmail).toHaveBeenCalledTimes(1);
  });

  it('will not refund the same order twice', async () => {
    store.orders['ORD-1'].status = 'refunded';
    const out = await post({ orderId: 'ORD-1' });

    expect(out.code).toBe(409);
    expect(refundCapture).not.toHaveBeenCalled();
    expect(stock()).toBe(4); // no phantom stock invented
  });

  it('leaves the order and the stock alone when PayPal refuses the refund', async () => {
    refundCapture.mockResolvedValue({ ok: false, status: 502, error: 'PayPal refund failed (422)' });

    const out = await post({ orderId: 'ORD-1' });

    expect(out.code).toBe(502);
    expect(order().status).toBe('pending');
    expect(stock()).toBe(4);
    expect(incidents()[0]).toMatchObject({ kind: 'admin-refund-failed', orderId: 'ORD-1' });
  });

  it('looks the capture up for an order saved before capture ids were stored', async () => {
    delete store.orders['ORD-1'].captureId;
    lookupCaptureId.mockResolvedValue({ ok: true, status: 200, data: 'CAP-LEGACY' });

    const out = await post({ orderId: 'ORD-1' });

    expect(out.code).toBe(200);
    expect(lookupCaptureId).toHaveBeenCalledWith('PP-1');
    expect(refundCapture).toHaveBeenCalledWith('CAP-LEGACY');
    expect(order().status).toBe('refunded');
  });

  it('records an incident when the money went back but the books did not move', async () => {
    // The worst survivable outcome: PayPal has paid the customer, our order
    // still reads paid and the stock is still off sale. It must never be
    // silent, and it must never tell staff to try again.
    transactionFails = 'firestore is down';

    const out = await post({ orderId: 'ORD-1' });

    expect(out.code).toBe(500);
    expect(refundCapture).toHaveBeenCalledWith('CAP-1');
    expect(incidents()[0]).toMatchObject({
      kind: 'refund-restock-failed', orderId: 'ORD-1', refunded: true,
    });
    expect(out.body.error).toContain('do not refund again');
  });
});
