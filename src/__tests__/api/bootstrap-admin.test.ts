import { describe, it, expect, vi, beforeEach } from 'vitest';

const users = new Map<string, { uid: string; email: string; emailVerified?: boolean; displayName?: string; customClaims?: Record<string, unknown> }>();
const setClaims = vi.fn();
const profileSet = vi.fn();
/** When true, setCustomUserClaims resolves but persists nothing. */
let claimsSilentlyFail = false;

vi.mock('../../../api/_firebaseAdmin.js', () => ({
  adminAuth: () => ({
    getUserByEmail: (email: string) => {
      const u = users.get(email);
      if (!u) return Promise.reject(Object.assign(new Error('not found'), { code: 'auth/user-not-found' }));
      return Promise.resolve(u);
    },
    setCustomUserClaims: (uid: string, claims: Record<string, unknown>) => {
      setClaims(uid, claims);
      if (!claimsSilentlyFail) {
        for (const u of users.values()) if (u.uid === uid) u.customClaims = claims;
      }
      return Promise.resolve();
    },
    getUser: (uid: string) => {
      for (const u of users.values()) if (u.uid === uid) return Promise.resolve(u);
      return Promise.reject(new Error('not found'));
    },
  }),
  adminDb: () => ({
    collection: () => ({ doc: () => ({ set: (d: unknown) => { profileSet(d); return Promise.resolve(); } }) }),
  }),
  getAdminInitError: () => null,
}));

const { default: handler } = await import('../../../api/_routes/bootstrap-admin');

function res() {
  let _code = 200;
  let _body: unknown = null;
  return {
    get statusCode() { return _code; },
    get body() { return _body as Record<string, unknown>; },
    setHeader() { return this; },
    status(code: number) { _code = code; return this; },
    json(data: unknown) { _body = data; return this; },
  };
}

const SECRET = 'a-sufficiently-long-secret';

beforeEach(() => {
  vi.clearAllMocks();
  users.clear();
  claimsSilentlyFail = false;
  process.env.BOOTSTRAP_SECRET = SECRET;
  process.env.ADMIN_EMAILS = 'a@example.com,b@example.com';
});

