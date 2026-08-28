import { adminDb, callerIsAdmin } from '../_firebaseAdmin.js';
import { enforceRateLimit } from '../_rateLimit.js';
import { sendEmail, emailConfigured } from '../_email.js';
import { orderConfirmationEmail, orderDispatchedEmail, outForDeliveryEmail } from '../_templates.js';
import { sendSms, smsConfigured } from '../_sms.js';
import type { OrderLike, DispatchInfo } from '../_templates.js';

/**
 * Move an order along and tell the customer — dispatched, out for delivery,
 * delivered.
 *
 * Staff-only, and deliberately stricter than api/_routes/return-notify.ts: a
 * return notification can be triggered by the customer it belongs to, but
 * nobody outside the business has any business declaring an order dispatched.
 * A customer who could would be able to start the returns clock early on
 * goods that had not moved.
 *
 * The status write and the email are one operation on purpose. Two endpoints —
 * one to set the status, one to send the mail — is how orders end up marked
 * dispatched with the customer never told, which is the single most common
 * support complaint in a shop this size.
 *
 * The recipient always comes from the stored order, never the request body.
 * Otherwise this route would forward an arbitrary email to an arbitrary
 * address on our warmed sending domain, which is a spam relay with extra
 * steps.
 */

type Kind = 'confirmation' | 'dispatched' | 'out-for-delivery';

/** The order status each notification implies. */
const STATUS_FOR: Record<Kind, string> = {
  confirmation: 'confirmed',
  dispatched: 'dispatched',
  'out-for-delivery': 'out-for-delivery',
};

const clean = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max);

/**
 * A tracking URL is put in front of a customer and clicked, so it may only
 * ever be http(s). Without this check a stored `javascript:` or `data:` URL
 * would be rendered as the primary call to action in the email.
 */
function safeUrl(value: unknown): string | undefined {
  const raw = clean(value, 500);
  if (!raw) return undefined;
  try {
    const url = new URL(raw);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!enforceRateLimit(req, res, 'order-notify', { limit: 60, windowMs: 60_000 })) return;

  if (!(await callerIsAdmin(req))) {
    return res.status(403).json({ error: 'Staff only' });
  }

  const orderId = clean(req.body?.orderId, 60);
  const kind = clean(req.body?.kind, 40) as Kind;
  if (!orderId) return res.status(400).json({ error: 'orderId is required' });
  if (!STATUS_FOR[kind]) {
    return res.status(400).json({ error: 'kind must be confirmation, dispatched or out-for-delivery' });
  }

  const db = await adminDb();
  if (!db) return res.status(503).json({ error: 'Database unavailable' });

  const ref = db.collection('orders').doc(orderId);
  const snap = await ref.get();
  if (!snap.exists) return res.status(404).json({ error: 'Order not found' });

  const order = snap.data() as OrderLike & { contactEmail?: string };

  const to = clean(order.contactEmail, 254);
  if (!to) return res.status(422).json({ error: 'Order has no contact address' });

  const info: DispatchInfo = {
    courier: clean(req.body?.courier, 60) || undefined,
    trackingNumber: clean(req.body?.trackingNumber, 80) || undefined,
    trackingUrl: safeUrl(req.body?.trackingUrl),
    estimatedDelivery: clean(req.body?.estimatedDelivery, 120) || undefined,
  };

  const built =
    kind === 'dispatched'
      ? orderDispatchedEmail(order, info)
      : kind === 'out-for-delivery'
        ? outForDeliveryEmail(order, info)
        : orderConfirmationEmail(order);

  // Status first. If the write fails the customer must not be told the parcel
  // moved — an email cannot be recalled, but an unsent one can be retried.
  try {
    await ref.set(
      {
        status: STATUS_FOR[kind],
        updatedAt: new Date().toISOString(),
        ...(kind === 'dispatched'
          ? {
              dispatchedAt: new Date().toISOString(),
              courier: info.courier ?? null,
              trackingNumber: info.trackingNumber ?? null,
              trackingUrl: info.trackingUrl ?? null,
            }
          : {}),
      },
      { merge: true },
    );
  } catch (err) {
    return res.status(500).json({ error: 'Could not update the order', detail: (err as Error).message });
  }

  const result = await sendEmail({
    to,
    toName: order.shippingAddress?.fullName,
    subject: built.subject,
    html: built.html,
    text: built.text,
    tag: `order-${kind}`,
  });

  // ── Optional SMS, only for the doorstep message ──
  // This is the one notification where a text genuinely beats an email: nobody
  // checks their inbox to find out whether to stay in. It costs Brevo credits,
  // so it is opt-in per call rather than automatic, and a failure here never
  // affects the email that already went.
  let sms;
  if (kind === 'out-for-delivery' && req.body?.sendSms === true) {
    const phone = order.shippingAddress?.phone;
    const arriving = info.estimatedDelivery?.trim() || 'today';
    sms = await sendSms({
      to: phone,
      content: `LeHart: your order ${orderId} is out for delivery and arriving ${arriving}.${
        info.trackingUrl ? ` Track: ${info.trackingUrl}` : ''
      }`,
      tag: 'out-for-delivery',
    });
    if (sms.error) console.error(`[api/order-notify] sms for ${orderId}:`, sms.error);
  }

  // The status change stuck either way, so a failed send is reported as 502
  // with the new status included — the caller needs to know not to retry the
  // status, only the mail.
  return res.status(result.error ? 502 : 200).json({
    ...result,
    orderId,
    status: STATUS_FOR[kind],
    configured: emailConfigured(),
    ...(sms ? { sms: { sent: sms.sent, skipped: sms.skipped, error: sms.error, creditsUsed: sms.creditsUsed } } : {}),
    smsAvailable: smsConfigured(),
  });
}
