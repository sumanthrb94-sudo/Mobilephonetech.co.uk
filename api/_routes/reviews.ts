import { adminDb, verifyCaller } from '../_firebaseAdmin.js';
import { enforceRateLimit } from '../_rateLimit.js';
import { checkEligibility } from '../_reviewEligibility.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function handler(req: any, res: any) {
  if (req.method === 'GET') {
    return getReviews(req, res);
  }
  if (req.method === 'POST') {
    // Still capped, though the eligibility check below is now the real
    // defence: a caller has to be signed in AND have taken delivery of this
    // exact product before anything is written.
    if (!enforceRateLimit(req, res, 'reviews', { limit: 5, windowMs: 60_000 })) return;
    return postReview(req, res);
  }
  return res.status(405).json({ error: 'Method not allowed' });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getReviews(req: any, res: any) {
  const { productId, page: pageStr, limit: limitStr } = req.query ?? {};
  if (!productId) return res.status(400).json({ error: 'productId is required' });

  const page  = Math.max(1, parseInt(pageStr  ?? '1',  10) || 1);
  const limit = Math.min(50, parseInt(limitStr ?? '10', 10) || 10);
  const offset = (page - 1) * limit;

  const db = await adminDb();
  if (!db) return res.status(503).json({ error: 'Reviews are unavailable' });

  try {
    const base = db.collection('reviews').where('productId', '==', productId);

    // Firestore has no OFFSET. Pages are small and reviews are capped at 50 per
    // page, so the page is sliced from an ordered read rather than paying for a
    // cursor round-trip; the count comes from a separate aggregation query,
    // which is billed as one read rather than one per document.
    const [countSnap, snap] = await Promise.all([
      base.count().get(),
      base.orderBy('createdAt', 'desc').limit(offset + limit).get(),
    ]);

    const count = countSnap.data().count;
    const reviews = snap.docs.slice(offset).map(d => {
      const v = d.data();
      return {
        id: d.id,
        rating: v.rating,
        title: v.title ?? null,
        comment: v.comment ?? null,
        user_name: v.userName ?? null,
        is_verified: Boolean(v.isVerified),
        created_at: v.createdAt ?? null,
      };
    });

    const avgRating = reviews.length
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? reviews.reduce((sum: number, r: any) => sum + Number(r.rating ?? 0), 0) / reviews.length
      : null;

    return res.status(200).json({
      reviews,
      total: count ?? 0,
      page,
      totalPages: Math.ceil((count ?? 0) / limit),
      averageRating: avgRating ? Math.round(avgRating * 10) / 10 : null,
    });
  } catch (err) {
    console.error('[api/reviews GET]', err);
    return res.status(500).json({ error: 'Failed to fetch reviews' });
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function postReview(req: any, res: any) {
  const { productId, rating, title, comment, userName } = req.body ?? {};

  if (!productId) return res.status(400).json({ error: 'productId is required' });
  if (!userName || typeof userName !== 'string' || userName.trim().length === 0) {
    return res.status(400).json({ error: 'userName is required' });
  }
  if (!rating || typeof rating !== 'number' || rating < 1 || rating > 5 || !Number.isInteger(rating)) {
    return res.status(400).json({ error: 'rating must be an integer between 1 and 5' });
  }
  if (comment && (typeof comment !== 'string' || comment.length > 2000)) {
    return res.status(400).json({ error: 'comment must be under 2000 characters' });
  }
  if (title && (typeof title !== 'string' || title.length > 200)) {
    return res.status(400).json({ error: 'title must be under 200 characters' });
  }

  const db = await adminDb();
  if (!db) return res.status(503).json({ error: 'Reviews are unavailable' });

  /**
   * Who is asking. This endpoint used to take no authentication at all, so
   * any caller could post any rating for any product under any name — which
   * is both the obvious abuse and, under the DMCC Act 2024, a compliance
   * problem in its own right.
   */
  const caller = await verifyCaller(req);
  const uid = caller?.uid ?? null;

  try {
    const eligibility = await checkEligibility(db, uid, String(productId));
    if (!eligibility.eligible) {
      // 401 when signing in would fix it, 403 when it would not — so the
      // client knows whether to offer a sign-in or an explanation.
      const status = eligibility.code === 'not-signed-in' ? 401 : 403;
      return res.status(status).json({ error: eligibility.reason, code: eligibility.code });
    }

    const createdAt = new Date().toISOString();
    const body = {
      productId,
      rating,
      title: title?.trim() ?? null,
      comment: comment?.trim() ?? null,
      userName: userName.trim(),
      userId: uid,
      orderId: eligibility.orderId ?? null,
      // Not taken from the request — it never was. It is true because the
      // check above proved it, which is the only way this badge means
      // anything to the person reading it.
      isVerified: true,
      createdAt,
    };
    const ref = await db.collection('reviews').add(body);
    const data = { id: ref.id, rating, user_name: body.userName, created_at: createdAt };

    return res.status(201).json({ review: data });
  } catch (err) {
    console.error('[api/reviews POST]', err);
    return res.status(500).json({ error: 'Failed to submit review' });
  }
}
