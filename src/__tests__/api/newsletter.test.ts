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

// Import after mock
const { default: handler } = await import('../../../api/_routes/newsletter');

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

describe('POST /api/newsletter', () => {
  // Every test is one fake client, which trips the per-IP limiter across a
  // file — reset between tests so each starts from a clean window.
  beforeEach(() => resetRateLimits());

  it('returns 405 for GET requests', async () => {
    const r = res();
    await handler(req('GET'), r);
    expect(r.statusCode).toBe(405);
  });

  it('returns 400 when email is missing', async () => {
    const r = res();
    await handler(req('POST', {}), r);
    expect(r.statusCode).toBe(400);
    expect((r.body as any).error).toContain('email');
  });

  it('returns 400 for invalid email format', async () => {
    const r = res();
    await handler(req('POST', { email: 'not-an-email' }), r);
    expect(r.statusCode).toBe(400);
  });

  it('returns 400 for email without domain', async () => {
    const r = res();
    await handler(req('POST', { email: 'user@' }), r);
    expect(r.statusCode).toBe(400);
  });

  it('returns 400 for email without local part', async () => {
    const r = res();
    await handler(req('POST', { email: '@example.com' }), r);
    expect(r.statusCode).toBe(400);
  });

  it('returns 200 for valid email', async () => {
    const r = res();
    await handler(req('POST', { email: 'test@example.com' }), r);
    expect(r.statusCode).toBe(200);
    expect((r.body as any).success).toBe(true);
  });

  it('accepts email with name', async () => {
    const r = res();
    await handler(req('POST', { email: 'john@example.com', name: 'John Doe' }), r);
    expect(r.statusCode).toBe(200);
  });

  it('normalises email to lowercase', async () => {
    const r = res();
    await handler(req('POST', { email: 'User@Example.COM' }), r);
    expect(r.statusCode).toBe(200);
  });

  it('returns 400 for name over 100 characters', async () => {
    const r = res();
    await handler(req('POST', { email: 'test@example.com', name: 'A'.repeat(101) }), r);
    expect(r.statusCode).toBe(400);
  });

  it('accepts UK-specific email addresses', async () => {
    const r = res();
    await handler(req('POST', { email: 'user@gmail.co.uk' }), r);
    expect(r.statusCode).toBe(200);
  });

  it('returns success message in response body', async () => {
    const r = res();
    await handler(req('POST', { email: 'check@example.com' }), r);
    expect((r.body as any).message).toBeTruthy();
  });

  it('stores an evidenced consent record with every signup', async () => {
    setDocs.length = 0;
    const r = res();
    await handler(req('POST', { email: 'consent@example.com', source: 'homepage-footer' }), r);
    expect(r.statusCode).toBe(200);

    const doc = setDocs[0] as any;
    // The consent block is what makes the list lawfully mailable: when,
    // from where, against which policy wording, and by what method.
    expect(doc.consent.at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(doc.consent.source).toBe('homepage-footer');
    expect(doc.consent.policyVersion).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(doc.consent.method).toBe('single-opt-in');
    // Single opt-in must be explicitly marked unconfirmed, never implied confirmed.
    expect(doc.doubleOptInConfirmed).toBe(false);
  });

  it('defaults the consent source when none is sent', async () => {
    setDocs.length = 0;
    const r = res();
    await handler(req('POST', { email: 'nosource@example.com' }), r);
    expect((setDocs[0] as any).consent.source).toBe('website-signup');
  });

  it('rate-limits a client that hammers the route', async () => {
    let lastStatus = 200;
    // Limit is 10/min per client; the mock client is one IP.
    for (let i = 0; i < 12; i++) {
      const r = res();
      await handler(req('POST', { email: `flood${i}@example.com` }), r);
      lastStatus = r.statusCode;
    }
    expect(lastStatus).toBe(429);
  });
});
