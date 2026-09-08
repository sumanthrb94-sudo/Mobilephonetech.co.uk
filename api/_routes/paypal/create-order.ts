import { adminDb, verifyCaller } from '../../_firebaseAdmin.js';
import { enforceRateLimit } from '../../_rateLimit.js';
import { previewModeFrom, PREVIEW_MESSAGE } from '../../../src/config/preview.js';
import { priceAndValidate } from '../../_orderCore.js';
import { paypalConfigured, createPayPalOrder } from '../../_paypal.js';

/**
 * Step 1 of PayPal checkout: price the basket and open a PayPal order for it.
 *
 * The browser sends the same body /api/orders takes — items, address, coupon —
 * and never a price. priceAndValidate looks every figure up in the catalogue,
 * and the PayPal order is opened for THAT total. The returned id is what the
 * PayPal buttons approve; capture (step 2) re-prices and checks the captured
 * amount against the basket before a single unit of stock is touched.
 *
 * Nothing is written to the orders collection here. An order the customer
 * never pays for should leave no trace, and stock must not be reserved against
 * an intention to pay.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!enforceRateLimit(req, res, 'paypal-create', { limit: 12, windowMs: 60_000 })) return;

  if (previewModeFrom(process.env.VITE_PREVIEW_MODE)) {
    return res.status(503).json({ error: PREVIEW_MESSAGE, previewMode: true });
  }
  if (!paypalConfigured()) {
    return res.status(503).json({ error: 'Card payment is not available yet.' });
  }

  const db = await adminDb();
  if (!db) return res.status(503).json({ error: 'Ordering is temporarily unavailable' });

  const caller = await verifyCaller(req);

  // Priced but not written: this proves the basket is valid and gives us the
  // authoritative total, without reserving stock for an unpaid order.
  const priced = await priceAndValidate(db, req.body ?? {}, caller, { status: 'awaiting-payment' });
  if (!priced.ok) return res.status(priced.status).json({ error: priced.error });

  const created = await createPayPalOrder(priced.order.total, priced.order.id, priced.order.currency);
  if (!created.ok) return res.status(created.status).json({ error: created.error });

  // Only the PayPal order id and our reference cross to the browser — never the
  // priced basket, which capture re-derives server-side rather than trust back.
  return res.status(200).json({ paypalOrderId: created.data!.id, reference: priced.order.id });
}
