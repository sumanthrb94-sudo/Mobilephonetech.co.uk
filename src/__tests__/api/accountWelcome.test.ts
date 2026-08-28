import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Two properties carry the weight here, and both are security or cost
 * properties rather than behaviour:
 *
 *  1. The recipient comes from the verified ID token, never the request body.
 *     A route that mailed whatever address it was handed would be an open
 *     relay on a warmed sending domain.
 *  2. It sends once per account, ever — a retry or a double-invoked effect
 *     must not produce a second copy.
 */

const userDoc = {
  get: vi.fn(async () => ({ exists: false, data: () => ({}) })),
  set: vi.fn(async () => undefined),
};

vi.mock('../../../api/_firebaseAdmin.js', () => ({
  adminDb: async () => ({ collection: () => ({ doc: () => userDoc }) }),
  verifyCaller: vi.fn(),
}));

type SendArgs = { to: string; toName?: string; subject: string; html: string; text: string; tag?: string };
const sendEmail = vi.fn(async (_params: SendArgs) => ({ sent: true, messageId: 'm1' }));
vi.mock('../../../api/_email.js', () => ({
  sendEmail,
  emailConfigured: () => true,
  esc: (v: unknown) => String(v ?? ''),
}));

const { verifyCaller } = await import('../../../api/_firebaseAdmin.js');
const { default: handler } = await import('../../../api/_routes/account-welcome.js');

function mockRes() {
  const r: any = { code: 0, body: null };
  r.status = (c: number) => { r.code = c; return r; };
  r.json = (b: unknown) => { r.body = b; return r; };
  r.setHeader = () => {};
  return r;
}

const call = async (body: unknown = {}, method = 'POST') => {
  const res = mockRes();
  await handler({ method, body, headers: { authorization: 'Bearer t' }, socket: {} }, res);
  return res;
};

beforeEach(() => {
  vi.clearAllMocks();
  userDoc.get.mockResolvedValue({ exists: false, data: () => ({}) } as never);
  sendEmail.mockResolvedValue({ sent: true, messageId: 'm1' } as never);
  vi.mocked(verifyCaller).mockResolvedValue({ uid: 'u1', email: 'jordan@example.com' } as never);
});

describe('authentication', () => {
  it('refuses an unauthenticated caller', async () => {
    vi.mocked(verifyCaller).mockResolvedValue(null as never);
    const res = await call();

    expect(res.code).toBe(401);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('refuses a non-POST request', async () => {
    expect((await call({}, 'GET')).code).toBe(405);
  });
});

describe('the recipient is never taken from the request', () => {
  it('mails the token address, ignoring an address in the body', async () => {
    await call({ email: 'attacker@evil.example', to: 'attacker@evil.example', name: 'Jordan' });

    // The whole point: otherwise this is an open relay on a warmed domain.
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: 'jordan@example.com' }));
    expect(JSON.stringify(sendEmail.mock.calls[0][0])).not.toContain('attacker@evil.example');
  });

  it('normalises the address from the token', async () => {
    vi.mocked(verifyCaller).mockResolvedValue({ uid: 'u1', email: '  Jordan@Example.COM ' } as never);
    await call();

    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: 'jordan@example.com' }));
  });

  it('skips quietly for a phone-only account with no address', async () => {
    vi.mocked(verifyCaller).mockResolvedValue({ uid: 'p1', email: null } as never);
    const res = await call();

    // Nothing to send is not a failure the caller should surface.
    expect(res.code).toBe(200);
    expect(res.body.sent).toBe(false);
    expect(sendEmail).not.toHaveBeenCalled();
  });
});

describe('sends exactly once per account', () => {
  it('stamps before sending, so a crash cannot double-send', async () => {
    await call();

    const setCallOrder = userDoc.set.mock.invocationCallOrder[0];
    const sendCallOrder = sendEmail.mock.invocationCallOrder[0];
    // Losing a welcome is far cheaper than sending two.
    expect(setCallOrder).toBeLessThan(sendCallOrder);
    expect(userDoc.set).toHaveBeenCalledWith(
      expect.objectContaining({ welcomeEmailSentAt: expect.any(String) }),
      { merge: true },
    );
  });

  it('does nothing on a second call', async () => {
    userDoc.get.mockResolvedValue({
      exists: true,
      data: () => ({ welcomeEmailSentAt: '2026-08-28T10:00:00.000Z' }),
    } as never);

    const res = await call();
    expect(res.code).toBe(200);
    expect(res.body.skipped).toMatch(/already sent/i);
    expect(sendEmail).not.toHaveBeenCalled();
  });
});

describe('failures never look like a signup problem', () => {
  it('returns 200 when the send fails', async () => {
    sendEmail.mockResolvedValue({ sent: false, error: 'Brevo responded 400' } as never);
    const res = await call();

    // The account exists and works; the caller must not surface this.
    expect(res.code).toBe(200);
    expect(res.body.sent).toBe(false);
  });

  it('returns 200 when email is simply unconfigured', async () => {
    sendEmail.mockResolvedValue({ sent: false, skipped: 'BREVO_API_KEY not set' } as never);
    const res = await call();

    expect(res.code).toBe(200);
    expect(res.body.skipped).toBeTruthy();
  });
});

describe('marketing consent is not implied', () => {
  it('tags the send as transactional and adds nobody to a list', async () => {
    await call({ name: 'Jordan' });

    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({ tag: 'account-welcome' }));
    // Registering is not subscribing. Nothing here may touch a contact list —
    // treating signup as opt-in is the assumption PECR prohibits.
    const body = JSON.stringify(sendEmail.mock.calls[0][0]);
    expect(body).not.toMatch(/unsubscribe/i);
  });
});
