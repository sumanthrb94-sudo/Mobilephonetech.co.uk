import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('../../lib/firebase', () => ({ auth: { currentUser: { getIdToken: async () => 'token' } } }));
import { uploadViaCloudinary } from '../../lib/cloudinary';

/**
 * Production has no Firebase Storage bucket. An upload that failed at
 * Cloudinary used to fall back to Storage and spin for ten minutes with the
 * real reason hidden. These pin down that every failure now says why, and
 * only "not configured" hands over to another uploader.
 */

const photo = () => new File([new Uint8Array(10)], 'p.webp', { type: 'image/webp' });
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const SIGNED = { cloudName: 'c', apiKey: 'k', timestamp: 1, signature: 's', folder: 'f' };

afterEach(() => vi.unstubAllGlobals());

describe('uploading a photo through Cloudinary', () => {
  it('hands over to the other uploader only when Cloudinary is not set up', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json(503, { error: 'Cloudinary is not configured' })));
    await expect(uploadViaCloudinary('product', photo(), 'x')).resolves.toBeNull();
  });

  it('says so when the server cannot be reached, instead of falling back', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch'); }));
    await expect(uploadViaCloudinary('product', photo(), 'x')).rejects.toThrow(/could not reach the server/i);
  });

  it('says so when the server takes too long', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new DOMException('timed out', 'TimeoutError'); }));
    await expect(uploadViaCloudinary('product', photo(), 'x')).rejects.toThrow(/took too long/i);
  });

  it("passes on Cloudinary's own reason when it refuses the file", async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(json(200, SIGNED))
      .mockResolvedValueOnce(json(401, { error: { message: 'Invalid Signature abc' } })));
    await expect(uploadViaCloudinary('product', photo(), 'x')).rejects.toThrow('Cloudinary refused the upload: Invalid Signature abc');
  });

  it('passes on a refusal from the signing route', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json(403, { error: 'Staff only' })));
    await expect(uploadViaCloudinary('product', photo(), 'x')).rejects.toThrow('Staff only');
  });

  it('returns the optimised delivery URL when it works', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(json(200, SIGNED))
      .mockResolvedValueOnce(json(200, { secure_url: 'https://res.cloudinary.com/c/image/upload/v1/f/p.webp' })));
    await expect(uploadViaCloudinary('product', photo(), 'x')).resolves.toBe('https://res.cloudinary.com/c/image/upload/f_auto,q_auto/v1/f/p.webp');
  });
});
