import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * payment_incidents used to be write-only: refunds that failed and captures
 * that may have taken money sat in a collection nobody opened. These pin the
 * other half: a person is emailed, for the incidents that need one.
 */

const sendEmail = vi.fn(async (_p: unknown) => ({ sent: true } as { sent: boolean; error?: string }));
vi.mock('../../../api/_email.js', async (orig) => {
  const actual = await orig<typeof import('../../../api/_email.js')>();
  return { ...actual, sendEmail: (p: unknown) => sendEmail(p) };
});

const { recordPaymentIncident, incidentNeedsAlert, isAmbiguousFailure, incidentEmail } =
  await import('../../../api/_incidents.js');

const rows: Array<Record<string, unknown>> = [];
let addFails = false;
const db = {
  collection: () => ({
    add: async (row: Record<string, unknown>) => {
      if (addFails) throw new Error('firestore is down');
      rows.push(row);
    },
  }),
};

beforeEach(() => {
  vi.clearAllMocks();
  rows.length = 0;
  addFails = false;
  delete process.env.ORDER_ALERT_EMAIL;
  process.env.EMAIL_REPLY_TO = 'staff@lehart.co.uk';
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('which incidents need an email', () => {
  it('treats a timeout or dropped connection as ambiguous: PayPal may have taken the money', () => {
    for (const e of ['The operation was aborted due to timeout', 'fetch failed', 'This operation was aborted', 'read ECONNRESET']) {
      expect(isAmbiguousFailure(e), e).toBe(true);
    }
  });

  it('does not treat a plain decline as an incident', () => {
    for (const e of ['PayPal capture failed (422)', 'INSTRUMENT_DECLINED', 'The requested action could not be performed', null]) {
      expect(isAmbiguousFailure(e), String(e)).toBe(false);
    }
    expect(incidentNeedsAlert('capture-failed', { paypalError: 'INSTRUMENT_DECLINED' })).toBe(false);
    expect(incidentNeedsAlert('capture-failed', { paypalError: 'The operation was aborted due to timeout' })).toBe(true);
  });

  it('always alerts for refund failures, and never for kinds it does not know', () => {
    for (const kind of ['refund-failed', 'admin-refund-failed', 'refund-restock-failed']) {
      expect(incidentNeedsAlert(kind, {}), kind).toBe(true);
    }
    expect(incidentNeedsAlert('capture-attempt', {})).toBe(false);
  });
});

describe('recordPaymentIncident', () => {
  it('writes the row and emails the staff alert address', async () => {
    await recordPaymentIncident(db, 'paypal/capture', 'refund-failed', {
      reason: 'amount-mismatch', captureId: 'CAP-9', paypalOrderId: 'PP-1', reference: 'ORD-1',
      expectedTotal: 389, customerEmail: 'ram@example.com', paypalError: 'no capture id to refund',
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ kind: 'refund-failed', resolved: false, captureId: 'CAP-9' });
    expect(sendEmail).toHaveBeenCalledTimes(1);
    const mail = sendEmail.mock.calls[0][0] as { to: string; subject: string; text: string; tag: string; timeoutMs: number };
    expect(mail.to).toBe('staff@lehart.co.uk');
    expect(mail.subject).toContain('ACTION NEEDED');
    expect(mail.text).toContain('CAP-9');
    expect(mail.text).toContain('ram@example.com');
    expect(mail.tag).toBe('payment-incident');
    // A short deadline of its own: this runs on a path that has already failed.
    expect(mail.timeoutMs).toBeLessThanOrEqual(3000);
  });

  it('writes the row but sends nothing for an ordinary decline', async () => {
    await recordPaymentIncident(db, 'paypal/capture', 'capture-failed', { paypalError: 'INSTRUMENT_DECLINED' });
    expect(rows).toHaveLength(1);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('still emails when the row could not be written', async () => {
    addFails = true;
    await recordPaymentIncident(db, 'order-refund', 'admin-refund-failed', { orderId: 'ORD-1' });
    expect(rows).toHaveLength(0);
    expect(sendEmail).toHaveBeenCalledTimes(1);
  });

  it('never throws when the mail provider fails or throws', async () => {
    sendEmail.mockResolvedValueOnce({ sent: false, error: 'resend responded 500' });
    await expect(recordPaymentIncident(db, 'order-refund', 'admin-refund-failed', { orderId: 'ORD-1' })).resolves.toBeUndefined();
    sendEmail.mockRejectedValueOnce(new Error('boom'));
    await expect(recordPaymentIncident(db, 'order-refund', 'admin-refund-failed', { orderId: 'ORD-2' })).resolves.toBeUndefined();
  });

  it('escapes customer-supplied text in the HTML body', () => {
    const mail = incidentEmail('paypal/capture', 'refund-failed', { customerEmail: '<script>alert(1)</script>' });
    expect(mail.html).not.toContain('<script>alert(1)</script>');
    expect(mail.html).toContain('&lt;script&gt;');
  });
});
