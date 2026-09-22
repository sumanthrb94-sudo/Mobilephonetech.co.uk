import { describe, it, expect, vi, beforeEach } from 'vitest';

const users = new Map<string, { uid: string; email: string; displayName?: string; customClaims?: Record<string, unknown> }>();
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
  delete process.env.STAFF_EMAILS;
});

describe('GET /api/bootstrap-admin', () => {
  it('is invisible when BOOTSTRAP_SECRET is unset', async () => {
    delete process.env.BOOTSTRAP_SECRET;
    const r = res();
    await handler({ method: 'GET', query: {} }, r);
    expect(r.statusCode).toBe(404);
  });

  it('returns the same 404 for a wrong secret as for a disabled route', async () => {
    // Probing must not be able to distinguish "route off" from "wrong secret".
    const r = res();
    await handler({ method: 'GET', query: { secret: 'nope' } }, r);
    expect(r.statusCode).toBe(404);
    expect(r.body).toEqual({ error: 'Not found' });
  });

  it('refuses a secret short enough to brute-force', async () => {
    process.env.BOOTSTRAP_SECRET = 'short';
    const r = res();
    await handler({ method: 'GET', query: { secret: 'short' } }, r);
    expect(r.statusCode).toBe(500);
    expect(String(r.body.error)).toMatch(/too short/i);
  });

  it('promotes only the addresses named in ADMIN_EMAILS', async () => {
    users.set('a@example.com', { uid: 'uid-a', email: 'a@example.com' });
    users.set('b@example.com', { uid: 'uid-b', email: 'b@example.com' });
    // An account that exists but is NOT in ADMIN_EMAILS.
    users.set('attacker@example.com', { uid: 'uid-x', email: 'attacker@example.com' });

    const r = res();
    await handler({ method: 'GET', query: { secret: SECRET } }, r);

    expect(r.statusCode).toBe(200);
    expect(r.body.promoted).toBe(2);
    expect(setClaims).toHaveBeenCalledWith('uid-a', { admin: true });
    expect(setClaims).toHaveBeenCalledWith('uid-b', { admin: true });
    expect(setClaims).not.toHaveBeenCalledWith('uid-x', expect.anything());
  });

  it('ignores an email supplied in the request — the list is server-side only', async () => {
    users.set('attacker@example.com', { uid: 'uid-x', email: 'attacker@example.com' });
    process.env.ADMIN_EMAILS = 'a@example.com';
    users.set('a@example.com', { uid: 'uid-a', email: 'a@example.com' });

    const r = res();
    await handler(
      { method: 'GET', query: { secret: SECRET, email: 'attacker@example.com' }, body: { emails: ['attacker@example.com'] } },
      r,
    );

    expect(setClaims).toHaveBeenCalledTimes(1);
    expect(setClaims).toHaveBeenCalledWith('uid-a', { admin: true });
  });

  it('explains that an address has to sign in once before it can be promoted', async () => {
    process.env.ADMIN_EMAILS = 'ghost@example.com';
    const r = res();
    await handler({ method: 'GET', query: { secret: SECRET } }, r);

    expect(r.statusCode).toBe(409);
    expect(r.body.promoted).toBe(0);
    const results = r.body.results as Array<Record<string, string>>;
    expect(results[0].status).toBe('no account yet');
    expect(results[0].detail).toMatch(/sign in once/i);
  });

  it('reports FAILED when the claim did not stick', async () => {
    users.set('a@example.com', { uid: 'uid-a', email: 'a@example.com' });
    process.env.ADMIN_EMAILS = 'a@example.com';
    // Simulate a write that resolves but persists nothing — the read-back is
    // what catches it, rather than reporting a success that never happened.
    claimsSilentlyFail = true;

    const r = res();
    await handler({ method: 'GET', query: { secret: SECRET } }, r);

    const results = r.body.results as Array<Record<string, string>>;
    expect(results[0].status).toBe('FAILED');
  });

  it('tells the caller to re-authenticate and remove the secret', async () => {
    users.set('a@example.com', { uid: 'uid-a', email: 'a@example.com' });
    process.env.ADMIN_EMAILS = 'a@example.com';

    const r = res();
    await handler({ method: 'GET', query: { secret: SECRET } }, r);

    expect(String(r.body.next)).toMatch(/sign out and back in/i);
    expect(String(r.body.next)).toMatch(/delete BOOTSTRAP_SECRET/i);
  });

  it('rejects other verbs', async () => {
    const r = res();
    await handler({ method: 'DELETE', query: { secret: SECRET } }, r);
    expect(r.statusCode).toBe(405);
  });
});

