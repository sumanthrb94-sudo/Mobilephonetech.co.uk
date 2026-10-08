import { adminDb, callerIsAdmin } from '../_firebaseAdmin.js';
import { sendEmail } from '../_email.js';
import { backInStockEmail } from '../_templates.js';

const ID_RE = /^[a-z0-9-]{3,120}$/;

/**
 * Staff: email everyone waiting for a product that is back in stock, once.
 * Each request is marked notifiedAt when its email is accepted, so pressing
 * the button again only reaches people who have not been emailed yet.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!(await callerIsAdmin(req))) return res.status(403).json({ error: 'Staff only' });

  const { productId } = req.body ?? {};
  if (typeof productId !== 'string' || !ID_RE.test(productId)) return res.status(400).json({ error: 'Unknown product.' });

  const db = await adminDb();
  if (!db) return res.status(503).json({ error: 'Database unavailable' });

  const snap = await db.collection('products').doc(productId).get();
  const product = snap.data();
  if (!snap.exists || product?.listed === false) return res.status(404).json({ error: 'Unknown product.' });
  if (!(Number(product?.stock) > 0)) return res.status(409).json({ error: 'It is still out of stock, so nobody has been emailed.' });

  const waiting = await db.collection('stockAlerts').where('productId', '==', productId).where('notifiedAt', '==', null).limit(500).get();
  const name = `${product?.brand ?? ''} ${product?.model ?? ''}`.trim();
  let sent = 0;
  let failed = 0;
  for (const doc of waiting.docs) {
    const a = doc.data();
    const mail = backInStockEmail({ id: productId, name, price: Number(product?.price) || 0, variant: a.variant });
    const result = await sendEmail({ to: String(a.email), subject: mail.subject, html: mail.html, text: mail.text, tag: 'back-in-stock' });
    if (result.sent) {
      await doc.ref.update({ notifiedAt: new Date().toISOString() });
      sent++;
    } else {
      failed++;
    }
  }
  return res.status(200).json({ sent, failed, waiting: waiting.size });
}
