/**
 * Microsoft Clarity — loaded only after the visitor accepts.
 *
 * Clarity records sessions, builds heatmaps, and sets its own cookies (`_clck`,
 * `_clsk`) plus a persistent user id. That is storage on a subscriber's device
 * under PECR and re-identifiable personal data under GDPR, exactly like GA4 —
 * so it rides the same consent gate and is never loaded at module scope.
 *
 * It complements, rather than duplicates, what already exists:
 *
 *   analytics.ts        cookieless counts of everybody, no consent needed.
 *   firebaseAnalytics   GA4 sessions and funnels, for those who accept.
 *   clarity (this)      session replay and heatmaps — the "why" behind the
 *                       numbers: where people rage-click, where they stall,
 *                       what a broken checkout actually looks like.
 *
 * Dormant until configured. With no VITE_CLARITY_PROJECT_ID set, start() is a
 * no-op, so the site runs unchanged until the id is in the environment.
 *
 *   VITE_CLARITY_PROJECT_ID   the project id from clarity.microsoft.com
 *                             (Settings → Overview → the id in the tag, e.g.
 *                             "abcd1234ef")
 */

export const CLARITY_CONSENT_KEY = 'cookie_consent';

const PROJECT_ID = import.meta.env.VITE_CLARITY_PROJECT_ID as string | undefined;

let started = false;

/** Whether the visitor has actively accepted. Absent or declined is a no. */
function hasConsent(): boolean {
  try {
    return localStorage.getItem(CLARITY_CONSENT_KEY) === 'accepted';
  } catch {
    // Private mode or blocked storage: an unreadable answer is "not given".
    return false;
  }
}

/**
 * Start Clarity if, and only if, it is configured and consented.
 *
 * Safe to call repeatedly — the first successful call wins. Injects Microsoft's
 * standard loader, which is the only supported way in; the id is the sole
 * parameter and is public (it ships in the tag on every page that uses Clarity),
 * so putting it in a VITE_ variable exposes nothing that is not already public.
 */
export function startClarity(): void {
  if (started) return;
  if (typeof window === 'undefined') return;
  if (!PROJECT_ID) return;
  if (!hasConsent()) return;

  started = true;

  // Microsoft's official snippet, transcribed rather than pasted as a blob so
  // it is readable and typed. It defines window.clarity, queues calls until the
  // async script loads, then replays them.
  (function (c: any, l: Document, a: string, r: string, i: string) {
    c[a] = c[a] || function (...args: unknown[]) { (c[a].q = c[a].q || []).push(args); };
    const t = l.createElement(r) as HTMLScriptElement;
    t.async = true;
    t.src = `https://www.clarity.ms/tag/${i}`;
    // Microsoft's snippet inserts before the first existing <script>; fall back
    // to <head> so it still loads on a document that has none yet.
    const y = l.getElementsByTagName(r)[0];
    if (y?.parentNode) y.parentNode.insertBefore(t, y);
    else (l.head || l.documentElement).appendChild(t);
  })(window, document, 'clarity', 'script', PROJECT_ID);
}

/**
 * Stop feeding Clarity.
 *
 * Like the GA4 gate, the tag offers no clean teardown once running, so the
 * banner reloads the page on reject and this flag simply prevents a restart in
 * the meantime. On a fresh load with consent withdrawn, start() never fires.
 */
export function stopClarity(): void {
  started = false;
}
