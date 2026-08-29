import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * The consent gate is the whole point of src/lib/firebaseAnalytics.ts, and it
 * fails silently in exactly one direction: loading GA before consent looks
 * identical to working analytics, right up until someone checks the cookie jar
 * against the cookie policy.
 *
 * The strongest guarantee here is not "GA is disabled" but "GA is never
 * fetched". That is what the dynamic import test below pins.
 */

const getAnalytics = vi.fn(() => ({ app: {} }));
const isSupported = vi.fn(async () => true);
const logEvent = vi.fn();
let analyticsModuleLoads = 0;

vi.mock('firebase/analytics', () => {
  analyticsModuleLoads++;
  return { getAnalytics, isSupported, logEvent };
});

vi.mock('../../lib/firebase', () => ({
  app: { name: '[DEFAULT]' },
  isFirebaseConfigured: true,
}));

async function freshModule() {
  vi.resetModules();
  return import('../../lib/firebaseAnalytics');
}

beforeEach(() => {
  vi.clearAllMocks();
  analyticsModuleLoads = 0;
  localStorage.clear();
  vi.stubEnv('VITE_FIREBASE_MEASUREMENT_ID', 'G-FXQZDRTB3Y');
});

describe('nothing loads before consent', () => {
  it('does not start with no answer recorded', async () => {
    const m = await freshModule();
    expect(await m.startFirebaseAnalytics()).toBeNull();
    expect(getAnalytics).not.toHaveBeenCalled();
  });

  it('does not start when the visitor rejected', async () => {
    localStorage.setItem('cookie_consent', 'declined');
    const m = await freshModule();
    expect(await m.startFirebaseAnalytics()).toBeNull();
    expect(getAnalytics).not.toHaveBeenCalled();
  });

  it('never even fetches the GA bundle without consent', async () => {
    // "Loaded but disabled" is not what the banner promises, and the bundle
    // weight lands on people who declined.
    localStorage.setItem('cookie_consent', 'declined');
    const m = await freshModule();
    await m.startFirebaseAnalytics();
    await m.logFirebaseEvent('view_item', { items: [] });

    expect(analyticsModuleLoads).toBe(0);
  });

  it('treats unreadable storage as consent not given', async () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage blocked');
    });
    const m = await freshModule();
    expect(m.hasAnalyticsConsent()).toBe(false);
    expect(await m.startFirebaseAnalytics()).toBeNull();
    spy.mockRestore();
  });
});

describe('with consent', () => {
  beforeEach(() => localStorage.setItem('cookie_consent', 'accepted'));

  it('starts once, however many times it is asked', async () => {
    const m = await freshModule();
    await Promise.all([m.startFirebaseAnalytics(), m.startFirebaseAnalytics()]);
    await m.startFirebaseAnalytics();

    expect(getAnalytics).toHaveBeenCalledTimes(1);
  });

  it('logs under GA4 ecommerce names so the standard reports populate', async () => {
    const m = await freshModule();
    await m.logFirebaseEvent('view_item', { items: [{ item_id: 'apple-iphone-12-64gb' }] });

    expect(logEvent).toHaveBeenCalledWith(expect.anything(), 'view_item', {
      items: [{ item_id: 'apple-iphone-12-64gb' }],
    });
  });

  it('stays quiet when the project has no measurement id', async () => {
    // Analytics is not enabled on every Firebase project, and calling
    // getAnalytics without one throws.
    vi.stubEnv('VITE_FIREBASE_MEASUREMENT_ID', '');
    const m = await freshModule();
    expect(await m.startFirebaseAnalytics()).toBeNull();
    expect(getAnalytics).not.toHaveBeenCalled();
  });

  it('stays quiet where the browser cannot support it', async () => {
    isSupported.mockResolvedValueOnce(false);
    const m = await freshModule();
    expect(await m.startFirebaseAnalytics()).toBeNull();
  });

  it('never throws out of a measurement call', async () => {
    getAnalytics.mockImplementationOnce(() => { throw new Error('GA exploded'); });
    const m = await freshModule();
    await expect(m.startFirebaseAnalytics()).resolves.toBeNull();
    await expect(m.logFirebaseEvent('page_view')).resolves.toBeUndefined();
  });
});
