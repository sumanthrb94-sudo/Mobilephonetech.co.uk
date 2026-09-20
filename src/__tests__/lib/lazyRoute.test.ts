import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * The route loader's recovery, which exists because of a real outage.
 *
 * Every route is a dynamic import of a hashed chunk, and Vercel serves only
 * the current deployment's files from the live domain. So the moment a
 * deploy lands, every chunk filename the previous build produced answers
 * 404 — and a shopper whose app is already running gets "Something went
 * wrong" on every page they navigate to, while the shell around it keeps
 * working. That is what happened on 20 September 2026.
 *
 * Two properties matter and they pull against each other: it has to reload
 * once so the shopper lands on the new build, and it must never be able to
 * reload in a loop, which on a live shop is worse than the error it fixes.
 */

const RELOAD_KEY = 'lehart:chunk-reload-at';

/** Re-imports the module so its state and the mocked globals line up. */
async function freshLoader() {
  vi.resetModules();
  return (await import('../../lib/lazyRoute')).lazyRoute;
}

let replaced: string[] = [];

beforeEach(() => {
  replaced = [];
  sessionStorage.clear();
  // jsdom will not navigate, so the call is observed rather than performed.
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { href: 'https://lehart.co.uk/products', replace: (u: string) => replaced.push(u) },
  });
});

describe('lazyRoute', () => {
  it('reloads once when a route chunk has gone', async () => {
    const lazyRoute = await freshLoader();
    const load = vi.fn().mockRejectedValue(new Error('Failed to fetch dynamically imported module'));

    // React.lazy defers the import until render, so the factory is invoked
    // directly here — the recovery is in the factory, not in React.
    const Lazy = lazyRoute(load) as unknown as { _payload: { _result: () => Promise<unknown> } };
    await Promise.race([
      (Lazy._payload._result as () => Promise<unknown>)(),
      new Promise((r) => setTimeout(r, 50)),
    ]);

    expect(replaced).toEqual(['https://lehart.co.uk/products']);
    expect(sessionStorage.getItem(RELOAD_KEY)).toBeTruthy();
  });

  it('does not reload a second time inside the cooling-off window', async () => {
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
    const lazyRoute = await freshLoader();
    const err = new Error('Failed to fetch dynamically imported module');
    const Lazy = lazyRoute(vi.fn().mockRejectedValue(err)) as unknown as { _payload: { _result: () => Promise<unknown> } };

    // The failure is allowed through to the error boundary, which is the
    // honest outcome once reloading has been tried and did not help.
    await expect((Lazy._payload._result as () => Promise<unknown>)()).rejects.toThrow(err);
    expect(replaced).toEqual([]);
  });

  it('reloads again once the window has passed, for a later deploy', async () => {
    sessionStorage.setItem(RELOAD_KEY, String(Date.now() - 61_000));
    const lazyRoute = await freshLoader();
    const Lazy = lazyRoute(vi.fn().mockRejectedValue(new Error('gone'))) as unknown as { _payload: { _result: () => Promise<unknown> } };
    await Promise.race([
      (Lazy._payload._result as () => Promise<unknown>)(),
      new Promise((r) => setTimeout(r, 50)),
    ]);
    expect(replaced).toHaveLength(1);
  });

  it('passes a working chunk straight through', async () => {
    const lazyRoute = await freshLoader();
    const Component = () => null;
    const Lazy = lazyRoute(vi.fn().mockResolvedValue({ default: Component })) as unknown as { _payload: { _result: () => Promise<{ default: unknown }> } };
    await expect((Lazy._payload._result as () => Promise<{ default: unknown }>)()).resolves.toEqual({ default: Component });
    expect(replaced).toEqual([]);
  });
});
