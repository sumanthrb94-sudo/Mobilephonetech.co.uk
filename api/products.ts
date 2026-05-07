import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL ?? '',
  process.env.VITE_SUPABASE_ANON_KEY ?? '',
);

const VALID_SORTS = ['price_asc', 'price_desc', 'newest', 'discount'] as const;
type SortMode = (typeof VALID_SORTS)[number];

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

  try {
    // Count query
    let countQuery = supabase.from('products').select('id', { count: 'exact', head: true });
    let dataQuery  = supabase.from('products').select('*, product_variants(*)');

    // ── Filters ─────────────────────────────────────────
    if (q.brand) {
      const brands = q.brand.split(',').map(b => b.trim()).filter(Boolean);
      countQuery = countQuery.in('brand', brands);
      dataQuery  = dataQuery.in('brand', brands);
    }
    if (q.grade) {
      const grades = q.grade.split(',').map(g => g.trim()).filter(Boolean);
      countQuery = countQuery.in('grade', grades);
      dataQuery  = dataQuery.in('grade', grades);
    }
    if (q.category) {
      countQuery = countQuery.eq('category', q.category);
      dataQuery  = dataQuery.eq('category', q.category);
    }
    if (q.storage) {
      const storages = q.storage.split(',').map(s => s.trim()).filter(Boolean);
      countQuery = countQuery.in('storage', storages);
      dataQuery  = dataQuery.in('storage', storages);
    }
    if (minPrice !== null) {
      countQuery = countQuery.gte('price', minPrice);
      dataQuery  = dataQuery.gte('price', minPrice);
    }
    if (maxPrice !== null) {
      countQuery = countQuery.lte('price', maxPrice);
      dataQuery  = dataQuery.lte('price', maxPrice);
    }
    if (q.inStock === 'true') {
      countQuery = countQuery.gt('stock', 0);
      dataQuery  = dataQuery.gt('stock', 0);
    }
    if (q.search) {
      const term = `%${q.search.trim()}%`;
      countQuery = countQuery.or(`model.ilike.${term},brand.ilike.${term}`);
      dataQuery  = dataQuery.or(`model.ilike.${term},brand.ilike.${term}`);
    }

    // ── Sort ─────────────────────────────────────────────
    switch (sort) {
      case 'price_asc':  dataQuery = dataQuery.order('price', { ascending: true });  break;
      case 'price_desc': dataQuery = dataQuery.order('price', { ascending: false }); break;
      case 'discount':   dataQuery = dataQuery.order('original_price', { ascending: false }); break;
      default:           dataQuery = dataQuery.order('created_at', { ascending: false });
    }

    // ── Pagination ────────────────────────────────────────
    const offset = (page - 1) * limit;
    dataQuery = dataQuery.range(offset, offset + limit - 1);

    const [{ count }, { data: products, error }] = await Promise.all([
      countQuery,
      dataQuery,
    ]);

    if (error) throw error;

    const total      = count ?? 0;
    const totalPages = Math.ceil(total / limit);

    return res.status(200).json({
      products: products ?? [],
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
