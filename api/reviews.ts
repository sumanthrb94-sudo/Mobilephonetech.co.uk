import { adminDb } from './_firebaseAdmin.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function handler(req: any, res: any) {
  if (req.method === 'GET') {
    return getReviews(req, res);
  }
  if (req.method === 'POST') {
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

  const db = adminDb();
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

  const db = adminDb();
  if (!db) return res.status(503).json({ error: 'Reviews are unavailable' });

  try {
    const createdAt = new Date().toISOString();
    const body = {
      productId,
      rating,
      title: title?.trim() ?? null,
      comment: comment?.trim() ?? null,
      userName: userName.trim(),
      // Never trusted from the request: the badge means a verified purchase,
      // so a reviewer must not be able to award it to themselves.
      isVerified: false,
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
