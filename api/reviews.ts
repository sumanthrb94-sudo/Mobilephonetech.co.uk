import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL ?? '',
  process.env.VITE_SUPABASE_ANON_KEY ?? '',
);

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

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, count, error } = await (supabase.from('reviews') as any)
      .select('id, rating, title, comment, user_name, is_verified, created_at', { count: 'exact' })
      .eq('product_id', productId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    const reviews = data ?? [];
    const avgRating = reviews.length
      ? reviews.reduce((s: number, r: any) => s + r.rating, 0) / reviews.length
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

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from('reviews') as any)
      .insert({
        product_id:  productId,
        rating,
        title:       title?.trim() ?? null,
        comment:     comment?.trim() ?? null,
        user_name:   userName.trim(),
        is_verified: false,
      })
      .select('id, rating, user_name, created_at')
      .single();

    if (error) throw error;
    return res.status(201).json({ review: data });
  } catch (err) {
    console.error('[api/reviews POST]', err);
    return res.status(500).json({ error: 'Failed to submit review' });
  }
}
