import { collection, getDocs, limit, query, where } from 'firebase/firestore';
import { auth, db, COL } from './firebase';
import { docToProduct } from './productMapper';
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
  const snap = await getDocs(query(collection(db, COL.products), limit(1000)));
  return snap.docs.map(doc => {
    const raw = doc.data() as Record<string, unknown>;
    const p = docToProduct(doc.id, raw);
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

  const [products, orders, analytics, health, returns, unread] = await Promise.all([
    settle('products', loadProducts(), [] as InsightProduct[]),
    settle('orders', listOrders(), []),
    settle('shop views', staffFetch<{ demand?: ProductDemand[] }>('/api/analytics?days=30'), null),
    // /api/health nests its answers under `checks`.
    settle('live settings', staffFetch<{ checks?: SiteHealth }>('/api/health').then(h => h.checks ?? null), null),
    settle('returns', listReturns('open').then(r => r.length), null),
    settle('messages', getDocs(query(collection(db, COL.conversations), where('unreadForAdmin', '>', 0), limit(100))).then(s => s.size), null),
  ]);

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
    demand: analytics?.demand ?? [],
    health,
    openReturns: returns,
    unreadMessages: unread,
    unavailable,
  };
}
