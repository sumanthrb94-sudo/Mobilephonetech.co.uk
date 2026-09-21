import { describe, it, expect, vi, beforeEach } from 'vitest';
import { auth, withAdminRetry } from '../../lib/firebase';

function permissionDenied(): Error & { code: string } {
  return Object.assign(new Error('Missing or insufficient permissions.'), { code: 'permission-denied' });
}

describe('withAdminRetry', () => {
  beforeEach(() => {
    (auth as unknown as { currentUser: unknown }).currentUser = null;
  });

  it('returns the result on the first try when nothing goes wrong', async () => {
    const fn = vi.fn(() => Promise.resolve('ok'));
    await expect(withAdminRetry(fn)).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('does not retry an error unrelated to permissions', async () => {
    const fn = vi.fn(() => Promise.reject(new Error('network down')));
    await expect(withAdminRetry(fn)).rejects.toThrow('network down');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('forces a fresh token and retries once when refused for looking unauthorised — the stale-token case', async () => {
    const getIdToken = vi.fn(() => Promise.resolve('fresh-token'));
    (auth as unknown as { currentUser: unknown }).currentUser = { getIdToken };

    let attempt = 0;
    const fn = vi.fn(() => {
      attempt += 1;
      return attempt === 1 ? Promise.reject(permissionDenied()) : Promise.resolve('ok-on-retry');
    });

    await expect(withAdminRetry(fn)).resolves.toBe('ok-on-retry');
    expect(fn).toHaveBeenCalledTimes(2);
    // The retry is only worth anything if it actually forced a real refresh
    // rather than reusing the same stale cached token.
    expect(getIdToken).toHaveBeenCalledWith(true);
  });

  it('surfaces the original permission error when nobody is signed in to refresh', async () => {
    (auth as unknown as { currentUser: unknown }).currentUser = null;
    const fn = vi.fn(() => Promise.reject(permissionDenied()));
    await expect(withAdminRetry(fn)).rejects.toMatchObject({ code: 'permission-denied' });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('surfaces the original permission error, not a network error, when the retry is genuinely refused again', async () => {
    const getIdToken = vi.fn(() => Promise.resolve('fresh-token'));
    (auth as unknown as { currentUser: unknown }).currentUser = { getIdToken };

    const original = permissionDenied();
    const fn = vi.fn(() => Promise.reject(original));

    await expect(withAdminRetry(fn)).rejects.toBe(original);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('surfaces the original error, not a refresh failure, when the token refresh itself cannot reach the network', async () => {
    const getIdToken = vi.fn(() => Promise.reject(new Error('offline')));
    (auth as unknown as { currentUser: unknown }).currentUser = { getIdToken };

    const original = permissionDenied();
    const fn = vi.fn(() => Promise.reject(original));

    await expect(withAdminRetry(fn)).rejects.toBe(original);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
