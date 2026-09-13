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

let autoId = 0;
function collection(name: string) {
  store[name] ??= {};
  return {
    // Incidents are appended, not addressed by id.
    add: async (value: Doc) => {
      const id = `auto-${++autoId}`;
      store[name][id] = value;
      return { id };
    },
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
/** Flipped by the test that needs the commit to blow up after capture. */
let commitFails: string | null = null;
async function runTransaction<T>(fn: (tx: {
  get: (ref: any) => Promise<any>;
  update: (ref: any, patch: Doc) => void;
  set: (ref: any, value: Doc) => void;
}) => Promise<T>): Promise<T> {
  if (commitFails) throw new Error(commitFails);
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

/**
 * One client ip per test. The rate limiter is module-level memory shared by
 * every test in this file, so without this the suite starts 429ing itself as
 * soon as it grows past the 12/min ceiling — a failure about test count
 * rather than about the route.
 */
let testIp = 0;

async function post(b: unknown) {
  const { r, out } = res();
  await handler(
    { method: 'POST', body: b, headers: { 'x-forwarded-for': `10.0.${testIp >> 8}.${testIp & 255}` }, socket: {} },
    r,
  );
  return out;
}

beforeEach(() => {
  testIp += 1;
  vi.clearAllMocks();
  caller = { uid: 'u1', email: 'ram@example.com' };
  delete process.env.VITE_PREVIEW_MODE;
  store.products = {
    'apple-iphone-13-128gb': { brand: 'Apple', model: 'iPhone 13', price: 389, stock: 5, grade: 'Good' },
  };
  store.orders = {};
  store.users = {};
  store.payment_incidents = {};
  commitFails = null;
});

const incidents = () => Object.values(store.payment_incidents ?? {});
/**
 * The rows that mean "a human must do something". Every capture now also
 * writes a capture-attempt row so a function killed mid-payment leaves a
 * trace; it is bookkeeping, not an alarm, and is resolved on the way out.
 */
const alarms = () => incidents().filter((i: Doc) => i.kind !== 'capture-attempt');
/** The attempt row for the order under test. */
const attempt = () => store.payment_incidents?.['PP-1'];

describe('POST /api/paypal/capture', () => {
  // £389 + £14.99 next-day, +20% VAT = £484.79. Standard shipping is free,
  // so the default basket (no shippingOptionId) is £389 + 20% = £466.80.
  const TOTAL = 466.8;

  it('writes the order when the captured amount matches the re-priced basket', async () => {
    capturePayPalOrder.mockResolvedValue({
      ok: true, status: 200,
      data: { status: 'COMPLETED', captureStatus: 'COMPLETED', capturedTotal: TOTAL, currency: 'GBP', captureId: 'CAP-1' },
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
      data: { status: 'COMPLETED', captureStatus: 'COMPLETED', capturedTotal: TOTAL - 0.01, currency: 'GBP', captureId: 'CAP-2' },
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
      data: { status: 'COMPLETED', captureStatus: 'COMPLETED', capturedTotal: TOTAL, currency: 'USD', captureId: 'CAP-3' },
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
      data: { status: 'COMPLETED', captureStatus: 'COMPLETED', capturedTotal: TOTAL, currency: 'GBP', captureId: 'CAP-4' },
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
  /**
   * Money we hold with no order behind it must survive the log retention
   * window. On Vercel's Hobby plan runtime logs are gone within the hour, so
   * console.error is not a record of a customer being out of pocket.
   */
  it('writes a durable incident when the refund itself fails', async () => {
    capturePayPalOrder.mockResolvedValue({
      ok: true, status: 200,
      data: { status: 'COMPLETED', captureStatus: 'COMPLETED', capturedTotal: 1.0, currency: 'GBP', captureId: 'CAP-9' },
    });
    refundCapture.mockResolvedValue({ ok: false, status: 502, error: 'PayPal refund failed (422)' });

    const out = await post(body());
    expect(out.code).toBe(409);

    const [incident] = alarms();
    expect(incident).toMatchObject({
      kind: 'refund-failed',
      reason: 'amount-mismatch',
      captureId: 'CAP-9',
      paypalOrderId: 'PP-1',
      resolved: false,
      customerEmail: 'ram@example.com',
    });
    expect(incident.createdAt).toBeTruthy();
  });

  it('records nothing when the refund succeeds — the customer is whole', async () => {
    capturePayPalOrder.mockResolvedValue({
      ok: true, status: 200,
      data: { status: 'COMPLETED', captureStatus: 'COMPLETED', capturedTotal: 1.0, currency: 'GBP', captureId: 'CAP-9' },
    });
    refundCapture.mockResolvedValue({ ok: true, status: 200, data: { status: 'COMPLETED' } });

    expect((await post(body())).code).toBe(409);
    expect(alarms()).toHaveLength(0);
  });

  /**
   * A capture that errors is ambiguous: a timeout on our side looks exactly
   * like a refusal, and PayPal may have taken the money anyway.
   */
  it('records an incident when the capture call itself fails', async () => {
    capturePayPalOrder.mockResolvedValue({
      ok: false, status: 502, error: 'The operation was aborted due to timeout',
    });

    const out = await post(body());
    expect(out.code).toBe(502);
    expect(alarms()).toHaveLength(1);
    expect(alarms()[0]).toMatchObject({ kind: 'capture-failed', paypalOrderId: 'PP-1', resolved: false });
    expect(refundCapture).not.toHaveBeenCalled();
  });

  it('records an incident when the order could not be written and the refund also failed', async () => {
    commitFails = 'firestore is down';
    capturePayPalOrder.mockResolvedValue({
      ok: true, status: 200,
      data: { status: 'COMPLETED', captureStatus: 'COMPLETED', capturedTotal: TOTAL, currency: 'GBP', captureId: 'CAP-7' },
    });
    refundCapture.mockResolvedValue({ ok: false, status: 502, error: 'nope' });

    const out = await post(body());
    expect(out.code).toBe(500);
    expect(alarms()[0]).toMatchObject({
      kind: 'refund-failed', reason: 'commit-failed', captureId: 'CAP-7',
      commitError: 'firestore is down',
    });
  });

  it('leaves no order behind when the money could not be kept', async () => {
    capturePayPalOrder.mockResolvedValue({
      ok: true, status: 200,
      data: { status: 'COMPLETED', captureStatus: 'COMPLETED', capturedTotal: 1.0, currency: 'GBP', captureId: 'CAP-9' },
    });
    refundCapture.mockResolvedValue({ ok: false, status: 502, error: 'nope' });

    await post(body());
    expect(Object.keys(store.orders)).toHaveLength(0);
  });
  // ── The three holes found in the pre-launch review ──────────────

  it('refuses a PENDING capture that PayPal reports as a COMPLETED order', async () => {
    // PayPal marks the ORDER completed as soon as the capture is made, while
    // the capture itself sits PENDING for a bank-funded payment or one held
    // for review. Trusting the order status ships goods against money that
    // may never settle — and no attacker is needed, just an ordinary buyer.
    capturePayPalOrder.mockResolvedValue({
      ok: true, status: 200,
      data: { status: 'COMPLETED', captureStatus: 'PENDING', capturedTotal: TOTAL, currency: 'GBP', captureId: 'CAP-P1' },
    });
    refundCapture.mockResolvedValue({ ok: true, status: 200, data: { status: 'COMPLETED' } });

    const out = await post(body());

    expect(out.code).toBe(409);
    expect(refundCapture).toHaveBeenCalledWith('CAP-P1');
    expect(Object.keys(store.orders)).toHaveLength(0);
    expect(store.products['apple-iphone-13-128gb'].stock).toBe(5);
  });

  it('opens the incident row before capturing, and closes it once the order exists', async () => {
    // The window this covers cannot be provoked from a test — the function
    // being killed between the capture and the write — so what is pinned is
    // the ordering that makes it survivable: unresolved while the money is in
    // flight, resolved only once an order exists behind it.
    let rowDuringCapture: Doc | undefined;
    capturePayPalOrder.mockImplementation(async () => {
      rowDuringCapture = structuredClone(store.payment_incidents?.['PP-1']);
      return {
        ok: true, status: 200,
        data: { status: 'COMPLETED', captureStatus: 'COMPLETED', capturedTotal: TOTAL, currency: 'GBP', captureId: 'CAP-W1' },
      };
    });

    const out = await post(body());

    expect(out.code).toBe(201);
    expect(rowDuringCapture).toMatchObject({ kind: 'capture-attempt', resolved: false });
    expect(attempt()).toMatchObject({ resolved: true, outcome: 'order-created' });
  });

  it('records an alarm, and does not claim a refund, when there is no capture id', async () => {
    // An unparseable capture is the case most likely to strand real money, and
    // it used to be the one case that recorded nothing while telling the
    // customer they had not been charged.
    capturePayPalOrder.mockResolvedValue({
      ok: true, status: 200,
      data: { status: 'COMPLETED', captureStatus: 'COMPLETED', capturedTotal: NaN, currency: '', captureId: null },
    });

    const out = await post(body());

    expect(out.code).toBe(409);
    expect(refundCapture).not.toHaveBeenCalled();
    expect(alarms()[0]).toMatchObject({ kind: 'refund-failed', reason: 'amount-mismatch', captureId: null });
    expect(out.body.error).not.toContain('You have not been charged');
  });
});
