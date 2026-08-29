import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * The tracker's job is to count without identifying, and to never be the
 * reason a page fails. Both are tested here, because both are invisible when
 * broken: a stored identifier looks like working analytics, and a failing
 * counter looks like a quiet day.
 */

type Increments = Record<string, unknown>;
const setDoc = vi.fn(async (_v: Increments, _o?: { merge?: boolean }) => undefined);
vi.mock('../../../api/_firebaseAdmin.js', () => ({
  adminDb: async () => ({ collection: () => ({ doc: () => ({ set: setDoc }) }) }),
}));

vi.mock('firebase-admin/firestore', () => ({
  FieldValue: { increment: (n: number) => ({ __increment: n }) },
}));

const res = () => {
  const out: { code: number; body: any } = { code: 0, body: null };
  const r = {
    setHeader: () => r,
    status: (c: number) => { out.code = c; return r; },
    json: (b: unknown) => { out.body = b; return r; },
  };
  return { r, out };
};

const post = async (body: unknown) => {
  const { default: handler } = await import('../../../api/_routes/track.js');
  const { r, out } = res();
  await handler({ method: 'POST', body, headers: {}, socket: {} }, r);
  return out;
};

beforeEach(async () => {
  vi.clearAllMocks();
  const { resetRateLimits } = await import('../../../api/_rateLimit.js');
  resetRateLimits();
});

describe('counting', () => {
  it('increments rather than storing a row per hit', async () => {
    const out = await post({ events: [{ kind: 'page_view', path: '/products' }, { kind: 'page_view', path: '/products' }] });

    expect(out.code).toBe(200);
    expect(out.body.counted).toBe(2);
    const written = setDoc.mock.calls[0][0] as Record<string, any>;
    expect(written['totals.page_view']).toEqual({ __increment: 2 });
  });

  it('groups product and order URLs so the daily document cannot grow forever', async () => {
    // A path map keyed by every URL grows with the catalogue until the
    // document passes Firestore's 1 MB limit and every write starts failing.
    await post({ events: [
      { kind: 'page_view', path: '/product/apple-iphone-12-64gb' },
      { kind: 'page_view', path: '/product/galaxy-a32-5g-64gb' },
    ] });

    const written = setDoc.mock.calls[0][0] as Record<string, any>;
    expect(written['paths._product_*']).toEqual({ __increment: 2 });
  });

  it('counts the product id separately, which is what the grouping loses', async () => {
    await post({ events: [{ kind: 'product_view', productId: 'apple-iphone-12-64gb' }] });

    const written = setDoc.mock.calls[0][0] as Record<string, any>;
    expect(written['products.product_view:apple-iphone-12-64gb']).toEqual({ __increment: 1 });
  });

  it('ignores an event kind it does not know', async () => {
    const out = await post({ events: [{ kind: 'keylog', path: '/' }, { kind: 'page_view', path: '/' }] });
    expect(out.body.counted).toBe(1);
  });

  it('caps how much one call can write', async () => {
    const events = Array.from({ length: 60 }, () => ({ kind: 'page_view', path: '/' }));
    const out = await post({ events });
    expect(out.body.counted).toBeLessThanOrEqual(20);
  });
});

describe('what is deliberately not stored', () => {
  it('keeps nothing from the request that could identify a visitor', async () => {
    await post({
      events: [{ kind: 'page_view', path: '/products' }],
      // A caller offering these must not get them recorded.
      visitorId: 'v-123', email: 'ram@example.com', ip: '1.2.3.4',
    });

    const written = JSON.stringify(setDoc.mock.calls[0][0]);
    expect(written).not.toContain('v-123');
    expect(written).not.toContain('ram@example.com');
    expect(written).not.toContain('1.2.3.4');
  });

  it('strips a search term back to plain text before counting it', async () => {
    await post({ events: [{ kind: 'search', term: '  IPHONE <script>12</script>  ' }] });

    const written = setDoc.mock.calls[0][0] as Record<string, any>;
    const keys = Object.keys(written).filter((k) => k.startsWith('searches.'));
    expect(keys).toHaveLength(1);
    expect(keys[0]).not.toContain('<');
  });
});

describe('never the reason a page fails', () => {
  it('answers 200 when the write fails', async () => {
    setDoc.mockRejectedValueOnce(new Error('firestore down') as never);
    const out = await post({ events: [{ kind: 'page_view', path: '/' }] });

    expect(out.code).toBe(200);
    expect(out.body.skipped).toBeTruthy();
  });

  it('answers 200 for an empty or malformed batch', async () => {
    expect((await post({})).code).toBe(200);
    expect((await post({ events: 'nope' })).code).toBe(200);
  });

  it('refuses anything but POST', async () => {
    const { default: handler } = await import('../../../api/_routes/track.js');
    const { r, out } = res();
    await handler({ method: 'GET', headers: {}, socket: {} }, r);
    expect(out.code).toBe(405);
  });
});
