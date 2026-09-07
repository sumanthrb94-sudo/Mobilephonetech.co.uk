import { describe, it, expect, beforeEach, afterEach } from 'vitest';

/**
 * Two providers, one call site.
 *
 * The point of the abstraction is that swapping provider is a key, not a code
 * change — so what has to be tested is that each one is handed the shape it
 * actually wants. Brevo and Resend disagree about almost every field name, and
 * a wrong one is a 422 in production rather than a compile error here.
 */

const FROM = 'info@lehart.co.uk';
let sent: Array<{ url: string; headers: Record<string, string>; body: any }> = [];
let realFetch: typeof fetch;

beforeEach(() => {
  sent = [];
  realFetch = globalThis.fetch;
  globalThis.fetch = (async (url: string, init: { headers: Record<string, string>; body: string }) => {
    sent.push({ url: String(url), headers: init.headers, body: JSON.parse(init.body) });
    return { ok: true, status: 200, json: async () => ({ id: 'res_1', messageId: 'brv_1' }), text: async () => '' };
  }) as unknown as typeof fetch;

  delete process.env.EMAIL_PROVIDER;
  delete process.env.BREVO_API_KEY;
  delete process.env.RESEND_API_KEY;
  process.env.EMAIL_FROM = FROM;
  process.env.EMAIL_FROM_NAME = 'LeHart';
  process.env.EMAIL_REPLY_TO = 'info@lehart.co.uk';
});

afterEach(() => { globalThis.fetch = realFetch; });

const send = async () => {
  const { sendEmail } = await import('../../../api/_email.js');
  return sendEmail({ to: 'ram@example.com', toName: 'Ram', subject: 'Order confirmed', html: '<p>hi</p>', text: 'hi', tag: 'order-confirmation' });
};

describe('choosing a provider', () => {
  it('is inferred from whichever key exists, so adding one key is enough', async () => {
    const { emailProvider } = await import('../../../api/_email.js');

    process.env.BREVO_API_KEY = 'xkeysib-x';
    expect(emailProvider()).toBe('brevo');

    process.env.RESEND_API_KEY = 're_x';
    // Both present: the deliberately added newer key wins over the one nobody
    // remembered to remove.
    expect(emailProvider()).toBe('resend');
  });

  it('lets an explicit setting override the inference', async () => {
    const { emailProvider } = await import('../../../api/_email.js');
    process.env.RESEND_API_KEY = 're_x';
    process.env.BREVO_API_KEY = 'xkeysib-x';
    process.env.EMAIL_PROVIDER = 'brevo';
    expect(emailProvider()).toBe('brevo');
  });

  it('is nothing at all with no key, and sending is a no-op', async () => {
    const { emailProvider } = await import('../../../api/_email.js');
    expect(emailProvider()).toBeNull();

    const result = await send();
    expect(result.sent).toBe(false);
    expect(result.skipped).toBeTruthy();
    // A missing key must never fail a customer's order, so nothing is thrown
    // and nothing is sent.
    expect(sent).toHaveLength(0);
  });
});

describe('Resend', () => {
  beforeEach(() => { process.env.RESEND_API_KEY = 're_test'; });

  it('is given the shape Resend wants', async () => {
    const result = await send();

    expect(result.sent).toBe(true);
    expect(sent[0].url).toContain('api.resend.com');
    expect(sent[0].headers.authorization).toBe('Bearer re_test');

    const body = sent[0].body;
    // One RFC 5322 string, not a name/email pair.
    expect(body.from).toBe(`LeHart <${FROM}>`);
    expect(body.to).toEqual(['ram@example.com']);
    expect(body.html).toBe('<p>hi</p>');
    expect(body.text).toBe('hi');
    expect(body.reply_to).toBe('info@lehart.co.uk');
    // Tags are name/value pairs here, bare strings at Brevo.
    expect(body.tags).toEqual([{ name: 'category', value: 'order-confirmation' }]);
  });

  it('reads the message id back from Resend’s own field', async () => {
    // Brevo returns messageId, Resend returns id. Reading the wrong one loses
    // the only handle on a send in the provider's log.
    const result = await send();
    expect(result.messageId).toBe('res_1');
  });
});

describe('Brevo', () => {
  beforeEach(() => { process.env.BREVO_API_KEY = 'xkeysib-test'; });

  it('is given the shape Brevo wants', async () => {
    const result = await send();

    expect(result.sent).toBe(true);
    expect(sent[0].url).toContain('api.brevo.com');
    expect(sent[0].headers['api-key']).toBe('xkeysib-test');

    const body = sent[0].body;
    expect(body.sender).toEqual({ email: FROM, name: 'LeHart' });
    expect(body.to).toEqual([{ email: 'ram@example.com', name: 'Ram' }]);
    expect(body.htmlContent).toBe('<p>hi</p>');
    expect(body.textContent).toBe('hi');
    expect(body.replyTo).toEqual({ email: 'info@lehart.co.uk' });
    expect(body.tags).toEqual(['order-confirmation']);
  });

  it('reads the message id back from Brevo’s own field', async () => {
    const result = await send();
    expect(result.messageId).toBe('brv_1');
  });
});

describe('what does not change with the provider', () => {
  it('warns about an unauthenticatable sender either way', async () => {
    const { senderDomainWarning } = await import('../../../api/_email.js');
    process.env.EMAIL_FROM = 'someone@gmail.com';

    // Switching provider does not make a gmail.com From: address deliverable.
    // The warning must not name one provider as if the other were exempt.
    const warning = senderDomainWarning();
    expect(warning).toMatch(/gmail\.com/);
    expect(warning).not.toMatch(/brevo/i);
  });

  it('reports the failure with the provider that produced it', async () => {
    process.env.RESEND_API_KEY = 're_test';
    globalThis.fetch = (async () => ({
      ok: false, status: 422, text: async () => 'domain not verified', json: async () => ({}),
    })) as unknown as typeof fetch;

    const result = await send();
    expect(result.sent).toBe(false);
    expect(result.error).toContain('resend responded 422');
    expect(result.error).toContain('domain not verified');
  });
});
