import { adminDb } from '../_firebaseAdmin.js';
import { enforceRateLimit } from '../_rateLimit.js';
import { docToProduct } from '../../src/lib/productMapper.js';

const FETCH_CAP = 500;

/**
 * The whole catalogue, cached at the edge.
 *
 * Every visitor used to cost a direct Firestore read of all ~140 products —
 * CatalogueContext held them in memory for the tab, but each NEW tab paid the
 * read again. On the Spark plan's ~50,000 reads/day that alone goes over
 * quota at a few hundred visitors, before a single product page is opened.
 *
 * Routing the same fetch through this endpoint instead, with a CDN cache in
 * front of it, changes the read cost from "once per visitor" to "once per
 * cache window, for every visitor combined" — Vercel's edge serves the
 * cached response to everyone until it expires, and only a cache miss ever
 * reaches Firestore. `stale-while-revalidate` means a visitor who happens to
 * hit the exact moment it expires still gets the old (briefly stale) list
 * instantly, while one background request refreshes it for the next window,
 * rather than every concurrent visitor blocking on a fresh read at once.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!enforceRateLimit(req, res, 'catalogue', { limit: 30, windowMs: 60_000 })) return;

  const db = await adminDb();
  if (!db) return res.status(503).json({ error: 'Catalogue is unavailable' });

  try {
    const snap = await db.collection('products').limit(FETCH_CAP).get();

    // Same tie-break as the client-side fetchCatalogue this replaces: sort on
    // whichever timestamp the writer actually set, since an orderBy in the
    // query itself would silently drop any document missing that field.
    const products = snap.docs
      .map(d => ({ id: d.id, data: d.data() as Record<string, unknown> }))
      .sort((a, b) => String(b.data.createdAt ?? b.data.updatedAt ?? '')
        .localeCompare(String(a.data.createdAt ?? a.data.updatedAt ?? '')))
      .map(r => docToProduct(r.id, r.data));

    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600');
    return res.status(200).json({ products });
  } catch (err) {
    console.error('[api/catalogue]', err);
    return res.status(500).json({ error: 'Failed to fetch catalogue' });
  }
}
