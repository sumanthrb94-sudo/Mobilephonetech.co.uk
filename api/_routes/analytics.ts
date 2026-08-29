import { adminDb, callerIsAdmin } from '../_firebaseAdmin.js';
import { enforceRateLimit } from '../_rateLimit.js';

/**
 * The numbers behind the admin console's Analytics page.
 *
 * Staff-only: traffic, revenue and margin are not public, and the stock
 * valuation here is derived from buy prices, which are commercially sensitive
 * in a way the catalogue is not.
 *
 * Two sources, joined here rather than in the browser:
 *
 *   analyticsDaily/{YYYY-MM-DD}  cookieless counters from api/_routes/track.ts
 *   orders/, stockUnits/         what actually happened
 *
 * Traffic without orders is vanity and orders without traffic have no
 * explanation, so the one number worth the page — views to orders, per
 * product — needs both, and needs them in one place.
 */

const MAX_DAYS = 90;
const DEFAULT_DAYS = 30;

/** ISO days, newest last, so a chart can render straight from it. */
function dayRange(days: number): string[] {
  const out: string[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

function topOf(map: Record<string, number> | undefined, limit: number, strip = '') {
  return Object.entries(map ?? {})
    .map(([k, v]) => ({ key: strip && k.startsWith(strip) ? k.slice(strip.length) : k, count: Number(v) || 0 }))
    .filter((e) => e.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  if (!enforceRateLimit(req, res, 'analytics', { limit: 30, windowMs: 60_000 })) return;
  if (!(await callerIsAdmin(req))) return res.status(403).json({ error: 'Staff only' });

  const db = await adminDb();
  if (!db) return res.status(503).json({ error: 'Database unavailable' });

  const days = Math.min(MAX_DAYS, Math.max(1, Number(req.query?.days) || DEFAULT_DAYS));
  const range = dayRange(days);
  const since = range[0];

  // ── Traffic ────────────────────────────────────────────────
  const daySnaps = await db.collection('analyticsDaily')
    .where('day', '>=', since)
    .orderBy('day')
    .get()
    .catch(() => null);

  const byDay = new Map<string, any>();
  daySnaps?.docs.forEach((d) => byDay.set(d.id, d.data()));

  const pathTotals: Record<string, number> = {};
  const productTotals: Record<string, number> = {};
  const cartTotals: Record<string, number> = {};
  const searchTotals: Record<string, number> = {};
  const kindTotals: Record<string, number> = {};

  const series = range.map((day) => {
    const d = byDay.get(day);
    const t = d?.totals ?? {};
    for (const [k, v] of Object.entries(t)) kindTotals[k] = (kindTotals[k] ?? 0) + (Number(v) || 0);
    for (const [k, v] of Object.entries(d?.paths ?? {})) pathTotals[k] = (pathTotals[k] ?? 0) + (Number(v) || 0);
    for (const [k, v] of Object.entries(d?.searches ?? {})) searchTotals[k] = (searchTotals[k] ?? 0) + (Number(v) || 0);
    for (const [k, v] of Object.entries(d?.products ?? {})) {
      if (k.startsWith('product_view:')) productTotals[k] = (productTotals[k] ?? 0) + (Number(v) || 0);
      else if (k.startsWith('add_to_cart:')) cartTotals[k] = (cartTotals[k] ?? 0) + (Number(v) || 0);
    }
    return { day, views: Number(t.page_view) || 0, productViews: Number(t.product_view) || 0, addToCart: Number(t.add_to_cart) || 0 };
  });

  // ── Orders ─────────────────────────────────────────────────
  const orderSnaps = await db.collection('orders').where('createdAt', '>=', since).get().catch(() => null);
  const orders = orderSnaps?.docs.map((d) => d.data() as Record<string, any>) ?? [];

  const revenueByDay = new Map<string, { revenue: number; orders: number }>();
  const soldByProduct: Record<string, { units: number; revenue: number; model: string }> = {};

  for (const order of orders) {
    const day = String(order.createdAt ?? '').slice(0, 10);
    const bucket = revenueByDay.get(day) ?? { revenue: 0, orders: 0 };
    bucket.revenue += Number(order.total) || 0;
    bucket.orders += 1;
    revenueByDay.set(day, bucket);

    for (const line of Array.isArray(order.items) ? order.items : []) {
      const id = String(line.productId ?? line.id ?? '');
      if (!id) continue;
      const s = soldByProduct[id] ?? { units: 0, revenue: 0, model: `${line.brand ?? ''} ${line.model ?? ''}`.trim() };
      s.units += Number(line.quantity) || 0;
      s.revenue += (Number(line.price) || 0) * (Number(line.quantity) || 0);
      soldByProduct[id] = s;
    }
  }

  const revenueSeries = range.map((day) => ({
    day,
    revenue: Math.round((revenueByDay.get(day)?.revenue ?? 0) * 100) / 100,
    orders: revenueByDay.get(day)?.orders ?? 0,
  }));

  const revenue = Math.round(revenueSeries.reduce((s, d) => s + d.revenue, 0) * 100) / 100;

  // ── Stock, valued at cost and at retail ────────────────────
  const stockSnaps = await db.collection('stockUnits').where('status', '==', 'available').get().catch(() => null);
  const stock = stockSnaps?.docs.map((d) => d.data() as Record<string, any>) ?? [];

  const cost = Math.round(stock.reduce((s, u) => s + (Number(u.buyPrice) || 0), 0));
  const byGrade: Record<string, number> = {};
  const bySupplier: Record<string, { units: number; cost: number }> = {};
  let ageing = 0;

  const NINETY_DAYS_AGO = new Date(Date.now() - 90 * 86_400_000).toISOString().slice(0, 10);
  for (const unit of stock) {
    byGrade[String(unit.grade ?? 'Unknown')] = (byGrade[String(unit.grade ?? 'Unknown')] ?? 0) + 1;
    const sup = String(unit.supplier ?? 'Unknown');
    const s = bySupplier[sup] ?? { units: 0, cost: 0 };
    s.units += 1;
    s.cost += Number(unit.buyPrice) || 0;
    bySupplier[sup] = s;
    // Capital sitting on a shelf. In a market where handset prices fall every
    // month, ageing stock is a loss that has not been booked yet.
    if (String(unit.stockInDate ?? '') && String(unit.stockInDate) < NINETY_DAYS_AGO) ageing += 1;
  }

  // ── The number the page exists for ─────────────────────────
  // Views to orders, per product. A listing with attention and no sales is
  // mispriced, badly photographed, or out of stock in the grade people want —
  // and it is invisible in a revenue table, because it earns nothing.
  const attention = topOf(productTotals, 200, 'product_view:').map((entry) => {
    const sold = soldByProduct[entry.key];
    return {
      productId: entry.key,
      model: sold?.model || entry.key,
      views: entry.count,
      addToCart: cartTotals[`add_to_cart:${entry.key}`] ?? 0,
      unitsSold: sold?.units ?? 0,
      revenue: Math.round((sold?.revenue ?? 0) * 100) / 100,
      conversion: entry.count ? Math.round((((sold?.units ?? 0) / entry.count) * 100) * 10) / 10 : 0,
    };
  });

  return res.status(200).json({
    range: { days, from: since, to: range[range.length - 1] },
    traffic: {
      series,
      totals: kindTotals,
      topPaths: topOf(pathTotals, 12),
      topSearches: topOf(searchTotals, 12),
    },
    sales: {
      revenue,
      orders: orders.length,
      averageOrderValue: orders.length ? Math.round((revenue / orders.length) * 100) / 100 : 0,
      series: revenueSeries,
      topProducts: Object.entries(soldByProduct)
        .map(([id, s]) => ({ productId: id, ...s, revenue: Math.round(s.revenue * 100) / 100 }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10),
    },
    stock: {
      units: stock.length,
      cost,
      byGrade,
      ageingOver90Days: ageing,
      bySupplier: Object.entries(bySupplier)
        .map(([supplier, s]) => ({ supplier, units: s.units, cost: Math.round(s.cost) }))
        .sort((a, b) => b.cost - a.cost),
    },
    attention: attention.slice(0, 15),
    // Attention with nothing to show for it — the actionable end of the list.
    noSales: attention.filter((a) => a.views >= 5 && a.unitsSold === 0).slice(0, 10),
  });
}
