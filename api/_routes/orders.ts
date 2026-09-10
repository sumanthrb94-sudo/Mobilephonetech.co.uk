import { adminDb, verifyCaller } from '../_firebaseAdmin.js';
import { enforceRateLimit } from '../_rateLimit.js';
import { previewModeFrom, PREVIEW_MESSAGE } from '../../src/config/preview.js';
import { priceAndValidate, commitOrder, finalizeOrder, StockConflict } from '../_orderCore.js';

/**
 * Create an order WITHOUT taking payment. Disabled by default.
 *
 * This was the direct path for a card gateway that never landed: it prices,
 * reserves stock and writes a confirmed order in one go, with no payment step
 * to wait on. PayPal is now the only gateway, which makes this endpoint a way
 * to obtain stock and a confirmation email for free — it takes no card, and it
 * does not require a signed-in caller.
 *
 * So it is off unless ALLOW_UNPAID_ORDERS is explicitly set to 'true'. The
 * route is kept rather than deleted because the end-to-end suite drives the
 * shared pricing, stock and email behaviour of _orderCore through it, and
 * because a manual or phone order may yet want a deliberate way in. Nothing
 * in the storefront calls it: the browser reaches _orderCore only through
 * paypal/capture, which writes an order only after the money is captured and
 * matched to the penny.
 *
 * If you turn this on, understand exactly what you are opening.
 */

/** The only way to enable the unpaid path, and it has to be said out loud. */
function unpaidOrdersAllowed(): boolean {
  return String(process.env.ALLOW_UNPAID_ORDERS ?? '').trim().toLowerCase() === 'true';
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!enforceRateLimit(req, res, 'orders', { limit: 12, windowMs: 60_000 })) return;

  /**
   * Closed unless deliberately opened. 503 rather than 404: the capability
   * exists and is switched off, which is the honest answer, and it matches
   * how preview mode reports the same "not serving right now" condition.
   */
  if (!unpaidOrdersAllowed()) {
    return res.status(503).json({
      error: 'Orders are placed through PayPal. This endpoint does not take payment and is disabled.',
    });
  }

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
