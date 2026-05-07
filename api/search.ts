import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL ?? '',
  process.env.VITE_SUPABASE_ANON_KEY ?? '',
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const q = (req.query?.q ?? '').toString().trim();
  if (!q || q.length < 2) {
    return res.status(200).json({ suggestions: [], products: [] });
  }
  if (q.length > 100) {
    return res.status(400).json({ error: 'Query too long' });
  }

  const limit = Math.min(10, parseInt(req.query?.limit ?? '8', 10) || 8);

  try {
    const term = `%${q}%`;

    const { data, error } = await supabase
      .from('products')
      .select('id, model, brand, price, image_url, grade, category')
      .or(`model.ilike.${term},brand.ilike.${term}`)
      .gt('stock', 0)
      .order('price', { ascending: true })
      .limit(limit);

    if (error) throw error;

    // Derive unique brand/model suggestions for autocomplete chips
    const seen = new Set<string>();
    const suggestions: string[] = [];
    for (const row of (data ?? [])) {
      const key = `${row.brand} ${row.model}`;
      if (!seen.has(key)) { seen.add(key); suggestions.push(key); }
      if (suggestions.length >= 5) break;
    }

    return res.status(200).json({ suggestions, products: data ?? [] });
  } catch (err) {
    console.error('[api/search]', err);
    return res.status(500).json({ error: 'Search failed' });
  }
}
