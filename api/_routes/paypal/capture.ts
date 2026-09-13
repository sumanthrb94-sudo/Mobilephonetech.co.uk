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

/**
 * Write down money we hold with no order behind it.
 *
 * console.error is not a record: Vercel's runtime logs roll off, and nobody is
 * reading them at 2am. A failed refund is the one failure that costs a real
 * customer real money, so it goes somewhere a human can still find tomorrow —
 * and a capture that errored ambiguously (a timeout mid-capture) goes down too,
 * because PayPal may have taken the money even though we never saw the reply.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function recordIncident(db: any, kind: string, detail: Record<string, unknown>): Promise<void> {
  console.error(`[paypal/capture] ${kind}`, JSON.stringify(detail));
  try {
    await db.collection('payment_incidents').add({
      kind,
      resolved: false,
      createdAt: new Date().toISOString(),
      ...detail,
    });
  } catch (err) {
    // Nothing left to do but shout. Losing the log too is why this is loud.
    console.error(`[paypal/capture] COULD NOT RECORD ${kind}:`, (err as Error).message);
  }
}

/**
 * Mark that we are about to take money, before we take it.
 *
 * recordIncident writes down failures we saw. This covers the window we
 * cannot see: between the capture returning and the order being written, a
 * function that is killed — the platform's ten-second ceiling, a redeploy, an
 * instance reclaimed — leaves the money taken, no order, and otherwise no
 * trace it ever happened. Keyed on the PayPal order id and closed on every
 * path that reaches a decision, so a row still unresolved is money to chase.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function openCaptureAttempt(db: any, paypalOrderId: string, detail: Record<string, unknown>): Promise<void> {
  try {
    await db.collection('payment_incidents').doc(paypalOrderId).set({
      kind: 'capture-attempt',
      resolved: false,
      createdAt: new Date().toISOString(),
      ...detail,
    });
  } catch (err) {
    console.error(`[paypal/capture] could not open attempt ${paypalOrderId}:`, (err as Error).message);
  }
}

/** Close the window above. Best-effort: it must never be what fails a payment. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function closeCaptureAttempt(db: any, paypalOrderId: string, outcome: string): Promise<void> {
  try {
    await db.collection('payment_incidents').doc(paypalOrderId).set(
      { resolved: true, outcome, resolvedAt: new Date().toISOString() },
      { merge: true },
    );
  } catch (err) {
    console.error(`[paypal/capture] could not close attempt ${paypalOrderId}:`, (err as Error).message);
  }
}

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

  // 2. Take the money — but write down that we are about to, first.
  await openCaptureAttempt(db, paypalOrderId, {
    reference: order.id, total: order.total, currency: order.currency,
    customerEmail: order.shippingAddress?.email ?? null,
  });

  const captured = await capturePayPalOrder(paypalOrderId);
  if (!captured.ok) {
    // We do not know whether PayPal took the money before this failed — a
    // timeout looks identical to a refusal from here. Record it so someone can
    // check the PayPal dashboard for an orphaned capture.
    await recordIncident(db, 'capture-failed', {
      paypalOrderId, reference: order.id, total: order.total,
      currency: order.currency, paypalError: captured.error ?? null,
    });
    await closeCaptureAttempt(db, paypalOrderId, 'capture-failed');
    return res.status(captured.status).json({ error: captured.error });
  }

  const { capturedTotal, currency, captureId, status, captureStatus } = captured.data!;

  // 3. The captured amount must equal what we priced, to the penny. A mismatch
  //    — a tampered client, a stale approval, a currency mix-up — is money we
  //    hold for an order we will not create, so it goes straight back.
  // captureStatus, not status: the ORDER reads COMPLETED while its capture is
  // still PENDING for a bank-funded payment or one held for review, and
  // shipping against that is shipping against money that may never arrive.
  const amountOk = captureStatus === 'COMPLETED'
    && currency === order.currency
    && money(capturedTotal) === money(order.total);

  if (!amountOk) {
    const refund = captureId ? await refundCapture(captureId) : null;
    const refunded = Boolean(refund?.ok);

    // Every unrefunded mismatch is chased, not only the ones where a refund was
    // attempted and failed. A capture we could not even parse an id out of is
    // the case most likely to strand a customer's money, so it must not be the
    // one case that records nothing.
    if (!refunded) {
      await recordIncident(db, 'refund-failed', {
        reason: 'amount-mismatch', captureId, paypalOrderId, reference: order.id,
        capturedTotal, capturedCurrency: currency, captureStatus, orderStatus: status,
        expectedTotal: order.total, expectedCurrency: order.currency,
        customerEmail: order.shippingAddress?.email ?? null,
        paypalError: refund?.error ?? 'no capture id to refund',
      });
    }
    await closeCaptureAttempt(db, paypalOrderId, refunded ? 'refunded-mismatch' : 'mismatch-not-refunded');

    // Telling someone they were not charged when we could not refund them is
    // the one lie that turns a bug into a complaint we deserve.
    return res.status(409).json({
      error: refunded
        ? 'Payment did not match the order and has been refunded. You have not been charged.'
        : 'Payment did not match the order, so it was not completed. If you were charged, we have recorded it and will refund you — please contact us.',
    });
  }

  // The capture id is what a refund needs — the order id will not do. Without
  // it on the order, the back office cannot refund this sale at all.
  order.captureId = captureId;

  // 4. Reserve stock and write the order. If it can no longer be filled, the
  //    money is already ours, so refund before telling the customer.
  try {
    await commitOrder(db, order);
  } catch (err) {
    const refund = captureId ? await refundCapture(captureId) : null;
    const refunded = Boolean(refund?.ok);

    if (!refunded) {
      await recordIncident(db, 'refund-failed', {
        reason: err instanceof StockConflict ? 'stock-conflict' : 'commit-failed',
        captureId, paypalOrderId, reference: order.id,
        capturedTotal, capturedCurrency: currency,
        customerEmail: order.shippingAddress?.email ?? null,
        paypalError: refund?.error ?? 'no capture id to refund',
        commitError: (err as Error).message,
      });
    }
    await closeCaptureAttempt(db, paypalOrderId, refunded ? 'refunded-commit-failed' : 'commit-failed-not-refunded');

    const assurance = refunded
      ? 'You have been refunded — you were not charged.'
      : 'If you were charged, we have recorded it and will refund you — please contact us.';

    if (err instanceof StockConflict) {
      return res.status(409).json({ error: `${err.message} ${assurance}` });
    }
    console.error(`[paypal/capture] commit failed for ${order.id}:`, (err as Error).message);
    return res.status(500).json({
      error: `We took the payment but could not record the order. ${assurance}`,
    });
  }

  // The money is ours and the order exists, so the window opened before the
  // capture is closed. Anything left open is money without an order.
  await closeCaptureAttempt(db, paypalOrderId, 'order-created');

  const confirmationEmail = await finalizeOrder(db, order, caller, priced.contactPhone);
  return res.status(201).json({ order, confirmationEmail });
}
