import { adminDb, verifyCaller } from '../_firebaseAdmin.js';
import { checkEligibility, REVIEW_WAIT_DAYS } from '../_reviewEligibility.js';

/**
 * May the caller review this product, and if not, why?
 *
 * Its own route so the product page can ask before showing a form. Offering
 * a review box to someone who will be turned away on submit wastes their
 * writing, and a form that appears for everyone implies anyone may review —
 * which is the impression this whole change exists to correct.
 *
 * The answer is computed by the same function the write path uses, so the
 * form cannot be shown to someone the POST would refuse.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const productId = String(req.query?.productId ?? '').trim();
  if (!productId) return res.status(400).json({ error: 'productId is required' });

  const db = await adminDb();
  if (!db) return res.status(503).json({ error: 'Reviews are unavailable' });

  try {
    const caller = await verifyCaller(req);
    const result = await checkEligibility(db, caller?.uid ?? null, productId);
    return res.status(200).json({ ...result, waitDays: REVIEW_WAIT_DAYS });
  } catch (err) {
    console.error('[api/review-eligibility]', err);
    return res.status(500).json({ error: 'Could not check review eligibility' });
  }
}
