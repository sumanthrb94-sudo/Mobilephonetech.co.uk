import { describe, it, expect, vi, beforeEach } from 'vitest';

const sent: string[] = [];
const updated: string[] = [];
let isAdmin = true;
let stock = 2;
const alerts = [
  { id: 'p__a@x.co', data: { productId: 'p', email: 'a@x.co', variant: '128GB · Black', notifiedAt: null } },
  { id: 'p__b@x.co', data: { productId: 'p', email: 'b@x.co', variant: null, notifiedAt: null } },
];

vi.mock('../../../api/_firebaseAdmin.js', () => ({
  callerIsAdmin: async () => isAdmin,
  adminDb: async () => ({
    collection: (name: string) => ({
      doc: () => ({ get: async () => ({ exists: true, data: () => ({ brand: 'Google', model: 'Pixel 6a', price: 95, stock, listed: true }) }) }),
      where: () => ({
        where: () => ({
          limit: () => ({
            get: async () => ({
              size: alerts.length,
              docs: alerts.map(a => ({ data: () => a.data, ref: { update: async () => { updated.push(a.id); } } })),
            }),
          }),
        }),
      }),
      name,
    }),
  }),
}));
vi.mock('../../../api/_email.js', async (orig) => ({
  ...(await orig<typeof import('../../../api/_email.js')>()),
  sendEmail: async ({ to }: { to: string }) => { sent.push(to); return { sent: true }; },
}));

const { default: handler } = await import('../../../api/_routes/stock-alert-notify');

function call(body: unknown) {
  const out: { code?: number; body?: Record<string, unknown> } = {};
  const res: Record<string, unknown> = {};
  res.setHeader = () => res;
  res.status = (c: number) => { out.code = c; return res; };
  res.json = (b: Record<string, unknown>) => { out.body = b; return res; };
  return handler({ method: 'POST', body, headers: {} }, res).then(() => out);
}

describe('POST /api/stock-alert-notify', () => {
  beforeEach(() => { sent.length = 0; updated.length = 0; isAdmin = true; stock = 2; });

  it('emails everyone waiting and marks them notified', async () => {
    const out = await call({ productId: 'google-pixel-6a-128gb' });
    expect(out.code).toBe(200);
    expect(out.body).toMatchObject({ sent: 2, failed: 0 });
    expect(sent).toEqual(['a@x.co', 'b@x.co']);
    expect(updated).toEqual(['p__a@x.co', 'p__b@x.co']);
  });

  it('is staff only', async () => {
    isAdmin = false;
    expect((await call({ productId: 'google-pixel-6a-128gb' })).code).toBe(403);
    expect(sent).toHaveLength(0);
  });

  it('refuses while the product is still out of stock', async () => {
    stock = 0;
    expect((await call({ productId: 'google-pixel-6a-128gb' })).code).toBe(409);
    expect(sent).toHaveLength(0);
  });
});
