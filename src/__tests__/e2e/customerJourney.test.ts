import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';

/**
 * The whole customer journey, in order, through the real route handlers.
 *
 * This exists because every individual piece was already covered and the
 * journey still did not work. The unit tests mock sendEmail and assert it was
 * called; they cannot see that the browser never calls the route, that the
 * recipient is read from the wrong field, or that the send is attempted with a
 * sender the provider will refuse. So this walks signup → welcome → order →
 * confirmation → dispatch → doorstep with the actual handlers, an in-memory
 * Firestore, and a fake Brevo that records exactly what would have gone over
 * the wire.
 *
 * Everything below the HTTP boundary is real: _email.ts builds the payload,
 * _templates.ts renders the HTML, orders.ts prices the basket from the
 * catalogue. The only stubs are the database and the network.
 */

// ── In-memory Firestore ────────────────────────────────────────
type Doc = Record<string, unknown>;
const store: Record<string, Record<string, Doc>> = {};

function collection(name: string) {
  store[name] ??= {};
  return {
    doc: (id: string) => ({
      id,
      get: async () => ({ exists: id in store[name], data: () => store[name][id] }),
      set: async (value: Doc, opts?: { merge?: boolean }) => {
        store[name][id] = opts?.merge ? { ...(store[name][id] ?? {}), ...value } : value;
      },
    }),
  };
}

const caller = { uid: 'u_ram', email: 'ram@example.com', name: 'Ram' };
let isAdmin = false;

vi.mock('../../../api/_firebaseAdmin.js', () => ({
  adminDb: async () => ({ collection }),
  adminAuth: async () => null,
  verifyCaller: async () => caller,
  callerIsAdmin: async () => isAdmin,
  getAdminInitError: () => null,
}));

// ── Fake Brevo ─────────────────────────────────────────────────
interface Sent {
  sender: { email: string; name: string };
  to: Array<{ email: string; name?: string }>;
  subject: string;
  htmlContent: string;
  textContent: string;
  tags?: string[];
}
const sent: Sent[] = [];

beforeAll(() => {
  process.env.BREVO_API_KEY = 'xkeysib-test';
  process.env.EMAIL_FROM = 'orders@lehart.co.uk';
  process.env.EMAIL_FROM_NAME = 'LeHart';
  process.env.PUBLIC_SITE_URL = 'https://lehart.co.uk';

  vi.stubGlobal('fetch', vi.fn(async (url: string, init: { body: string }) => {
    if (String(url).includes('api.brevo.com/v3/smtp/email')) {
      sent.push(JSON.parse(init.body) as Sent);
      return { ok: true, status: 201, json: async () => ({ messageId: `m${sent.length}` }), text: async () => '' };
    }
    throw new Error(`unexpected network call to ${url}`);
  }));
});

const res = () => {
  const out: { code: number; body: any } = { code: 0, body: null };
  const r = {
    setHeader: () => r,
    status: (c: number) => { out.code = c; return r; },
    json: (b: unknown) => { out.body = b; return r; },
  };
  return { r, out };
};

// Literal specifiers, for the same reason api/[...route].ts uses them: a
// bundler can only resolve an import it can read statically.
const ROUTES = {
  'account-welcome': () => import('../../../api/_routes/account-welcome.js'),
  orders: () => import('../../../api/_routes/orders.js'),
  'order-notify': () => import('../../../api/_routes/order-notify.js'),
} as const;

const post = async (route: keyof typeof ROUTES, body: unknown) => {
  const { default: handler } = await ROUTES[route]();
  const { r, out } = res();
  await handler({ method: 'POST', body, headers: { authorization: 'Bearer t' }, socket: {} }, r);
  return out;
};

// A real catalogue row, priced by the server and never by the browser.
const PRODUCT = {
  brand: 'Apple',
  model: 'iPhone 13 128GB',
  price: 389,
  originalPrice: 599,
  stock: 4,
  grade: 'Excellent',
  imageUrl: '/assets/iphone-13.png',
};

const ADDRESS = {
  fullName: 'Ram Bolla',
  email: 'ram@example.com',
  phone: '07700 900123',
  addressLine1: 'Flat 2, 14 Camden Road',
  city: 'London',
  postalCode: 'NW1 9XF',
  country: 'United Kingdom',
};

beforeEach(async () => {
  const { resetRateLimits } = await import('../../../api/_rateLimit.js');
  resetRateLimits();
});

