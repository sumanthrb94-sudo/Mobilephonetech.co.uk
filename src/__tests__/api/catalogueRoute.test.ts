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
const { default: productsHandler } = await import('../../../api/_routes/products.js');

/** GET /api/products, the paginated list, which serves the same documents. */
async function getProducts() {
  const out: { code: number; body: any } = { code: 0, body: null };
  const res: any = {
    setHeader: () => res,
    status: (c: number) => { out.code = c; return res; },
    json: (b: unknown) => { out.body = b; return res; },
  };
  await productsHandler({ method: 'GET', headers: {}, query: {} }, res);
  return out;
}

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

    // Browsers always revalidate, so a staff price change is never shown
    // stale from a shopper's own cache; only Vercel's edge holds a copy, and
    // briefly.
    expect(out.headers['Cache-Control']).toBe('no-cache');
    const edge = String(out.headers['Vercel-CDN-Cache-Control']);
    expect(Number(edge.match(/s-maxage=(\d+)/)?.[1])).toBeLessThanOrEqual(30);
    expect(Number(edge.match(/stale-while-revalidate=(\d+)/)?.[1] ?? 0)).toBeLessThanOrEqual(60);
    expect(edge).toMatch(/stale-while-revalidate/);
  });

  it('never serves a cost, supplier, IMEI or unit ledger left on a legacy document', async () => {
    docs = [{
      id: 'legacy',
      data: {
        model: 'iPhone 15', brand: 'Apple', price: 400, buyPrice: 300, supplier: 'MHL', imei: '350000000000001', sku: 'IP15',
        variants: [{
          id: 'v1', price: 400, originalPrice: 500, stock: 1, buyPrice: 300, supplier: 'MHL', sku: 'S', notes: 'n',
          stockInDate: '2026-09-01', unitHistory: [], inventoryUnits: [{ id: 'u1', imei: '350000000000001', buyPrice: 300, status: 'available' }],
        }],
      },
    }];
    for (const route of [get, getProducts]) {
      const text = JSON.stringify((await route()).body);
      for (const leak of ['buyPrice', 'supplier', 'imei', 'sku', 'notes', 'stockInDate', 'unitHistory', 'inventoryUnits', '350000000000001']) {
        expect(text).not.toContain(leak);
      }
      expect(text).toContain('iPhone 15');
    }
  });

  it('refuses non-GET', async () => {
    const res: any = { setHeader: () => res, status: (c: number) => { res.code = c; return res; }, json: () => res };
    await handler({ method: 'POST', headers: {}, query: {} }, res);
    expect(res.code).toBe(405);
  });
});
