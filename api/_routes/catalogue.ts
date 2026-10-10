import { adminDb } from '../_firebaseAdmin.js';
import { enforceRateLimit } from '../_rateLimit.js';
import { docToProduct, forShop, isListed } from '../../src/lib/productMapper.js';

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
    // The home page rows (Admin → Series) travel with the products: the
    // rows are useless without them, and a second request from the browser
    // meant loading the Firestore client before the home page could finish.
    const [snap, panelSnap] = await Promise.all([
      db.collection('products').limit(FETCH_CAP).get(),
      db.collection('seriesPanels').get(),
    ]);
    const panels = panelSnap.docs
      .map(d => ({ ...plain(d.data() as Record<string, unknown>), id: d.id }) as Record<string, unknown>)
      .filter(p => p.active === true);

    // Same tie-break as the client-side fetchCatalogue this replaces: sort on
    // whichever timestamp the writer actually set, since an orderBy in the
    // query itself would silently drop any document missing that field.
    const products = snap.docs
      .map(d => ({ id: d.id, data: d.data() as Record<string, unknown> }))
      // Drafts (imported models without prices or photos yet) stay in admin.
      .filter(r => isListed(r.data))
      .sort((a, b) => String(b.data.createdAt ?? b.data.updatedAt ?? '')
        .localeCompare(String(a.data.createdAt ?? a.data.updatedAt ?? '')))
      .map(r => forShop(docToProduct(r.id, r.data)));

    // Checkout charges the price in the database, so the shop must not show
    // an old one for long. Browsers never reuse a copy (stale-while-revalidate
    // in this header let them flash the previous price); only Vercel's edge
    // caches, through its own header: fresh for 60s, then served instantly
    // while it refreshes in the background for up to 5 minutes more. Building
    // the list takes ~400ms (every product read from Firestore), and with a
    // 30s window most shoppers paid that; now almost none do, and a staff
    // edit still shows within about a minute.
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Vercel-CDN-Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    return res.status(200).json({ products, panels });
  } catch (err) {
    console.error('[api/catalogue]', err);
    return res.status(500).json({ error: 'Failed to fetch catalogue' });
  }
}

/** Only the JSON-safe fields of a stored row (timestamps become ISO strings). */
function plain(data: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    const ts = v as { toDate?: () => Date } | null;
    out[k] = ts && typeof ts.toDate === 'function' ? ts.toDate().toISOString() : v;
  }
  return out;
}
