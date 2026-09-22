import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * POST /api/cloudinary-sign.
 *
 * Two things matter here. The signature has to be byte-for-byte what
 * Cloudinary expects, or every upload is rejected — checked against their
 * own published worked example, since the alternative is finding out in
 * production. And the folder has to be decided here rather than by the
 * caller, or a customer could post their photo into the product catalogue.
 */

let admin = false;
let callerUid: string | null = 'u1';
vi.mock('../../../api/_firebaseAdmin.js', () => ({
  callerIsAdmin: async () => admin,
  verifyCaller: async () => (callerUid ? { uid: callerUid } : null),
}));
vi.mock('../../../api/_rateLimit.js', () => ({ enforceRateLimit: () => true }));

process.env.CLOUDINARY_CLOUD_NAME = 'demo-cloud';
process.env.CLOUDINARY_API_KEY = '1234';
process.env.CLOUDINARY_API_SECRET = 'test-secret';

const mod = await import('../../../api/_routes/cloudinary-sign.js');
const handler = mod.default;
const { signUploadParams } = mod;

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

beforeEach(() => { admin = false; callerUid = 'u1'; });

describe('signUploadParams', () => {
  /**
   * Cloudinary's documented example: secret "abcd", signing
   * "public_id=sample_image&timestamp=1315060510" must produce this digest.
   * If this test fails, every upload would be refused by Cloudinary.
   */
  it('reproduces Cloudinary\'s published worked example', () => {
    expect(signUploadParams({ public_id: 'sample_image', timestamp: 1315060510 }, 'abcd'))
      .toBe('b4ad47fb4e25c7bf5f92a20089f9db59bc302313');
  });

  it('sorts parameters by name, not by insertion order', () => {
    const a = signUploadParams({ timestamp: 1315060510, public_id: 'sample_image' }, 'abcd');
    const b = signUploadParams({ public_id: 'sample_image', timestamp: 1315060510 }, 'abcd');
    expect(a).toBe(b);
  });
});

describe('POST /api/cloudinary-sign', () => {
  it('refuses product artwork from someone who is not staff', async () => {
    admin = false;
    expect((await post({ kind: 'product', id: 'iphone-15' })).code).toBe(403);
  });

  it('signs product artwork for staff, into that product\'s folder', async () => {
    admin = true;
    const out = await post({ kind: 'product', id: 'iphone-15' });

    expect(out.code).toBe(200);
    expect(out.body.folder).toBe('lehart/product-images/iphone-15');
    expect(out.body.signature).toBe(
      signUploadParams({ folder: out.body.folder, timestamp: out.body.timestamp }, 'test-secret'),
    );
    // The secret itself is never part of the response.
    expect(JSON.stringify(out.body)).not.toContain('test-secret');
  });

  it('files a review photo under the caller\'s own uid, not one they sent', async () => {
    callerUid = 'real-user';
    const out = await post({ kind: 'review', id: '../../lehart/product-images' });

    expect(out.code).toBe(200);
    expect(out.body.folder).toBe('lehart/review-photos/real-user');
  });

  it('refuses a review photo from someone not signed in', async () => {
    callerUid = null;
    expect((await post({ kind: 'review' })).code).toBe(401);
  });

  it('strips path traversal out of an id', async () => {
    admin = true;
    const out = await post({ kind: 'banner', id: '../../../etc/passwd' });

    expect(out.code).toBe(200);
    expect(out.body.folder).not.toContain('..');
    expect(out.body.folder.startsWith('lehart/banner-images/')).toBe(true);
  });

  it('rejects an unknown kind', async () => {
    admin = true;
    expect((await post({ kind: 'anything-else' })).code).toBe(400);
  });
});
