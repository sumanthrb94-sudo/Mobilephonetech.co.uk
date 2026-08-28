import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Brevo does not sign its webhooks, so the shared secret is the entire
 * authentication boundary. Anyone who gets past it can suppress arbitrary
 * addresses — a denial of service against your own customers — which is why
 * the auth cases here matter more than the happy path.
 */

const subscriberDoc = {
  get: vi.fn(async () => ({ exists: true })),
  set: vi.fn(async () => undefined),
};
const eventDoc = { set: vi.fn(async () => undefined) };

vi.mock('../../../api/_firebaseAdmin.js', () => ({
  adminDb: async () => ({
    collection: (name: string) => ({
      doc: () => (name === 'emailEvents' ? eventDoc : subscriberDoc),
    }),
  }),
}));

const suppressContact = vi.fn(async () => ({ synced: true }));
const blocklistSubscriber = vi.fn(async () => ({ synced: true }));
vi.mock('../../../api/_brevoContacts.js', () => ({ suppressContact }));
vi.mock('../../../api/_listmonk.js', () => ({ blocklistSubscriber }));

const { default: handler } = await import('../../../api/_routes/brevo-webhook.js');

function mockRes() {
  const r: any = { code: 0, body: null };
  r.status = (c: number) => { r.code = c; return r; };
  r.json = (b: unknown) => { r.body = b; return r; };
  r.setHeader = () => {};
  return r;
}

const call = async (body: unknown, secret?: string, method = 'POST') => {
  const res = mockRes();
  await handler({ method, body, query: secret === undefined ? {} : { secret }, headers: {} }, res);
  return res;
};

beforeEach(() => {
  vi.stubEnv('BREVO_WEBHOOK_SECRET', 'correct-horse');
  vi.clearAllMocks();
  subscriberDoc.get.mockResolvedValue({ exists: true } as never);
});
afterEach(() => vi.unstubAllEnvs());

describe('authentication', () => {
  it('404s when no secret is configured, rather than defaulting open', async () => {
    vi.stubEnv('BREVO_WEBHOOK_SECRET', '');
    const res = await call({ event: 'hard_bounce', email: 'a@b.com' }, 'anything');

    expect(res.code).toBe(404);
    expect(suppressContact).not.toHaveBeenCalled();
  });

  it('rejects a wrong secret', async () => {
    const res = await call({ event: 'hard_bounce', email: 'a@b.com' }, 'wrong-horse');
    expect(res.code).toBe(403);
    expect(suppressContact).not.toHaveBeenCalled();
  });

  it('rejects a secret of a different length without throwing', async () => {
    // timingSafeEqual throws on a length mismatch if not guarded.
    const res = await call({ event: 'hard_bounce', email: 'a@b.com' }, 'short');
    expect(res.code).toBe(403);
  });

  it('rejects a missing secret', async () => {
    expect((await call({ event: 'hard_bounce', email: 'a@b.com' })).code).toBe(403);
  });

  it('rejects a non-POST request', async () => {
    expect((await call({}, 'correct-horse', 'GET')).code).toBe(405);
  });
});

describe('suppression', () => {
  it.each(['hard_bounce', 'spam', 'blocked', 'unsubscribed', 'invalid_email', 'complaint'])(
    'suppresses everywhere on %s',
    async (event) => {
      const res = await call({ event, email: 'Bounced@Example.com' }, 'correct-horse');

      expect(res.code).toBe(200);
      expect(res.body.action).toBe('suppressed');
      expect(subscriberDoc.set).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: false }),
        { merge: true },
      );
      // Normalised before it reaches the other systems.
      expect(suppressContact).toHaveBeenCalledWith('bounced@example.com', expect.any(String));
      expect(blocklistSubscriber).toHaveBeenCalledWith('bounced@example.com');
    },
  );

  it.each(['delivered', 'opened', 'click', 'soft_bounce', 'deferred'])(
    'logs %s without suppressing',
    async (event) => {
      const res = await call({ event, email: 'a@b.com' }, 'correct-horse');

      expect(res.code).toBe(200);
      expect(res.body.action).toBe('logged');
      // A soft bounce is transient — suppressing on one would lose customers
      // to a full mailbox.
      expect(suppressContact).not.toHaveBeenCalled();
      expect(subscriberDoc.set).not.toHaveBeenCalled();
    },
  );

  it('still records an event for an address that never subscribed', async () => {
    subscriberDoc.get.mockResolvedValue({ exists: false } as never);
    const res = await call({ event: 'hard_bounce', email: 'guest@example.com' }, 'correct-horse');

    expect(res.code).toBe(200);
    expect(res.body.outcome.firestore).toBe('not-a-subscriber');
    // A bouncing order-confirmation address still has to be suppressed at the
    // provider, even with no newsletter record to deactivate.
    expect(suppressContact).toHaveBeenCalled();
  });

  it('logs every event, suppressing or not', async () => {
    await call({ event: 'opened', email: 'a@b.com', 'message-id': '<x@brevo>' }, 'correct-horse');
    expect(eventDoc.set).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'opened', email: 'a@b.com' }),
      { merge: true },
    );
  });

  it('returns 200 on an unknown event so Brevo stops retrying it', async () => {
    const res = await call({ event: 'something_new', email: 'a@b.com' }, 'correct-horse');
    expect(res.code).toBe(200);
    expect(res.body.action).toBe('ignored');
  });
});

describe('validation', () => {
  it('rejects a payload with no event', async () => {
    expect((await call({ email: 'a@b.com' }, 'correct-horse')).code).toBe(400);
  });

  it('rejects a payload with no usable email', async () => {
    expect((await call({ event: 'hard_bounce', email: 'nonsense' }, 'correct-horse')).code).toBe(400);
  });
});
