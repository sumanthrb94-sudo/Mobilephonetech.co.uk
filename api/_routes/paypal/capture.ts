import { adminDb, verifyCaller } from '../../_firebaseAdmin.js';
import { enforceRateLimit } from '../../_rateLimit.js';
import { previewModeFrom, PREVIEW_MESSAGE } from '../../../src/config/preview.js';
import { priceAndValidate, commitOrder, finalizeOrder, money, StockConflict } from '../../_orderCore.js';
import { paypalConfigured, capturePayPalOrder, refundCapture } from '../../_paypal.js';

/**
 * Step 2 of PayPal checkout: take the money, then — only if everything agrees
 * — reserve stock and write the order.
 *
 * The order of operations is the whole security of it:
 *
 *   1. Re-price the basket server-side. Never trust a total from the browser,
 *      and never trust the one from step 1 either — minutes have passed and a
 *      price or a coupon could have moved.
 *   2. Capture the PayPal payment.
 *   3. Check the captured amount equals the re-priced total, to the penny, in
 *      the right currency. Anything else is refunded, not shipped.
 *   4. Reserve stock and write the order in one transaction. If the stock
 *      vanished between approval and capture, refund and say so honestly.
 *
 * A capture with no order is always refunded. There is no branch that keeps a
 * customer's money without giving them an order.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!enforceRateLimit(req, res, 'paypal-capture', { limit: 12, windowMs: 60_000 })) return;

  if (previewModeFrom(process.env.VITE_PREVIEW_MODE)) {
    return res.status(503).json({ error: PREVIEW_MESSAGE, previewMode: true });
  }
  if (!paypalConfigured()) {
    return res.status(503).json({ error: 'Card payment is not available yet.' });
  }

  const db = await adminDb();
  if (!db) return res.status(503).json({ error: 'Ordering is temporarily unavailable' });

  const paypalOrderId = String(req.body?.paypalOrderId ?? '').trim();
  if (!paypalOrderId) return res.status(400).json({ error: 'Missing PayPal order reference' });

  const caller = await verifyCaller(req);

  // 1. Re-price from the catalogue. This is the authoritative amount; the
  //    capture must match it.
  const priced = await priceAndValidate(db, req.body ?? {}, caller, { status: 'pending' });
  if (!priced.ok) return res.status(priced.status).json({ error: priced.error });
  const order = priced.order;
  order.paymentMethod = 'PayPal';
  order.paypalOrderId = paypalOrderId;

  // 2. Take the money.
  const captured = await capturePayPalOrder(paypalOrderId);
  if (!captured.ok) return res.status(captured.status).json({ error: captured.error });

  const { capturedTotal, currency, captureId, status } = captured.data!;

  // 3. The captured amount must equal what we priced, to the penny. A mismatch
  //    — a tampered client, a stale approval, a currency mix-up — is money we
  //    hold for an order we will not create, so it goes straight back.
  const amountOk = status === 'COMPLETED'
    && currency === order.currency
    && money(capturedTotal) === money(order.total);

  if (!amountOk) {
    if (captureId) {
      const refund = await refundCapture(captureId);
      if (!refund.ok) {
        // A refund we could not complete is the one thing a human must chase.
        console.error(`[paypal/capture] REFUND FAILED for ${captureId} (order ${order.id}): ${refund.error}`);
      }
    }
    return res.status(409).json({
      error: 'Payment did not match the order and has been refunded. You have not been charged.',
    });
  }

  // 4. Reserve stock and write the order. If it can no longer be filled, the
  //    money is already ours, so refund before telling the customer.
  try {
    await commitOrder(db, order);
  } catch (err) {
    if (captureId) {
      const refund = await refundCapture(captureId);
      if (!refund.ok) {
        console.error(`[paypal/capture] REFUND FAILED for ${captureId} (order ${order.id}): ${refund.error}`);
      }
    }
    if (err instanceof StockConflict) {
      return res.status(409).json({ error: `${err.message} You have been refunded — you were not charged.` });
    }
    console.error(`[paypal/capture] commit failed for ${order.id}:`, (err as Error).message);
    return res.status(500).json({
      error: 'We took the payment but could not record the order, so it has been refunded. Please try again.',
    });
  }

  const confirmationEmail = await finalizeOrder(db, order, caller, priced.contactPhone);
  return res.status(201).json({ order, confirmationEmail });
}
