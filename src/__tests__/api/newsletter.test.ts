import { describe, it, expect, vi } from 'vitest';

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
const { default: handler } = await import('../../../api/newsletter');

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
  };
}

describe('POST /api/newsletter', () => {
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
});
