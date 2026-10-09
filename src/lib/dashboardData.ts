import { collection, getDocs, limit, query, where } from 'firebase/firestore';
import { auth, db, COL } from './firebase';
import { docToProduct } from './productMapper';
import { mergePrivate } from './productPrivate';
import { loadPrivateProducts } from './adminApi';
import { isUploadedPhoto } from './productImages';
import { listOrders } from './orders';
import { listReturns } from './returns';
import type { InsightOrder, InsightProduct, ProductDemand, SiteHealth } from './dashboardInsights';

/**
 * Everything the dashboard reads, fetched in parallel. Each source fails on
 * its own: a dashboard that cannot reach the analytics or the health check
 * still shows stock and orders, and says what it could not read.
 */
export interface DashboardInputs {
  products: InsightProduct[];
  orders: InsightOrder[];
  demand: ProductDemand[];
  health: SiteHealth | null;
  openReturns: number | null;
  unreadMessages: number | null;
  /** Sources that could not be read, named for the page to show. */
  unavailable: string[];
}

function isoOf(v: unknown): string | undefined {
  if (!v) return undefined;
  if (typeof v === 'string') return v;
  const maybe = v as { toDate?: () => Date };
  return typeof maybe.toDate === 'function' ? maybe.toDate().toISOString() : undefined;
}

function hasPhoto(d: Record<string, unknown>): boolean {
  const urls: unknown[] = [d.imageUrl, ...((d.galleryImages as unknown[]) ?? [])];
  for (const v of (d.variants as Array<Record<string, unknown>>) ?? []) urls.push(...((v.galleryImages as unknown[]) ?? []));
  return urls.some(isUploadedPhoto);
}

async function loadProducts(): Promise<InsightProduct[]> {
  const [snap, privates] = await Promise.all([
    getDocs(query(collection(db, COL.products), limit(1000))),
    loadPrivateProducts(),
  ]);
  return snap.docs.map(doc => {
    const raw = doc.data() as Record<string, unknown>;
    const p = docToProduct(doc.id, mergePrivate(raw, privates.get(doc.id)));
    return {
      id: p.id,
      brand: p.brand,
      model: p.model,
      price: p.price,
      stock: Math.max(0, p.stock ?? 0),
      listed: p.listed !== false,
      hasPhoto: hasPhoto(raw),
      createdAt: isoOf(raw.createdAt),
      buyPrice: p.buyPrice,
    };
  });
}

async function staffFetch<T>(path: string): Promise<T> {
  const token = await auth.currentUser?.getIdToken();
  const res = await fetch(path, { headers: token ? { authorization: `Bearer ${token}` } : {} });
  // The health check answers 503 with its body when something is wrong; that
  // body is exactly what the readiness panel needs.
  if (!res.ok && res.status !== 503) throw new Error(`${path} ${res.status}`);
  return res.json() as Promise<T>;
}

export async function loadDashboardInputs(): Promise<DashboardInputs> {
  const unavailable: string[] = [];
  const settle = async <T,>(label: string, p: Promise<T>, fallback: T): Promise<T> => {
    try { return await p; } catch { unavailable.push(label); return fallback; }
  };

  const [products, orders, analytics, health, returns, unread, alerts] = await Promise.all([
    settle('products', loadProducts(), [] as InsightProduct[]),
    settle('orders', listOrders(), []),
    settle('shop views', staffFetch<{ demand?: ProductDemand[] }>('/api/analytics?days=30'), null),
    // /api/health nests its answers under `checks`.
    settle('live settings', staffFetch<{ checks?: SiteHealth }>('/api/health').then(h => h.checks ?? null), null),
    settle('returns', listReturns('open').then(r => r.length), null),
    settle('messages', getDocs(query(collection(db, COL.conversations), where('unreadForAdmin', '>', 0), limit(100))).then(s => s.size), null),
    settle('back-in-stock requests', getDocs(query(collection(db, 'stockAlerts'), where('notifiedAt', '==', null), limit(2000)))
      .then(s => s.docs.map(d => String(d.data().productId ?? ''))), [] as string[]),
  ]);

  // Views and add-to-carts per product, plus how many people asked to be
  // emailed when it is back.
  const demand = new Map<string, ProductDemand>((analytics?.demand ?? []).map(d => [d.productId, { ...d }]));
  for (const id of alerts) {
    if (!id) continue;
    const row = demand.get(id) ?? { productId: id, views: 0, addToCart: 0 };
    row.waiting = (row.waiting ?? 0) + 1;
    demand.set(id, row);
  }

  return {
    products,
    orders: orders.map(o => ({
      id: o.id,
      status: o.status,
      total: o.total,
      createdAt: o.createdAt,
      paypalOrderId: o.paypalOrderId,
      refundedAmount: o.refundedAmount,
      dispatchedAt: o.dispatchedAt,
      items: o.items.map(i => ({ productId: i.productId, quantity: i.quantity, price: i.price, buyPrice: i.buyPrice })),
    })),
    demand: [...demand.values()],
    health,
    openReturns: returns,
    unreadMessages: unread,
    unavailable,
  };
}
