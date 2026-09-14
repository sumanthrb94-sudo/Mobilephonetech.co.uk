import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * POST /api/reviews.
 *
 * The property that matters: nothing is written unless the caller proved they
 * bought the device. This endpoint previously took no authentication at all,
 * so the whole star rating on every product page was whatever anyone chose to
 * type, five times a minute.
 */

let callerUid: string | null = 'u1';
vi.mock('../../../api/_firebaseAdmin.js', () => ({
  adminDb: async () => db,
  verifyCaller: async () => (callerUid ? { uid: callerUid } : null),
}));

vi.mock('../../../api/_rateLimit.js', () => ({ enforceRateLimit: () => true }));

let eligible = { eligible: true, code: 'eligible', reason: 'ok', orderId: 'ORD-1' };
vi.mock('../../../api/_reviewEligibility.js', () => ({
  checkEligibility: async () => eligible,
  REVIEW_WAIT_DAYS: 30,
}));

const added: Record<string, unknown>[] = [];
const db = {
  collection: () => ({
    add: async (v: Record<string, unknown>) => { added.push(v); return { id: 'rev-1' }; },
  }),
};

const { default: handler } = await import('../../../api/_routes/reviews.js');

async function post(body: unknown) {
  const out: { code: number; body: any } = { code: 0, body: null };
  const res: any = {
    setHeader: () => res,
    status: (c: number) => { out.code = c; return res; },
    json: (b: unknown) => { out.body = b; return res; },
  };
  await handler({ method: 'POST', body, headers: {}, query: {} }, res);
  return out;
}

const valid = { productId: 'apple-iphone-15', rating: 5, comment: 'Great', userName: 'Ram' };

beforeEach(() => {
  added.length = 0;
  callerUid = 'u1';
  eligible = { eligible: true, code: 'eligible', reason: 'ok', orderId: 'ORD-1' };
});

describe('POST /api/reviews', () => {
  it('writes a review from a customer who bought the device', async () => {
    const out = await post(valid);

    expect(out.code).toBe(201);
    expect(added).toHaveLength(1);
    expect(added[0]).toMatchObject({ productId: 'apple-iphone-15', rating: 5, userId: 'u1', orderId: 'ORD-1' });
  });

  it('marks it a verified purchase, because the check proved it', async () => {
    await post(valid);
    expect(added[0].isVerified).toBe(true);
  });

  it('answers 401 when signing in would fix it', async () => {
    callerUid = null;
    eligible = { eligible: false, code: 'not-signed-in', reason: 'Sign in to write a review.' } as any;

    const out = await post(valid);

    expect(out.code).toBe(401);
    expect(added).toHaveLength(0);
  });

  it('answers 403 when signing in would not', async () => {
    eligible = { eligible: false, code: 'no-order', reason: 'Reviews are written by customers who bought this device.' } as any;

    const out = await post(valid);

    expect(out.code).toBe(403);
    expect(out.body.code).toBe('no-order');
    expect(added).toHaveLength(0);
  });

  it('writes nothing while the return window is still open', async () => {
    eligible = { eligible: false, code: 'too-soon', reason: 'Reviews open 30 days after delivery.' } as any;

    const out = await post(valid);

    expect(out.code).toBe(403);
    expect(added).toHaveLength(0);
  });

  it('still rejects a malformed rating before it reaches the database', async () => {
    for (const rating of [0, 6, 4.5, 'five', null]) {
      const out = await post({ ...valid, rating });
      expect(out.code, String(rating)).toBe(400);
    }
    expect(added).toHaveLength(0);
  });
});
