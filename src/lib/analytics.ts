/**
 * Cookieless analytics client.
 *
 * Sends counts, never identities. No cookie is set, no id is generated, and
 * nothing here is stored on the device — so there is no consent gate to pass,
 * and the numbers describe every visitor rather than only the ones who accept
 * a banner. See api/_routes/track.ts for what the server does with them.
 *
 * Events are batched and flushed on a timer, on page hide, and when the buffer
 * fills. Batching is not a micro-optimisation: a request per click would put
 * analytics traffic in front of the shopper's own requests on a phone with one
 * bar of signal.
 */

export type TrackKind = 'page_view' | 'product_view' | 'add_to_cart' | 'checkout_start' | 'search';

interface TrackEvent {
  kind: TrackKind;
  path?: string;
  productId?: string;
  term?: string;
}

const FLUSH_AFTER_MS = 4000;
const MAX_BUFFER = 20;

let buffer: TrackEvent[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
let listenersBound = false;

/** Never let analytics break a page: every failure here is swallowed. */
function post(events: TrackEvent[]): void {
  if (!events.length) return;
  const body = JSON.stringify({ events });

  try {
    // sendBeacon survives the page being closed, which is exactly when the
    // most interesting event — the last thing they looked at — is sent.
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const ok = navigator.sendBeacon('/api/track', new Blob([body], { type: 'application/json' }));
      if (ok) return;
    }
    void fetch('/api/track', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* analytics is never worth an exception */
  }
}

export function flush(): void {
  if (timer) { clearTimeout(timer); timer = null; }
  const pending = buffer;
  buffer = [];
  post(pending);
}

function bindLifecycle(): void {
  if (listenersBound || typeof document === 'undefined') return;
  listenersBound = true;
  // visibilitychange, not unload: unload does not fire reliably on mobile
  // Safari, which is most of this shop's traffic.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
  });
}

export function track(event: TrackEvent): void {
  if (typeof window === 'undefined') return;
  // The console is staff looking at their own shop. Counting it would make
  // every quiet day look busier than it was.
  if (window.location.pathname.startsWith('/admin')) return;

  bindLifecycle();
  buffer.push(event);

  if (buffer.length >= MAX_BUFFER) { flush(); return; }
  if (!timer) timer = setTimeout(flush, FLUSH_AFTER_MS);
}

export const trackPageView = (path: string) => track({ kind: 'page_view', path });
export const trackProductView = (productId: string) => track({ kind: 'product_view', productId });
export const trackAddToCart = (productId: string) => track({ kind: 'add_to_cart', productId });
export const trackCheckoutStart = () => track({ kind: 'checkout_start' });
export const trackSearch = (term: string) => track({ kind: 'search', term });
