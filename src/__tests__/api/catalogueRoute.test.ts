import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * GET /api/catalogue.
 *
 * The property that matters: this is what makes the catalogue affordable to
 * serve at all on the Spark plan (see the file's own header comment) — every
 * response must carry a CDN cache directive, or routing the fetch through
 * here instead of straight to Firestore buys nothing.
 */

let docs: { id: string; data: Record<string, unknown> }[] = [];
vi.mock('../../../api/_firebaseAdmin.js', () => ({
  adminDb: async () => ({
    collection: () => ({
      limit: () => ({
        get: async () => ({ docs: docs.map(d => ({ id: d.id, data: () => d.data })) }),
      }),
    }),
  }),
}));

vi.mock('../../../api/_rateLimit.js', () => ({ enforceRateLimit: () => true }));

const { default: handler } = await import('../../../api/_routes/catalogue.js');

async function get() {
  const out: { code: number; body: any; headers: Record<string, string> } = { code: 0, body: null, headers: {} };
  const res: any = {
    setHeader: (k: string, v: string) => { out.headers[k] = v; return res; },
    status: (c: number) => { out.code = c; return res; },
    json: (b: unknown) => { out.body = b; return res; },
  };
  await handler({ method: 'GET', headers: {}, query: {} }, res);
  return out;
}

beforeEach(() => {
  docs = [
    { id: 'older', data: { model: 'A', brand: 'Apple', price: 1, updatedAt: '2026-01-01T00:00:00.000Z' } },
    { id: 'newest', data: { model: 'B', brand: 'Apple', price: 2, createdAt: '2026-09-01T00:00:00.000Z' } },
  ];
});

describe('GET /api/catalogue', () => {
  it('returns the mapped products, newest first', async () => {
    const out = await get();

    expect(out.code).toBe(200);
    expect(out.body.products.map((p: { id: string }) => p.id)).toEqual(['newest', 'older']);
  });

  it('carries a CDN cache directive — the whole reason this endpoint exists', async () => {
    const out = await get();

    expect(out.headers['Cache-Control']).toMatch(/s-maxage=\d+/);
    expect(out.headers['Cache-Control']).toMatch(/stale-while-revalidate/);
  });

  it('refuses non-GET', async () => {
    const res: any = { setHeader: () => res, status: (c: number) => { res.code = c; return res; }, json: () => res };
    await handler({ method: 'POST', headers: {}, query: {} }, res);
    expect(res.code).toBe(405);
  });
});
