import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * The upsert is the part worth testing: Listmonk answers a duplicate create
 * with 409 rather than upserting, so a subscriber who signs up twice only
 * lands correctly if that conflict is followed by a lookup and a PUT. Getting
 * it wrong is silent — the first signup works, the second is dropped, and
 * nothing surfaces until someone notices the list is short.
 */

const ENV = {
  LISTMONK_URL: 'https://mail.example.com/',
  LISTMONK_USERNAME: 'api-user',
  LISTMONK_TOKEN: 'secret-token',
  LISTMONK_LIST_ID: '3',
};

let fetchMock: ReturnType<typeof vi.fn>;

function jsonResponse(status: number, body: unknown) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

beforeEach(() => {
  for (const [k, v] of Object.entries(ENV)) vi.stubEnv(k, v);
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetModules();
});

async function load() {
  return import('../../../api/_listmonk.js');
}

describe('configuration', () => {
  it('is a no-op rather than an error when unconfigured', async () => {
    vi.unstubAllEnvs();
    vi.stubEnv('LISTMONK_URL', '');
    const { upsertSubscriber, listmonkConfigured } = await load();

    expect(listmonkConfigured()).toBe(false);
    const result = await upsertSubscriber({ email: 'a@b.com' });
    // A marketing-list outage must never cost a subscriber, so this reports
    // skipped and the caller carries on.
    expect(result.synced).toBe(false);
    expect(result.skipped).toBeTruthy();
    expect(result.error).toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sends the v4 token scheme by default', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { data: { id: 1 } }));
    const { upsertSubscriber } = await load();
    await upsertSubscriber({ email: 'a@b.com' });

    expect(fetchMock.mock.calls[0][1].headers.authorization).toBe('token api-user:secret-token');
  });

  it('falls back to Basic for Listmonk v3 and older', async () => {
    vi.stubEnv('LISTMONK_AUTH', 'basic');
    fetchMock.mockResolvedValue(jsonResponse(200, { data: { id: 1 } }));
    const { upsertSubscriber } = await load();
    await upsertSubscriber({ email: 'a@b.com' });

    const expected = `Basic ${Buffer.from('api-user:secret-token').toString('base64')}`;
    expect(fetchMock.mock.calls[0][1].headers.authorization).toBe(expected);
  });

  it('does not double the slash between base URL and path', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { data: { id: 1 } }));
    const { upsertSubscriber } = await load();
    await upsertSubscriber({ email: 'a@b.com' });

    expect(fetchMock.mock.calls[0][0]).toBe('https://mail.example.com/api/subscribers');
  });
});

describe('upsertSubscriber', () => {
  it('creates a new subscriber on the configured list', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { data: { id: 7 } }));
    const { upsertSubscriber } = await load();

    const result = await upsertSubscriber({ email: 'New@Example.com ', name: ' Jordan ' });

    expect(result).toEqual({ synced: true, action: 'created' });
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.email).toBe('new@example.com'); // normalised
    expect(body.name).toBe('Jordan'); // trimmed
    expect(body.lists).toEqual([3]);
    // Without this every subscriber parks as 'unconfirmed' and is silently
    // excluded from campaigns sent to a double opt-in list.
    expect(body.preconfirm_subscriptions).toBe(true);
  });

  it('updates in place when the address already exists', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(409, { message: 'E-mail already exists' }))
      .mockResolvedValueOnce(jsonResponse(200, { data: { results: [{ id: 42 }] } }))
      .mockResolvedValueOnce(jsonResponse(200, { data: { id: 42 } }));

    const { upsertSubscriber } = await load();
    const result = await upsertSubscriber({ email: 'dupe@example.com' });

    expect(result).toEqual({ synced: true, action: 'updated' });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[2][0]).toBe('https://mail.example.com/api/subscribers/42');
    expect(fetchMock.mock.calls[2][1].method).toBe('PUT');
  });

  it('escapes a quote in the lookup query rather than breaking it', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(409, {}))
      .mockResolvedValueOnce(jsonResponse(200, { data: { results: [{ id: 1 }] } }))
      .mockResolvedValueOnce(jsonResponse(200, {}));

    const { upsertSubscriber } = await load();
    await upsertSubscriber({ email: "o'neill@example.com" });

    // Listmonk's query is SQL, so the apostrophe has to be doubled.
    expect(decodeURIComponent(fetchMock.mock.calls[1][0])).toContain("subscribers.email = 'o''neill@example.com'");
  });

  it('reports a non-conflict failure without throwing', async () => {
    fetchMock.mockResolvedValue(jsonResponse(500, { message: 'boom' }));
    const { upsertSubscriber } = await load();

    const result = await upsertSubscriber({ email: 'a@b.com' });
    expect(result.synced).toBe(false);
    expect(result.error).toContain('500');
  });

  it('reports a network failure without throwing', async () => {
    fetchMock.mockRejectedValue(new Error('ECONNREFUSED'));
    const { upsertSubscriber } = await load();

    const result = await upsertSubscriber({ email: 'a@b.com' });
    expect(result.synced).toBe(false);
    expect(result.error).toContain('ECONNREFUSED');
  });

  it('reports a conflict whose lookup finds nothing, instead of claiming success', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(409, {}))
      .mockResolvedValueOnce(jsonResponse(200, { data: { results: [] } }));

    const { upsertSubscriber } = await load();
    const result = await upsertSubscriber({ email: 'ghost@example.com' });

    expect(result.synced).toBe(false);
    expect(result.error).toContain('lookup');
  });

  it('substitutes the local part when no name was given', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, {}));
    const { upsertSubscriber } = await load();
    await upsertSubscriber({ email: 'jordan@example.com' });

    // Listmonk rejects an empty name outright.
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).name).toBe('jordan');
  });
});

describe('blocklistSubscriber', () => {
  it('suppresses a known address', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(200, { data: { results: [{ id: 9 }] } }))
      .mockResolvedValueOnce(jsonResponse(200, {}));

    const { blocklistSubscriber } = await load();
    const result = await blocklistSubscriber('gone@example.com');

    expect(result.synced).toBe(true);
    expect(fetchMock.mock.calls[1][0]).toContain('/api/subscribers/query/blocklist');
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).ids).toEqual([9]);
  });

  it('treats an address Listmonk never had as already suppressed', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { data: { results: [] } }));

    const { blocklistSubscriber } = await load();
    expect((await blocklistSubscriber('never@example.com')).synced).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
