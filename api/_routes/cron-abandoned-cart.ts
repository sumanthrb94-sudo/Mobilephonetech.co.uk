import { timingSafeEqual } from 'node:crypto';
import { adminDb } from '../_firebaseAdmin.js';
import { sendEmail } from '../_email.js';
import { abandonedCartEmail } from '../_templates.js';

/**
 * Hourly sweep: email anyone who started a checkout, did not finish, and has
 * not already been reminded.
 *
 * Invoked by the Vercel cron declared in vercel.json. Because every route is
 * dispatched through the one catch-all function, adding this costs no extra
 * Serverless Function against the Hobby plan's limit of twelve.
 *
 * Three rules keep this from becoming spam:
 *
 * 1. One reminder per cart, ever. reminderSentAt is stamped before the send
 *    is attempted, so a crash mid-batch cannot produce a second email on the
 *    next run. Losing a reminder is a far cheaper mistake than sending two.
 * 2. A delay before it fires. Someone who wandered off for ten minutes is
 *    still shopping; an email then is an interruption, not a service.
 * 3. A cutoff after which it is too late. A three-day-old basket is a
 *    different decision, and mailing about it reads as surveillance.
 *
 * Vercel cron requests carry an Authorization header set from CRON_SECRET.
 * With that unset the route refuses everything: an open endpoint that mails
 * customers is not something to leave lying around.
 */

const DELAY_HOURS = Number(process.env.ABANDONED_CART_DELAY_HOURS ?? 4);
const CUTOFF_HOURS = Number(process.env.ABANDONED_CART_CUTOFF_HOURS ?? 48);
/** Well under Brevo's 300/day so a backlog can never exhaust the quota that
 *  order confirmations depend on. */
const MAX_PER_RUN = Number(process.env.ABANDONED_CART_MAX_PER_RUN ?? 25);

function authorised(req: { headers?: Record<string, unknown>; query?: Record<string, unknown> }): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;

  const header = String(req.headers?.authorization ?? '');
  const provided = header.startsWith('Bearer ') ? header.slice(7) : String(req.query?.secret ?? '');

  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) {
    timingSafeEqual(b, b);
    return false;
  }
  return timingSafeEqual(a, b);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!authorised(req)) return res.status(403).json({ error: 'Forbidden' });

  const db = await adminDb();
  if (!db) return res.status(503).json({ error: 'Database unavailable' });

  const now = Date.now();
  const readyBefore = new Date(now - DELAY_HOURS * 3600_000).toISOString();
  const tooOld = new Date(now - CUTOFF_HOURS * 3600_000).toISOString();

  let carts;
  try {
    // Ordering by startedAt lets Firestore serve this from an index rather
    // than scanning the collection as it grows.
    carts = await db
      .collection('abandonedCarts')
      .where('status', '==', 'started')
      .where('startedAt', '<=', readyBefore)
      .orderBy('startedAt', 'desc')
      .limit(MAX_PER_RUN * 3)
      .get();
  } catch (err) {
    return res.status(500).json({ error: 'Query failed', detail: (err as Error).message });
  }

  const tally = { considered: carts.size, sent: 0, skipped: 0, expired: 0, failed: 0 };

  for (const doc of carts.docs) {
    if (tally.sent >= MAX_PER_RUN) break;

    const cart = doc.data() as Record<string, any>;

    if (cart.reminderSentAt) {
      tally.skipped++;
      continue;
    }
    if (String(cart.startedAt ?? '') < tooOld) {
      // Close it so the query stops returning it every hour forever.
      await doc.ref.set({ status: 'expired', updatedAt: new Date().toISOString() }, { merge: true });
      tally.expired++;
      continue;
    }
    if (!Array.isArray(cart.items) || !cart.items.length) {
      tally.skipped++;
      continue;
    }

    // Stamped BEFORE the send. If the function dies between here and the API
    // call the customer gets no reminder, which is the failure worth having.
    try {
      await doc.ref.set({ reminderSentAt: new Date().toISOString() }, { merge: true });
    } catch {
      tally.failed++;
      continue;
    }

    const mail = abandonedCartEmail({
      items: cart.items,
      total: cart.total,
      name: cart.name,
      recoveryUrl: `${(process.env.PUBLIC_SITE_URL || 'https://lehart.co.uk').replace(/\/+$/, '')}/cart`,
    });

    const result = await sendEmail({
      to: doc.id,
      toName: cart.name ?? undefined,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
      tag: 'abandoned-cart',
    });

    if (result.sent) tally.sent++;
    else {
      tally.failed++;
      console.error(`[cron/abandoned-cart] ${doc.id}: ${result.error ?? result.skipped}`);
    }
  }

  return res.status(200).json({ ok: true, ...tally });
}
