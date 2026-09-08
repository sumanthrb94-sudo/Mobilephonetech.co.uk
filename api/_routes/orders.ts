import { adminDb, verifyCaller } from '../_firebaseAdmin.js';
import { enforceRateLimit } from '../_rateLimit.js';
import { previewModeFrom, PREVIEW_MESSAGE } from '../../src/config/preview.js';
import { priceAndValidate, commitOrder, finalizeOrder, StockConflict } from '../_orderCore.js';

/**
 * Create an order. The server prices it; the browser never does.
 *
 * The pricing, stock reservation and confirmation email all live in
 * _orderCore, shared with the PayPal capture route so the two cannot disagree
 * on a penny. This handler is the direct (card / express-intent) path: it
 * prices, reserves and writes in one go, because there is no separate payment
 * step to wait on. The PayPal path writes only after the money is captured.
 *
 * Guests are allowed — the prices are authoritative either way, and requiring
 * sign-in would only break guest checkout.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!enforceRateLimit(req, res, 'orders', { limit: 12, windowMs: 60_000 })) return;

  /**
   * Preview mode, enforced here rather than only in the browser. The banner on
   * the storefront is a courtesy; this is the control. 503 rather than 403:
   * the shop is temporarily not serving, which a client and a search engine
   * both understand.
   */
  if (previewModeFrom(process.env.VITE_PREVIEW_MODE)) {
    return res.status(503).json({ error: PREVIEW_MESSAGE, previewMode: true });
  }

  const db = await adminDb();
  if (!db) return res.status(503).json({ error: 'Ordering is temporarily unavailable' });

  const caller = await verifyCaller(req);

  const priced = await priceAndValidate(db, req.body ?? {}, caller);
  if (!priced.ok) return res.status(priced.status).json({ error: priced.error });

  try {
    await commitOrder(db, priced.order);
  } catch (err) {
    // 409 rather than 400: the basket was valid, someone else simply got there
    // first, and the customer's own next move differs for each.
    if (err instanceof StockConflict) return res.status(409).json({ error: err.message });
    return res.status(500).json({ error: 'Could not save your order', detail: (err as Error).message });
  }

  const confirmationEmail = await finalizeOrder(db, priced.order, caller, priced.contactPhone);
  return res.status(201).json({ order: priced.order, confirmationEmail });
}
