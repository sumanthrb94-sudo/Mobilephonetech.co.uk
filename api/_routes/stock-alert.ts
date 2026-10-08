import { adminDb } from '../_firebaseAdmin.js';
import { enforceRateLimit } from '../_rateLimit.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ID_RE = /^[a-z0-9-]{3,120}$/;

/**
 * "Email me when it's back" for a sold-out product.
 *
 * A shopper who wanted something we did not have is the warmest lead there
 * is, and the demand signal staff most need when deciding what to restock.
 * Each request is one document (product + address, so asking twice does not
 * duplicate it); the admin dashboard counts them per product. The address is
 * used only for that one message — it is not a newsletter subscription.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!enforceRateLimit(req, res, 'stock-alert', { limit: 10, windowMs: 60_000 })) return;

  const { email, productId, variant } = req.body ?? {};
  const address = typeof email === 'string' ? email.trim().toLowerCase() : '';
  if (!EMAIL_RE.test(address) || address.length > 254) return res.status(400).json({ error: 'Enter a valid email address.' });
  if (typeof productId !== 'string' || !ID_RE.test(productId)) return res.status(400).json({ error: 'Unknown product.' });
  const wanted = typeof variant === 'string' ? variant.trim().slice(0, 120) : '';

  const db = await adminDb();
  if (!db) return res.status(503).json({ error: 'Alerts are unavailable right now.' });

  try {
    const product = await db.collection('products').doc(productId).get();
    if (!product.exists || product.data()?.listed === false) return res.status(404).json({ error: 'Unknown product.' });

    const id = `${productId}__${address}`.slice(0, 400).replace(/\//g, '_');
    await db.collection('stockAlerts').doc(id).set({
      productId,
      email: address,
      variant: wanted || null,
      createdAt: new Date().toISOString(),
      notifiedAt: null,
    }, { merge: true });
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[api/stock-alert]', err);
    return res.status(500).json({ error: 'Could not save that just now. Please try again.' });
  }
}
