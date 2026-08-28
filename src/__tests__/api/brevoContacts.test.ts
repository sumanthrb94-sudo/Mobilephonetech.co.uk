import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

let fetchMock: ReturnType<typeof vi.fn>;
const res = (status: number, body: unknown = {}) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
});

beforeEach(() => {
  vi.stubEnv('BREVO_API_KEY', 'xkeysib-test');
  vi.stubEnv('BREVO_LIST_ID', '4');
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetModules();
});

const load = () => import('../../../api/_brevoContacts.js');

describe('upsertContact', () => {
  it('is a no-op without an API key rather than an error', async () => {
    vi.stubEnv('BREVO_API_KEY', '');
    const { upsertContact } = await load();

    const result = await upsertContact({ email: 'a@b.com' });
    expect(result.synced).toBe(false);
    expect(result.skipped).toBeTruthy();
    expect(result.error).toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('upserts rather than failing on a returning subscriber', async () => {
    fetchMock.mockResolvedValue(res(201, { id: 5 }));
    const { upsertContact } = await load();
    await upsertContact({ email: 'a@b.com' });

    // Without updateEnabled Brevo answers 400 "Contact already exist" and the
    // newer attributes are silently lost.
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).updateEnabled).toBe(true);
  });

  it('normalises the address and maps names onto Brevo attributes', async () => {
    fetchMock.mockResolvedValue(res(201));
    const { upsertContact } = await load();
    await upsertContact({ email: '  Jordan@Example.COM ', firstName: 'Jordan', lastName: 'O’Neill' });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.email).toBe('jordan@example.com');
    expect(body.attributes.FIRSTNAME).toBe('Jordan');
    expect(body.attributes.LASTNAME).toBe('O’Neill');
    expect(body.listIds).toEqual([4]);
  });

  it('omits listIds entirely when no list is configured', async () => {
    vi.stubEnv('BREVO_LIST_ID', '');
    fetchMock.mockResolvedValue(res(201));
    const { upsertContact } = await load();
    await upsertContact({ email: 'a@b.com' });

    // Sending listIds: [NaN] would 400 the whole call.
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).listIds).toBeUndefined();
  });

  it('strips non-digits from an SMS number', async () => {
    fetchMock.mockResolvedValue(res(201));
    const { upsertContact } = await load();
    await upsertContact({ email: 'a@b.com', sms: '+44 7700 900123' });

    expect(JSON.parse(fetchMock.mock.calls[0][1].body).attributes.SMS).toBe('447700900123');
  });

  it('reports a failure without throwing', async () => {
    fetchMock.mockResolvedValue(res(400, { message: 'Invalid attribute' }));
    const { upsertContact } = await load();

    const result = await upsertContact({ email: 'a@b.com' });
    expect(result.synced).toBe(false);
    expect(result.error).toContain('Invalid attribute');
  });
});

describe('suppressContact', () => {
  it('blacklists at the account level, not just the list', async () => {
    fetchMock.mockResolvedValue(res(204));
    const { suppressContact } = await load();

    const result = await suppressContact('bounced@example.com', 'hard bounce');
    expect(result.synced).toBe(true);
    // Removing from a list still lets automations reach them; blacklisting
    // stops Brevo sending at all.
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).emailBlacklisted).toBe(true);
    expect(fetchMock.mock.calls[0][1].method).toBe('PUT');
  });

  it('treats an unknown contact as already suppressed', async () => {
    fetchMock.mockResolvedValue(res(404));
    const { suppressContact } = await load();
    expect((await suppressContact('never@example.com')).synced).toBe(true);
  });

  it('url-encodes an address with a plus tag', async () => {
    fetchMock.mockResolvedValue(res(204));
    const { suppressContact } = await load();
    await suppressContact('jordan+shop@example.com');

    expect(fetchMock.mock.calls[0][0]).toContain('jordan%2Bshop%40example.com');
  });
});