/**
 * The two back-office roles — see src/lib/adminRoles.ts.
 *
 * A manager decides what the shop front says and can take a product off sale;
 * staff do the daily work and cannot. That distinction is only worth anything
 * if this route actually grants the smaller claim when asked for it, and
 * never quietly grants the larger one.
 */
describe('role grants', () => {
  it('gives an address in STAFF_EMAILS the staff claim and nothing more', async () => {
    delete process.env.ADMIN_EMAILS;
    process.env.STAFF_EMAILS = 'floor@example.com';
    users.set('floor@example.com', { uid: 'u-floor', email: 'floor@example.com' });

    const r = res();
    await handler({ method: 'GET', query: { secret: SECRET } }, r);

    expect(r.statusCode).toBe(200);
    expect(setClaims).toHaveBeenCalledWith('u-floor', { staff: true });
    // The assertion that matters: not merely that staff was granted, but that
    // admin was not. A claims object carrying both would make every
    // staff-cannot-do-this rule vacuous.
    expect(setClaims).not.toHaveBeenCalledWith('u-floor', expect.objectContaining({ admin: true }));
  });

  it('still grants the manager claim from ADMIN_EMAILS', async () => {
    process.env.ADMIN_EMAILS = 'boss@example.com';
    users.set('boss@example.com', { uid: 'u-boss', email: 'boss@example.com' });

    const r = res();
    await handler({ method: 'GET', query: { secret: SECRET } }, r);

    expect(setClaims).toHaveBeenCalledWith('u-boss', { admin: true });
  });

  /**
   * An address in both lists is a manager. Letting the smaller role win would
   * quietly demote whoever added it to ADMIN_EMAILS, and a demotion nobody
   * asked for is worse than a duplicate entry.
   */
  it('makes an address in both lists a manager, not staff', async () => {
    process.env.ADMIN_EMAILS = 'both@example.com';
    process.env.STAFF_EMAILS = 'both@example.com';
    users.set('both@example.com', { uid: 'u-both', email: 'both@example.com' });

    const r = res();
    await handler({ method: 'GET', query: { secret: SECRET } }, r);

    expect(setClaims).toHaveBeenCalledWith('u-both', { admin: true });
    expect(setClaims).toHaveBeenCalledTimes(1);
  });

  it('records the role on the mirrored profile', async () => {
    delete process.env.ADMIN_EMAILS;
    process.env.STAFF_EMAILS = 'floor@example.com';
    users.set('floor@example.com', { uid: 'u-floor', email: 'floor@example.com' });

    await handler({ method: 'GET', query: { secret: SECRET } }, res());

    expect(profileSet).toHaveBeenCalledWith(expect.objectContaining({ role: 'staff' }));
  });

  it('says what to set when neither list is configured', async () => {
    delete process.env.ADMIN_EMAILS;
    delete process.env.STAFF_EMAILS;

    const r = res();
    await handler({ method: 'GET', query: { secret: SECRET } }, r);

    expect(r.statusCode).toBe(400);
    expect(String(r.body.error)).toMatch(/ADMIN_EMAILS/);
    expect(String(r.body.hint)).toMatch(/STAFF_EMAILS/);
  });
});
