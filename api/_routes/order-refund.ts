import { adminDb, callerIsAdmin } from '../_firebaseAdmin.js';
import { enforceRateLimit } from '../_rateLimit.js';
import { sendEmail } from '../_email.js';
import { orderRefundedEmail } from '../_templates.js';
import { restockOrder } from '../_orderCore.js';
import { paypalConfigured, refundCapture, lookupCaptureId } from '../_paypal.js';

/**
 * Refund an order in full and put its stock back.
 *
 * Every order in this database was written after a successful capture, so
 * there is no such thing as cancelling an unpaid one — a cancellation IS a
 * refund. That is why this is one operation rather than two.
 *
 * The sequence is not negotiable:
 *
 *   1. Refund the money at PayPal.
 *   2. Only then restock and mark the order refunded, in one transaction.
 *
 * Doing it the other way round means a refund that fails after the order has
 * already been marked refunded — stock back on sale, order closed, and the
 * customer still out of pocket with nothing recording it.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function recordIncident(db: any, kind: string, detail: Record<string, unknown>): Promise<void> {
  console.error(`[order-refund] ${kind}`, JSON.stringify(detail));
  try {
    await db.collection('payment_incidents').add({
      kind, resolved: false, createdAt: new Date().toISOString(), ...detail,
    });
  } catch (err) {
    console.error(`[order-refund] COULD NOT RECORD ${kind}:`, (err as Error).message);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!enforceRateLimit(req, res, 'order-refund', { limit: 30, windowMs: 60_000 })) return;
  if (!(await callerIsAdmin(req))) return res.status(403).json({ error: 'Staff only' });
  if (!paypalConfigured()) return res.status(503).json({ error: 'PayPal is not configured' });

  const orderId = String(req.body?.orderId ?? '').trim().slice(0, 60);
  if (!orderId) return res.status(400).json({ error: 'orderId is required' });

  const db = await adminDb();
  if (!db) return res.status(503).json({ error: 'Database unavailable' });

  const ref = db.collection('orders').doc(orderId);
  const snap = await ref.get();
  if (!snap.exists) return res.status(404).json({ error: 'Order not found' });

  const order = snap.data() as {
    id?: string; status?: string; total?: number; contactEmail?: string;
    captureId?: string | null; paypalOrderId?: string;
    shippingAddress?: Record<string, unknown>;
  };

  // Refunding twice would send a second refund to PayPal and restock the same
  // units again, quietly inventing stock that does not exist.
  if (order.status === 'refunded') {
    return res.status(409).json({ error: 'That order has already been refunded' });
  }

  // Orders written before the capture id was stored have only the PayPal order
  // id; ask PayPal rather than leaving them unrefundable from here.
  let captureId = order.captureId ?? null;
  if (!captureId) {
    if (!order.paypalOrderId) {
      return res.status(422).json({
        error: 'This order has no PayPal reference, so it cannot be refunded here. Refund it in the PayPal dashboard.',
      });
    }
    const found = await lookupCaptureId(order.paypalOrderId);
    if (!found.ok) return res.status(found.status).json({ error: found.error });
    captureId = found.data!;
  }

  // 1. The money first.
  const refund = await refundCapture(captureId);
  if (!refund.ok) {
    await recordIncident(db, 'admin-refund-failed', {
      orderId, captureId, amount: order.total ?? null,
      customerEmail: order.contactEmail ?? null, paypalError: refund.error ?? null,
    });
    return res.status(refund.status).json({ error: refund.error });
  }

  // 2. Then the books. A failure here means money has gone back but the order
  //    still reads as paid and the stock is still off sale — the one state a
  //    human has to reconcile by hand, so it is written down loudly.
  try {
    await restockOrder(db, orderId, {
      status: 'refunded',
      refundedAt: new Date().toISOString(),
      refundedAmount: order.total ?? null,
      captureId,
    });
  } catch (err) {
    await recordIncident(db, 'refund-restock-failed', {
      orderId, captureId, amount: order.total ?? null,
      customerEmail: order.contactEmail ?? null,
      refunded: true, restockError: (err as Error).message,
    });
    return res.status(500).json({
      error: 'The refund went through at PayPal, but the order and stock could not be updated. This has been logged for staff — do not refund again.',
    });
  }

  // 3. Tell the customer. Best-effort: a mail failure must not make a
  //    completed refund look like it failed.
  let emailed = false;
  if (order.contactEmail) {
    const built = orderRefundedEmail(
      { ...order, id: orderId } as Parameters<typeof orderRefundedEmail>[0],
      Number(order.total ?? 0),
    );
    const sent = await sendEmail({
      to: order.contactEmail,
      toName: String(order.shippingAddress?.fullName ?? ''),
      subject: built.subject,
      html: built.html,
      text: built.text,
      tag: 'order-refunded',
    });
    emailed = Boolean(sent.sent);
    if (sent.error) console.error(`[order-refund] receipt for ${orderId}:`, sent.error);
  }

  return res.status(200).json({
    orderId,
    status: 'refunded',
    refundedAmount: order.total ?? null,
    restocked: true,
    emailed,
  });
}