describe('POST /api/bootstrap-admin', () => {
  it('is invisible when BOOTSTRAP_SECRET is unset', async () => {
    delete process.env.BOOTSTRAP_SECRET;
    const r = res();
    await handler({ method: 'POST', query: {}, body: {} }, r);
    expect(r.statusCode).toBe(404);
  });

  it('returns the same 404 for a wrong secret as for a disabled route', async () => {
    // Probing must not be able to distinguish "route off" from "wrong secret".
    const r = res();
    await handler({ method: 'POST', query: {}, body: { secret: 'nope' } }, r);
    expect(r.statusCode).toBe(404);
    expect(r.body).toEqual({ error: 'Not found' });
  });

  it('refuses a secret short enough to brute-force', async () => {
    process.env.BOOTSTRAP_SECRET = 'short';
    const r = res();
    await handler({ method: 'POST', query: {}, body: { secret: 'short' } }, r);
    expect(r.statusCode).toBe(500);
    expect(String(r.body.error)).toMatch(/too short/i);
  });

  it('promotes only the addresses named in ADMIN_EMAILS', async () => {
    users.set('a@example.com', { uid: 'uid-a', email: 'a@example.com', emailVerified: true });
    users.set('b@example.com', { uid: 'uid-b', email: 'b@example.com', emailVerified: true });
    // An account that exists but is NOT in ADMIN_EMAILS.
    users.set('attacker@example.com', { uid: 'uid-x', email: 'attacker@example.com', emailVerified: true });

    const r = res();
    await handler({ method: 'POST', query: {}, body: { secret: SECRET } }, r);

    expect(r.statusCode).toBe(200);
    expect(r.body.promoted).toBe(2);
    expect(setClaims).toHaveBeenCalledWith('uid-a', { admin: true });
    expect(setClaims).toHaveBeenCalledWith('uid-b', { admin: true });
    expect(setClaims).not.toHaveBeenCalledWith('uid-x', expect.anything());
  });

  it('ignores an email supplied in the request — the list is server-side only', async () => {
    users.set('attacker@example.com', { uid: 'uid-x', email: 'attacker@example.com', emailVerified: true });
    process.env.ADMIN_EMAILS = 'a@example.com';
    users.set('a@example.com', { uid: 'uid-a', email: 'a@example.com', emailVerified: true });

    const r = res();
    await handler(
      { method: 'POST', query: { email: 'attacker@example.com' }, body: { secret: SECRET, emails: ['attacker@example.com'] } },
      r,
    );

    expect(setClaims).toHaveBeenCalledTimes(1);
    expect(setClaims).toHaveBeenCalledWith('uid-a', { admin: true });
  });

  it('explains that an address has to sign in once before it can be promoted', async () => {
    process.env.ADMIN_EMAILS = 'ghost@example.com';
    const r = res();
    await handler({ method: 'POST', query: {}, body: { secret: SECRET } }, r);

    expect(r.statusCode).toBe(409);
    expect(r.body.promoted).toBe(0);
    const results = r.body.results as Array<Record<string, string>>;
    expect(results[0].status).toBe('no account yet');
    expect(results[0].detail).toMatch(/sign in once/i);
  });

  it('reports FAILED when the claim did not stick', async () => {
    users.set('a@example.com', { uid: 'uid-a', email: 'a@example.com', emailVerified: true });
    process.env.ADMIN_EMAILS = 'a@example.com';
    // Simulate a write that resolves but persists nothing — the read-back is
    // what catches it, rather than reporting a success that never happened.
    claimsSilentlyFail = true;

    const r = res();
    await handler({ method: 'POST', query: {}, body: { secret: SECRET } }, r);

    const results = r.body.results as Array<Record<string, string>>;
    expect(results[0].status).toBe('FAILED');
  });

  it('tells the caller to re-authenticate and remove the secret', async () => {
    users.set('a@example.com', { uid: 'uid-a', email: 'a@example.com', emailVerified: true });
    process.env.ADMIN_EMAILS = 'a@example.com';

    const r = res();
    await handler({ method: 'POST', query: {}, body: { secret: SECRET } }, r);

    expect(String(r.body.next)).toMatch(/sign out and back in/i);
    expect(String(r.body.next)).toMatch(/delete BOOTSTRAP_SECRET/i);
  });

  it('rejects other verbs', async () => {
    const r = res();
    await handler({ method: 'DELETE', query: {}, body: { secret: SECRET } }, r);
    expect(r.statusCode).toBe(405);
  });

  it('refuses the secret in a GET query string, where it would be logged', async () => {
    users.set('a@example.com', { uid: 'uid-a', email: 'a@example.com', emailVerified: true });
    const r = res();
    await handler({ method: 'GET', query: { secret: SECRET } }, r);
    expect(r.statusCode).toBe(405);
    expect(setClaims).not.toHaveBeenCalled();
  });

  it('does not promote an address whose owner never verified it', async () => {
    // Someone who registered a listed address before its owner did.
    users.set('a@example.com', { uid: 'uid-squatter', email: 'a@example.com', emailVerified: false });
    process.env.ADMIN_EMAILS = 'a@example.com';
    const r = res();
    await handler({ method: 'POST', query: {}, body: { secret: SECRET } }, r);
    expect(setClaims).not.toHaveBeenCalled();
    const results = r.body.results as Array<Record<string, string>>;
    expect(results[0].status).toBe('not verified');
  });

  it('keeps the claims an account already has', async () => {
    users.set('a@example.com', { uid: 'uid-a', email: 'a@example.com', emailVerified: true, customClaims: { role: 'owner' } });
    process.env.ADMIN_EMAILS = 'a@example.com';
    const r = res();
    await handler({ method: 'POST', query: {}, body: { secret: SECRET } }, r);
    expect(setClaims).toHaveBeenCalledWith('uid-a', { role: 'owner', admin: true });
  });
});
