import { adminDb } from '../_firebaseAdmin.js';
import { enforceRateLimit } from '../_rateLimit.js';
import { looksLikeEmail } from '../_email.js';
import { upsertContact } from '../_brevoContacts.js';

/**
 * Record that a checkout was started, so an unfinished one can be recovered.
 *
 * Called from the checkout flow the moment we have an email address — which
 * is the earliest point a recovery is possible at all. Before that there is
 * nobody to write to.
 *
 * Deliberately NOT a source of pricing. The stored basket is a record of
 * intent used to write a reminder email; the real prices are recomputed by
 * api/_routes/orders.ts when the order is actually placed. A recovery email
 * that quoted a browser-supplied total would be the same price-tampering hole
 * that orders.ts was rewritten to close, reintroduced through the back door.
 * The total here is display-only and clearly marked as such.
 */

const MAX_LINES = 20;
const clean = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!enforceRateLimit(req, res, 'cart-events', { limit: 20, windowMs: 60_000 })) return;

  const body = req.body ?? {};
  const email = clean(body.email, 254).toLowerCase();
  if (!looksLikeEmail(email)) {
    return res.status(400).json({ error: 'A valid email is required' });
  }

  const status = clean(body.status, 20) || 'started';
  if (!['started', 'completed'].includes(status)) {
    return res.status(400).json({ error: 'status must be started or completed' });
  }

  const db = await adminDb();
  if (!db) return res.status(503).json({ error: 'Unavailable' });

  const ref = db.collection('abandonedCarts').doc(email);

  // A completed checkout closes the record rather than deleting it — the
  // sweep needs to see that it was recovered, and deleting would let a later
  // "started" event resurrect a cart the customer has already paid for.
  if (status === 'completed') {
    try {
      await ref.set(
        { status: 'completed', completedAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { merge: true },
      );
    } catch (err) {
      console.error('[api/cart-events]', (err as Error).message);
    }
    return res.status(200).json({ ok: true, status: 'completed' });
  }

  const rawItems = Array.isArray(body.items) ? body.items.slice(0, MAX_LINES) : [];
  if (!rawItems.length) return res.status(400).json({ error: 'items is required' });

  const items = rawItems.map((line: Record<string, unknown>) => ({
    brand: clean(line.brand, 60),
    model: clean(line.model, 120),
    quantity: Math.max(1, Math.min(5, Number(line.quantity) || 1)),
    // Display-only, see the module comment. Never used to charge anyone.
    price: Number.isFinite(Number(line.price)) ? Number(line.price) : 0,
    imageUrl: clean(line.imageUrl, 500) || null,
    selectedStorage: clean(line.selectedStorage, 60) || null,
    selectedColor: clean(line.selectedColor, 60) || null,
    selectedCondition: clean(line.selectedCondition, 60) || null,
  }));

  const now = new Date().toISOString();

  try {
    // startedAt is only set on creation, so a customer who reopens checkout
    // three times does not keep resetting the delay before the reminder.
    const existing = await ref.get();
    await ref.set(
      {
        email,
        name: clean(body.name, 120) || null,
        items,
        total: Number.isFinite(Number(body.total)) ? Number(body.total) : 0,
        status: 'started',
        updatedAt: now,
        ...(existing.exists && existing.data()?.status === 'started' ? {} : { startedAt: now, reminderSentAt: null }),
      },
      { merge: true },
    );
  } catch (err) {
    console.error('[api/cart-events]', (err as Error).message);
    return res.status(500).json({ error: 'Could not record the cart' });
  }

  // Best-effort: the contact needs to exist in Brevo before any automation
  // built there can target it. A failure here costs nothing — the cron sweep
  // in cron-abandoned-cart.ts sends from Firestore regardless.
  const contact = await upsertContact({
    email,
    firstName: clean(body.name, 120).split(/\s+/)[0] || null,
    attributes: { LAST_CART_AT: now, CART_VALUE: Number(body.total) || 0 },
  });
  if (contact.error) console.error('[api/cart-events] brevo contact:', contact.error);

  return res.status(200).json({ ok: true, status: 'started' });
}
