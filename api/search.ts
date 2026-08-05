import { adminDb } from './_firebaseAdmin.js';

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

  const db = await adminDb();
  if (!db) return res.status(503).json({ error: 'Search is unavailable' });

  try {
    // Firestore has no LIKE, so search runs against the `searchTerms` array
    // that every product write regenerates (see productMapper.buildSearchTerms).
    // array-contains matches whole tokens and prefixes, which covers "iph",
    // "iphone", "apple" — enough for autocomplete without a search service.
    const term = q.toLowerCase();
    const snap = await db.collection('products')
      .where('searchTerms', 'array-contains', term)
      .where('stock', '>', 0)
      .limit(limit)
      .get();

    const data = snap.docs.map(d => {
      const v = d.data();
      return {
        id: d.id,
        model: v.model,
        brand: v.brand,
        price: v.price,
        image_url: v.imageUrl ?? null,
        grade: v.grade,
        category: v.category,
      };
    });
    // Firestore cannot order by price while range-filtering stock, so the
    // cheapest-first ordering the UI expects is applied here.
    data.sort((a, b) => Number(a.price ?? 0) - Number(b.price ?? 0));

    // Derive unique brand/model suggestions for autocomplete chips
    const seen = new Set<string>();
    const suggestions: string[] = [];
    for (const row of data) {
      const key = `${row.brand} ${row.model}`;
      if (!seen.has(key)) { seen.add(key); suggestions.push(key); }
      if (suggestions.length >= 5) break;
    }

    return res.status(200).json({ suggestions, products: data });
  } catch (err) {
    console.error('[api/search]', err);
    return res.status(500).json({ error: 'Search failed' });
  }
}
