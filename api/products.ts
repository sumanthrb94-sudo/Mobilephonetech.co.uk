import { adminDb } from './_firebaseAdmin.js';

const VALID_SORTS = ['price_asc', 'price_desc', 'newest', 'discount'] as const;
type SortMode = (typeof VALID_SORTS)[number];

/**
 * Paginated, filtered product list.
 *
 * Firestore allows one range filter per query and no OR across fields, so
 * expressing this filter set as a query would need a composite index per
 * combination — and still could not express the multi-select cases. The
 * catalogue is a few hundred documents, so it is read once (narrowed by
 * category server-side where possible) and filtered in memory, which keeps the
 * response shape and the filter semantics identical to the SQL version.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const q = req.query as Record<string, string | undefined>;

  // Parse & clamp pagination
  const page  = Math.max(1, parseInt(q.page  ?? '1',  10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(q.limit ?? '20', 10) || 20));

  // Validate sort
  const sort: SortMode = VALID_SORTS.includes(q.sort as SortMode)
    ? (q.sort as SortMode)
    : 'newest';

  // Validate price bounds
  const minPrice = q.minPrice ? parseFloat(q.minPrice) : null;
  const maxPrice = q.maxPrice ? parseFloat(q.maxPrice) : null;
  if (minPrice !== null && isNaN(minPrice)) return res.status(400).json({ error: 'Invalid minPrice' });
  if (maxPrice !== null && isNaN(maxPrice)) return res.status(400).json({ error: 'Invalid maxPrice' });
  if (minPrice !== null && maxPrice !== null && minPrice > maxPrice) {
    return res.status(400).json({ error: 'minPrice must be ≤ maxPrice' });
  }

  const db = await adminDb();
  if (!db) return res.status(503).json({ error: 'Products are unavailable' });

  try {
    // Category is the one filter that is always a single value, so it can be
    // pushed down to Firestore; everything else is multi-select or a range.
    const base = db.collection('products');
    const snap = await (q.category
      ? base.where('category', '==', q.category).limit(1000)
      : base.limit(1000)
    ).get();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let rows = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));

    const csv = (v?: string) => (v ? v.split(',').map(s => s.trim()).filter(Boolean) : []);

    const brands = csv(q.brand);
    if (brands.length) rows = rows.filter(r => brands.includes(r.brand));

    const grades = csv(q.grade);
    if (grades.length) rows = rows.filter(r => grades.includes(r.grade));

    const storages = csv(q.storage);
    if (storages.length) rows = rows.filter(r => storages.includes(r.storage));

    if (minPrice !== null) rows = rows.filter(r => Number(r.price ?? 0) >= minPrice);
    if (maxPrice !== null) rows = rows.filter(r => Number(r.price ?? 0) <= maxPrice);
    if (q.inStock === 'true') rows = rows.filter(r => Number(r.stock ?? 0) > 0);

    if (q.search) {
      const term = q.search.trim().toLowerCase();
      rows = rows.filter(r =>
        String(r.model ?? '').toLowerCase().includes(term) ||
        String(r.brand ?? '').toLowerCase().includes(term));
    }

    switch (sort) {
      case 'price_asc':  rows.sort((a, b) => Number(a.price ?? 0) - Number(b.price ?? 0)); break;
      case 'price_desc': rows.sort((a, b) => Number(b.price ?? 0) - Number(a.price ?? 0)); break;
      case 'discount':   rows.sort((a, b) => Number(b.originalPrice ?? 0) - Number(a.originalPrice ?? 0)); break;
      default:
        rows.sort((a, b) => String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? '')));
    }

    const total      = rows.length;
    const totalPages = Math.ceil(total / limit);
    const offset     = (page - 1) * limit;

    return res.status(200).json({
      products: rows.slice(offset, offset + limit),
      total,
      page,
      limit,
      totalPages,
      hasMore: page < totalPages,
    });
  } catch (err) {
    console.error('[api/products]', err);
    return res.status(500).json({ error: 'Failed to fetch products' });
  }
}
