import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * /api/return-notify emails the customer about a return, in the shop's name.
 * The recipient always comes from the stored document, so the question these
 * pin is WHICH messages a customer may trigger for their own return: only the
 * acknowledgement of a new request. Approved / rejected / resolved are staff
 * decisions; letting the owner ask for them meant "your refund has been
 * issued" could be sent, with a note, from the shop's domain at will.
 */

let isAdmin = false;
let record: Record<string, unknown> | null = null;

vi.mock('../../../api/_firebaseAdmin.js', () => ({
  adminDb: async () => ({
    collection: () => ({ doc: () => ({ get: async () => ({ exists: record !== null, data: () => record }) }) }),
  }),
  verifyCaller: async () => ({ uid: 'u-owner', email: 'owner@example.com' }),
  callerIsAdmin: async () => isAdmin,
}));

const sendEmail = vi.fn(async (_p: unknown) => ({ sent: true } as { sent: boolean; error?: string }));
vi.mock('../../../api/_email.js', async (orig) => {
  const actual = await orig<typeof import('../../../api/_email.js')>();
  return { ...actual, sendEmail: (p: unknown) => sendEmail(p), emailConfigured: () => true };
});

const { default: handler } = await import('../../../api/_routes/return-notify.js');

let ip = 0;
async function post(body: unknown) {
  const out: { code: number; body: any } = { code: 0, body: null };
  const r: any = {
    setHeader: () => r,
    status: (c: number) => { out.code = c; return r; },
    json: (b: unknown) => { out.body = b; return r; },
  };
  await handler({ method: 'POST', body, headers: { 'x-forwarded-for': `10.9.0.${ip}` }, socket: {} }, r);
  return out;
}

beforeEach(() => {
  ip += 1;
  vi.clearAllMocks();
  isAdmin = false;
  record = {
    id: 'RMA-1', userId: 'u-owner', orderId: 'ORD-1', status: 'requested', outcome: 'refund',
    customerEmail: 'owner@example.com', customerName: 'Owner', refundAmount: 99,
    items: [{ brand: 'Apple', model: 'iPhone 13', quantity: 1 }], staffNote: null,
  };
});

describe('POST /api/return-notify', () => {
  it('lets the owner trigger the acknowledgement of their new request', async () => {
    const out = await post({ rmaId: 'RMA-1', kind: 'received' });
    expect(out.code).toBe(200);
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect((sendEmail.mock.calls[0][0] as { to: string }).to).toBe('owner@example.com');
  });

  it.each(['approved', 'rejected', 'resolved'])('refuses the owner a "%s" message: that is staff speaking', async (kind) => {
    const out = await post({ rmaId: 'RMA-1', kind });
    expect(out.code).toBe(403);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('refuses the owner an acknowledgement once the request is no longer new', async () => {
    record!.status = 'resolved';
    const out = await post({ rmaId: 'RMA-1', kind: 'received' });
    expect(out.code).toBe(403);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('refuses someone else\'s return', async () => {
    record!.userId = 'u-someone-else';
    const out = await post({ rmaId: 'RMA-1', kind: 'received' });
    expect(out.code).toBe(403);
  });

  it('lets staff send every message, whatever the status', async () => {
    isAdmin = true;
    record!.status = 'approved';
    for (const kind of ['approved', 'rejected', 'resolved', 'received']) {
      const out = await post({ rmaId: 'RMA-1', kind });
      expect(out.code, kind).toBe(200);
    }
    expect(sendEmail).toHaveBeenCalledTimes(4);
  });

  it('always mails the stored address, never one from the request', async () => {
    isAdmin = true;
    await post({ rmaId: 'RMA-1', kind: 'approved', to: 'attacker@example.com', customerEmail: 'attacker@example.com' });
    expect((sendEmail.mock.calls[0][0] as { to: string }).to).toBe('owner@example.com');
  });

  it('truncates a very long staff note in a rejection', async () => {
    isAdmin = true;
    record!.staffNote = 'x'.repeat(5000);
    await post({ rmaId: 'RMA-1', kind: 'rejected' });
    const mail = sendEmail.mock.calls[0][0] as { html: string };
    expect(mail.html.match(/x+/g)!.sort((a, b) => b.length - a.length)[0].length).toBe(1000);
  });
});
