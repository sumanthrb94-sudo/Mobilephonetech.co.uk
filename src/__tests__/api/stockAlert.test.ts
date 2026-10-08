import { describe, it, expect, vi, beforeEach } from 'vitest';

const writes: Array<{ id: string; data: Record<string, unknown> }> = [];
let productExists = true;

vi.mock('../../../api/_firebaseAdmin.js', () => ({
  adminDb: async () => ({
    collection: (name: string) => ({
      doc: (id: string) => ({
        get: async () => ({ exists: name === 'products' ? productExists : false, data: () => ({ listed: true }) }),
        set: async (data: Record<string, unknown>) => { writes.push({ id, data }); },
      }),
    }),
  }),
}));

const { default: handler } = await import('../../../api/_routes/stock-alert');

function call(body: unknown) {
  const out: { code?: number; body?: Record<string, unknown> } = {};
  const res: Record<string, unknown> = {};
  res.setHeader = () => res;
  res.status = (c: number) => { out.code = c; return res; };
  res.json = (b: Record<string, unknown>) => { out.body = b; return res; };
  return handler({ method: 'POST', body, headers: { 'x-forwarded-for': `10.0.0.${Math.floor(Math.random() * 250)}` }, socket: {} }, res).then(() => out);
}

describe('POST /api/stock-alert', () => {
  beforeEach(() => { writes.length = 0; productExists = true; });

  it('saves one request per product and address', async () => {
    const out = await call({ email: ' Sam@Example.com ', productId: 'google-pixel-6a-128gb', variant: '128GB · Chalk' });
    expect(out.code).toBe(200);
    expect(writes[0].id).toBe('google-pixel-6a-128gb__sam@example.com');
    expect(writes[0].data).toMatchObject({ productId: 'google-pixel-6a-128gb', email: 'sam@example.com', variant: '128GB · Chalk', notifiedAt: null });
  });

  it('refuses a bad address or an unknown product', async () => {
    expect((await call({ email: 'nope', productId: 'google-pixel-6a-128gb' })).code).toBe(400);
    expect((await call({ email: 'a@b.co', productId: '../../users' })).code).toBe(400);
    productExists = false;
    expect((await call({ email: 'a@b.co', productId: 'gone-product' })).code).toBe(404);
    expect(writes).toHaveLength(0);
  });
});
