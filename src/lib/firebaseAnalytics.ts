/**
 * Google Analytics for Firebase — loaded only after the visitor accepts.
 *
 * `getAnalytics(app)` is not a passive measurement call. It writes `_ga`
 * cookies and a persistent app-instance id, which under PECR is storage on a
 * subscriber's device requiring prior consent, and under GDPR is personal data
 * because that id makes a visitor re-identifiable across sessions. Calling it
 * at module scope — the shape Firebase's console gives you — starts all of
 * that before the banner has even rendered, which makes the "Reject
 * non-essential" button a lie rather than a control.
 *
 * So this module exports a function rather than an instance, nothing imports
 * the SDK until it is called, and the only caller is the consent gate.
 *
 * It sits alongside src/lib/analytics.ts rather than replacing it, and the
 * division is deliberate:
 *
 *   analytics.ts        counts everybody, no identifier, no consent needed.
 *                       Complete totals; no sessions, no per-user funnels.
 *   firebaseAnalytics   sessions, funnels, retention, audiences — for the
 *                       subset who accept. Rich, and systematically biased
 *                       towards people who accept banners.
 *
 * Neither is sufficient alone. Read conversion rates off the cookieless
 * counters, because those cover the whole population; read behaviour off GA4,
 * because that is what it is for.
 */
import type { Analytics } from 'firebase/analytics';
import { app, isFirebaseConfigured } from './firebase';

export const CONSENT_KEY = 'cookie_consent';

let instance: Analytics | null = null;
let starting: Promise<Analytics | null> | null = null;

/** Whether the visitor has actively accepted. Absent or declined is a no. */
export function hasAnalyticsConsent(): boolean {
  try {
    return localStorage.getItem(CONSENT_KEY) === 'accepted';
  } catch {
    // Private mode, or storage blocked entirely. Treat an unreadable answer as
    // "not given" — the only safe reading of a consent record you cannot see.
    return false;
  }
}

/**
 * Start GA4 if, and only if, it is allowed and possible.
 *
 * Safe to call repeatedly: the first call wins and the rest await it. Every
 * failure resolves to null rather than throwing, because measurement must
 * never be the reason a page breaks.
 */
export async function startFirebaseAnalytics(): Promise<Analytics | null> {
  if (instance) return instance;
  if (starting) return starting;

  if (typeof window === 'undefined') return null;
  if (!hasAnalyticsConsent()) return null;
  if (!isFirebaseConfigured) return null;
  // No measurement id means Analytics is not enabled on the Firebase project.
  if (!import.meta.env.VITE_FIREBASE_MEASUREMENT_ID) return null;

  starting = (async () => {
    try {
      // Dynamically imported so the GA bundle is not in the main chunk for the
      // visitors who decline — which is a real weight, not a rounding error.
      const { getAnalytics, isSupported } = await import('firebase/analytics');
      if (!(await isSupported())) return null;
      instance = getAnalytics(app);
      return instance;
    } catch {
      return null;
    } finally {
      starting = null;
    }
  })();

  return starting;
}

/**
 * Mirror one of our events into GA4, when it is running.
 *
 * Named with GA4's own ecommerce vocabulary (`view_item`, `add_to_cart`,
 * `purchase`) so the standard reports populate instead of everything landing
 * in a custom-events list nobody opens.
 */
export async function logFirebaseEvent(name: string, params: Record<string, unknown> = {}): Promise<void> {
  const analytics = instance ?? (await startFirebaseAnalytics());
  if (!analytics) return;
  try {
    const { logEvent } = await import('firebase/analytics');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    logEvent(analytics, name as any, params);
  } catch {
    /* never worth an exception */
  }
}

/** Called when consent is withdrawn. */
export function stopFirebaseAnalytics(): void {
  // The SDK has no teardown, so the honest thing is to stop feeding it and let
  // the page reload clear it. The banner reloads on reject for exactly this
  // reason: without that, GA keeps running until the next navigation.
  instance = null;
}
