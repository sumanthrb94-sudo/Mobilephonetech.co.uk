import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resetRateLimits } from '../../../api/_rateLimit.js';

// Mock the Admin SDK wrapper before importing the handler. Mocking our own
// module rather than firebase-admin keeps the stub to the one function the
// route actually uses.
const added: Record<string, unknown>[] = [];
const setDocs: Record<string, unknown>[] = [];

vi.mock('../../../api/_firebaseAdmin.js', () => ({
  adminDb: () => ({
    collection: () => ({
      add: (data: Record<string, unknown>) => {
        added.push(data);
        return Promise.resolve({ id: 'mock-id' });
      },
      doc: () => ({
        set: (data: Record<string, unknown>) => {
          setDocs.push(data);
          return Promise.resolve();
        },
      }),
    }),
  }),
  adminAuth: () => null,
  getAdminInitError: () => null,
  verifyCaller: () => Promise.resolve(null),
  callerIsAdmin: () => Promise.resolve(false),
}));

const { default: handler } = await import('../../../api/trade-in');

function req(method: string, body: unknown = {}) {
  return { method, body };
}
function res() {
  let _code = 200;
  let _body: unknown = null;
  return {
    get statusCode() { return _code; },
    get body() { return _body; },
    status(code: number) { _code = code; return this; },
    json(data: unknown) { _body = data; return this; },
    setHeader() { return this; },
  };
}

const VALID_BODY = {
  brand: 'Apple',
  model: 'iPhone 17 Pro Max',
  condition: 'Excellent',
  email: 'user@example.com',
};

describe('POST /api/trade-in', () => {
  // Every test is one fake client, which trips the per-IP limiter across a
  // file — reset between tests so each starts from a clean window.
  beforeEach(() => resetRateLimits());

  it('returns 405 for GET requests', async () => {
    const r = res();
    await handler(req('GET'), r);
    expect(r.statusCode).toBe(405);
  });

  it('returns 400 when brand is missing', async () => {
    const r = res();
    await handler(req('POST', { ...VALID_BODY, brand: undefined }), r);
    expect(r.statusCode).toBe(400);
    expect((r.body as any).error).toContain('brand');
  });

  it('returns 400 when model is missing', async () => {
    const r = res();
    await handler(req('POST', { ...VALID_BODY, model: undefined }), r);
    expect(r.statusCode).toBe(400);
  });

  it('returns 400 when condition is missing', async () => {
    const r = res();
    await handler(req('POST', { ...VALID_BODY, condition: undefined }), r);
    expect(r.statusCode).toBe(400);
  });

  it('returns 400 when email is missing', async () => {
    const r = res();
    await handler(req('POST', { ...VALID_BODY, email: undefined }), r);
    expect(r.statusCode).toBe(400);
  });

  it('returns 400 for invalid condition value', async () => {
    const r = res();
    await handler(req('POST', { ...VALID_BODY, condition: 'Broken' }), r);
    expect(r.statusCode).toBe(400);
    expect((r.body as any).error).toContain('condition');
  });

  it('returns 400 for invalid email format', async () => {
    const r = res();
    await handler(req('POST', { ...VALID_BODY, email: 'bademail' }), r);
    expect(r.statusCode).toBe(400);
    expect((r.body as any).error).toContain('email');
  });

  it('returns 201 with quote data for valid Apple submission', async () => {
    const r = res();
    await handler(req('POST', VALID_BODY), r);
    expect(r.statusCode).toBe(201);
    const body = r.body as any;
    expect(body.estimatedValue).toBeDefined();
    expect(body.status).toBe('quoted');
    expect(body.message).toContain('£');
  });

  it('accepts all valid condition values', async () => {
    for (const condition of ['Pristine', 'Excellent', 'Good', 'Fair']) {
      const r = res();
      await handler(req('POST', { ...VALID_BODY, condition }), r);
      expect(r.statusCode).toBe(201);
    }
  });

  it('returns 201 for Samsung submission', async () => {
    const r = res();
    await handler(req('POST', { ...VALID_BODY, brand: 'Samsung', model: 'Galaxy S24 Ultra' }), r);
    expect(r.statusCode).toBe(201);
  });

  it('returns 201 for Google Pixel submission', async () => {
    const r = res();
    await handler(req('POST', { ...VALID_BODY, brand: 'Google', model: 'Pixel 8 Pro' }), r);
    expect(r.statusCode).toBe(201);
  });

  it('returns null estimated value gracefully for unknown model', async () => {
    const r = res();
    await handler(req('POST', { ...VALID_BODY, brand: 'Apple', model: 'iPhone 1' }), r);
    // Should still succeed (201) but message indicates manual quote
    expect(r.statusCode).toBe(201);
    expect((r.body as any).message).toBeTruthy();
  });

  it('handles optional storage field without error', async () => {
    const r = res();
    await handler(req('POST', { ...VALID_BODY, storage: '256GB' }), r);
    expect(r.statusCode).toBe(201);
  });

  it('handles optional issues array without error', async () => {
    const r = res();
    await handler(req('POST', { ...VALID_BODY, issues: ['cracked_screen'] }), r);
    expect(r.statusCode).toBe(201);
  });

  it('returns 400 for empty brand string', async () => {
    const r = res();
    await handler(req('POST', { ...VALID_BODY, brand: '   ' }), r);
    expect(r.statusCode).toBe(400);
  });
});
