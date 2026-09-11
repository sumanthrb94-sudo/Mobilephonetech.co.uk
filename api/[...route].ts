/**
 * Single entry point for every /api/* route.
 *
 * Vercel turns each file under api/ into its own Serverless Function, and the
 * Hobby plan allows twelve per deployment. Fourteen routes meant every deploy
 * was rejected outright with "no more than 12 functions". Rather than delete
 * working endpoints or pay for Pro, all of them are dispatched from here: one
 * catch-all function, one slot used, the public URLs unchanged.
 *
 * The handlers themselves live in api/_routes/. The leading underscore is what
 * keeps Vercel from treating them as routes in their own right — the same
 * trick the shared helpers (_firebaseAdmin, _rateLimit, _email) already use.
 *
 * Each entry below is a dynamic import rather than a top-level one. The whole
 * tree still ends up in a single bundle, but only the modules a request
 * actually touches get evaluated, so a call to /api/delivery never pays to
 * initialise firebase-admin or the Gemini client. Keeping the specifiers as
 * literals matters: the bundler resolves them statically, and a computed path
 * would leave the handlers out of the deployment entirely.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Handler = (req: any, res: any) => unknown | Promise<unknown>;

const ROUTES: Record<string, () => Promise<{ default: Handler }>> = {
  'account-welcome': () => import('./_routes/account-welcome.ts'),
  'bootstrap-admin': () => import('./_routes/bootstrap-admin.ts'),
  'bootstrap-seed': () => import('./_routes/bootstrap-seed.ts'),
  analytics: () => import('./_routes/analytics.ts'),
  'brevo-webhook': () => import('./_routes/brevo-webhook.ts'),
  'cart-events': () => import('./_routes/cart-events.ts'),
  'coupons/validate': () => import('./_routes/coupons/validate.ts'),
  'cron-abandoned-cart': () => import('./_routes/cron-abandoned-cart.ts'),
  delivery: () => import('./_routes/delivery.ts'),
  'gemini-chat': () => import('./_routes/gemini-chat.ts'),
  'gemini-image': () => import('./_routes/gemini-image.ts'),
  health: () => import('./_routes/health.ts'),
  newsletter: () => import('./_routes/newsletter.ts'),
  'order-notify': () => import('./_routes/order-notify.ts'),
  orders: () => import('./_routes/orders.ts'),
  'paypal/create-order': () => import('./_routes/paypal/create-order.ts'),
  'paypal/capture': () => import('./_routes/paypal/capture.ts'),
  products: () => import('./_routes/products.ts'),
  'return-notify': () => import('./_routes/return-notify.ts'),
  reviews: () => import('./_routes/reviews.ts'),
  search: () => import('./_routes/search.ts'),
  track: () => import('./_routes/track.ts'),
  'trade-in': () => import('./_routes/trade-in.ts'),
};

/**
 * The catch-all segments arrive as req.query.route. Falling back to the URL
 * covers the local esbuild host in e2e/, which has no such parsing.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function routeKey(req: any): string {
  const captured = req.query?.route;
  if (Array.isArray(captured)) return captured.join('/');
  if (typeof captured === 'string' && captured) return captured;

  const path = String(req.url ?? '').split('?')[0];
  return path.replace(/^\/+/, '').replace(/^api\//, '').replace(/\/+$/, '');
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function handler(req: any, res: any) {
  const key = routeKey(req);
  const load = Object.prototype.hasOwnProperty.call(ROUTES, key) ? ROUTES[key] : undefined;

  if (!load) {
    res.status(404).json({ error: 'Not found' });
    return;
  }

  try {
    const mod = await load();
    return await mod.default(req, res);
  } catch (err) {
    // A handler that throws past its own try/catch would otherwise surface as
    // an opaque FUNCTION_INVOCATION_FAILED with the route name nowhere in it.
    console.error(`api/${key} failed:`, err);
    if (!res.headersSent) res.status(500).json({ error: 'Internal error' });
  }
}