describe('the whole journey, in order', () => {
  let orderId = '';

  beforeAll(() => {
    sent.length = 0;
    for (const k of Object.keys(store)) delete store[k];
    store.products = { 'apple-iphone-13-128gb': { ...PRODUCT } };
    isAdmin = false;
  });

  it('1. signing up sends the LeHart welcome, not just Firebase\'s verification link', async () => {
    const out = await post('account-welcome', { name: 'Ram' });

    expect(out.code).toBe(200);
    expect(out.body.sent).toBe(true);
    expect(sent).toHaveLength(1);

    const mail = sent[0];
    // The recipient comes from the verified token, never the body.
    expect(mail.to[0].email).toBe('ram@example.com');
    expect(mail.tags).toContain('account-welcome');
    expect(mail.htmlContent).toContain('Ram');
  });

  it('2. signing up twice does not send it twice', async () => {
    const out = await post('account-welcome', { name: 'Ram' });

    expect(out.code).toBe(200);
    expect(out.body.skipped).toMatch(/already sent/i);
    expect(sent).toHaveLength(1);
  });

  it('3. placing an order prices it from the catalogue and confirms it by email', async () => {
    const out = await post('orders', {
      // The browser offers a price of £1. It must be ignored entirely.
      items: [{ productId: 'apple-iphone-13-128gb', quantity: 1, price: 1 }],
      shippingAddress: ADDRESS,
      shippingOptionId: 'nextday',
    });

    expect(out.code).toBe(201);
    orderId = out.body.order.id;

    // £389 + £14.99 shipping, then 20% VAT on the lot.
    expect(out.body.order.subtotal).toBe(389);
    expect(out.body.order.shippingCost).toBe(14.99);
    expect(out.body.order.total).toBe(484.79);
    expect(out.body.order.status).toBe('pending');
    expect(out.body.confirmationEmail.sent).toBe(true);

    expect(sent).toHaveLength(2);
    const mail = sent[1];
    expect(mail.to[0].email).toBe('ram@example.com');
    expect(mail.tags).toContain('order-confirmation');
    expect(mail.subject).toContain(orderId);
  });

  it('4. the confirmation leads with the same arrival date checkout quoted', async () => {
    const { estimateArrival } = await import('../../../api/_deliveryEstimate.js');
    const arrival = estimateArrival({ postcode: 'NW1 9XF', shippingMethod: 'Next Day Delivery' });

    // Two estimators that drifted apart would promise Thursday on screen and
    // Friday in the inbox, which arrives at support as a broken promise.
    expect(arrival).not.toBeNull();
    expect(sent[1].htmlContent).toContain(arrival!.label);
  });

  it('5. dispatching it tells the customer, with the tracking link', async () => {
    isAdmin = true;
    const out = await post('order-notify', {
      orderId,
      kind: 'dispatched',
      courier: 'Royal Mail',
      trackingNumber: 'RM123456789GB',
      trackingUrl: 'https://www.royalmail.com/track/RM123456789GB',
    });

    expect(out.code).toBe(200);
    expect(store.orders[orderId].status).toBe('dispatched');

    expect(sent).toHaveLength(3);
    expect(sent[2].tags).toContain('order-dispatched');
    expect(sent[2].htmlContent).toContain('RM123456789GB');
    expect(sent[2].htmlContent).toContain('royalmail.com');
  });

  it('6. out for delivery is its own message', async () => {
    const out = await post('order-notify', { orderId, kind: 'out-for-delivery', courier: 'Royal Mail' });

    expect(out.code).toBe(200);
    expect(store.orders[orderId].status).toBe('out-for-delivery');
    expect(sent).toHaveLength(4);
    expect(sent[3].tags).toContain('order-out-for-delivery');
  });

  it('7. a customer cannot declare their own order dispatched', async () => {
    isAdmin = false;
    const out = await post('order-notify', { orderId, kind: 'dispatched' });

    expect(out.code).toBe(403);
    expect(sent).toHaveLength(4);
  });
});

describe('every message in the journey', () => {
  it('goes to the customer, from the configured sender, with a plain-text part', () => {
    expect(sent).toHaveLength(4);

    for (const mail of sent) {
      expect(mail.to[0].email).toBe('ram@example.com');
      expect(mail.sender.email).toBe('orders@lehart.co.uk');
      expect(mail.sender.name).toBe('LeHart');
      // HTML-only mail scores worse with spam filters and is unreadable in
      // text-only clients. Every send must carry both parts.
      expect(mail.textContent.trim().length).toBeGreaterThan(40);
      expect(mail.subject.trim().length).toBeGreaterThan(0);
      expect(mail.htmlContent).toContain('<table');
    }
  });

  it('links to the real site rather than a placeholder domain', () => {
    for (const mail of sent) {
      expect(mail.htmlContent).not.toContain('example.com/');
      expect(mail.htmlContent).not.toContain('localhost');
    }
  });
});
