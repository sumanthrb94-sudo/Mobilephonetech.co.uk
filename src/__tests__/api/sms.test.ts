import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.stubEnv('BREVO_API_KEY', 'xkeysib-test');
  vi.stubEnv('SMS_SENDER', 'LeHart');
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetModules();
});

const load = () => import('../../../api/_sms.js');
const ok = (body: unknown = { messageId: 1, usedCredits: 1 }) => ({
  ok: true,
  status: 201,
  json: async () => body,
  text: async () => '',
});

describe('toInternational', () => {
  it.each([
    ['07700 900123', '447700900123'],
    ['+44 7700 900123', '447700900123'],
    ['(07700) 900-123', '447700900123'],
    ['447700900123', '447700900123'],
    ['7700900123', '447700900123'],
  ])('normalises %s', async (input, expected) => {
    const { toInternational } = await load();
    expect(toInternational(input)).toBe(expected);
  });

  it.each([[''], [null], [undefined], ['abc'], ['123'], ['1234567890123456789']])(
    'rejects %s rather than wasting a credit',
    async (input) => {
      const { toInternational } = await load();
      expect(toInternational(input)).toBeNull();
    },
  );
});

describe('sendSms', () => {
  it('stays off unless a sender is deliberately configured', async () => {
    vi.stubEnv('SMS_SENDER', '');
    const { sendSms } = await load();

    const result = await sendSms({ to: '07700900123', content: 'hi' });
    // SMS costs credits, so silence is the correct default.
    expect(result.sent).toBe(false);
    expect(result.skipped).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sends in international format as a transactional message', async () => {
    fetchMock.mockResolvedValue(ok());
    const { sendSms } = await load();

    const result = await sendSms({ to: '07700 900123', content: 'Your order is out for delivery' });
    expect(result.sent).toBe(true);
    expect(result.creditsUsed).toBe(1);

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.recipient).toBe('447700900123');
    expect(body.type).toBe('transactional');
    expect(body.sender).toBe('LeHart');
  });

  it('truncates past one GSM-7 segment so a long template cannot multiply the cost', async () => {
    fetchMock.mockResolvedValue(ok());
    const { sendSms } = await load();
    await sendSms({ to: '07700900123', content: 'x'.repeat(500) });

    expect(JSON.parse(fetchMock.mock.calls[0][1].body).content).toHaveLength(160);
  });

  it('caps the sender id at the 11-character limit', async () => {
    vi.stubEnv('SMS_SENDER', 'AVeryLongSenderName');
    fetchMock.mockResolvedValue(ok());
    const { sendSms } = await load();
    await sendSms({ to: '07700900123', content: 'hi' });

    expect(JSON.parse(fetchMock.mock.calls[0][1].body).sender).toHaveLength(11);
  });

  it('refuses an unusable number before spending anything', async () => {
    const { sendSms } = await load();
    const result = await sendSms({ to: 'not a phone', content: 'hi' });

    expect(result.sent).toBe(false);
    expect(result.error).toContain('phone number');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('refuses an empty body', async () => {
    const { sendSms } = await load();
    expect((await sendSms({ to: '07700900123', content: '   ' })).error).toContain('empty');
  });

  it('reports a network failure without throwing', async () => {
    fetchMock.mockRejectedValue(new Error('ETIMEDOUT'));
    const { sendSms } = await load();

    const result = await sendSms({ to: '07700900123', content: 'hi' });
    expect(result.sent).toBe(false);
    expect(result.error).toContain('ETIMEDOUT');
  });
});
