/**
 * What the admin dashboard tells staff at a glance, worked out from the
 * catalogue, the orders and (when available) the cookieless view counters.
 *
 * Pure functions over plain data, so every figure staff act on is tested
 * rather than eyeballed. The page only fetches and draws.
 */

export interface InsightProduct {
  id: string;
  brand: string;
  model: string;
  price: number;
  stock: number;
  listed: boolean;
  /** True when at least one real photo has been uploaded. */
  hasPhoto: boolean;
  /** ISO date the product was added; used to age unsold stock. */
  createdAt?: string;
  /** Unit cost when recorded. Only shown to staff who can see profit. */
  buyPrice?: number;
}

export interface InsightOrder {
  id: string;
  status: string;
  total: number;
  createdAt: string;
  paypalOrderId?: string;
  refundedAmount?: number | null;
  dispatchedAt?: string | null;
  items: Array<{ productId?: string; quantity: number; price: number; buyPrice?: number }>;
}

/** Per-product views over the analytics window, from /api/analytics. */
export interface ProductDemand {
  productId: string;
  views: number;
  addToCart: number;
  /** People who asked to be emailed when it is back in stock. */
  waiting?: number;
}

/** What /api/health reports about the live configuration. */
export interface SiteHealth {
  paypalConfigured?: boolean;
  paypalEnv?: string | null;
  emailConfigured?: boolean;
  database?: string;
}

const DAY = 86_400_000;
const daysBetween = (a: Date, b: Date) => Math.floor((a.getTime() - b.getTime()) / DAY);
const round2 = (n: number) => Math.round(n * 100) / 100;

/** A real, paid order: written by the PayPal capture and not refunded. */
export function isPaid(o: InsightOrder): boolean {
  return Boolean(o.paypalOrderId) && o.status !== 'refunded';
}

const units = (o: InsightOrder) => o.items.reduce((n, i) => n + Math.max(1, Number(i.quantity) || 1), 0);

function soldSince(orders: InsightOrder[], since: Date): Map<string, number> {
  const sold = new Map<string, number>();
  for (const o of orders) {
    if (!isPaid(o) || new Date(o.createdAt) < since) continue;
    for (const i of o.items) {
      if (!i.productId) continue;
      sold.set(i.productId, (sold.get(i.productId) ?? 0) + Math.max(1, Number(i.quantity) || 1));
    }
  }
  return sold;
}

// ── 1. Needs doing now ─────────────────────────────────────────

export interface TodoCounts {
  /** Paid, not yet dispatched. */
  toPack: number;
  /** Paid more than a working day ago and still not dispatched. */
  overdue: number;
  /** Dispatched over 3 days ago with no delivery recorded. */
  inTransitLong: number;
}

export function todo(orders: InsightOrder[], now = new Date()): TodoCounts {
  const open = orders.filter(o => isPaid(o) && (o.status === 'pending' || o.status === 'confirmed'));
  return {
    toPack: open.length,
    overdue: open.filter(o => now.getTime() - new Date(o.createdAt).getTime() > 1.5 * DAY).length,
    inTransitLong: orders.filter(o => isPaid(o)
      && (o.status === 'dispatched' || o.status === 'out-for-delivery')
      && o.dispatchedAt && daysBetween(now, new Date(o.dispatchedAt)) > 3).length,
  };
}

// ── 2. What is selling ─────────────────────────────────────────

export interface Seller {
  id: string;
  name: string;
  sold: number;
  stock: number;
  /** Days the remaining stock lasts at the current rate; null when nothing sold. */
  daysOfCover: number | null;
}

export interface Selling {
  units7: number;
  units30: number;
  revenue30: number;
  /** Revenue in the 30 days before that, for the trend. */
  revenuePrev30: number;
  top: Seller[];
}

export function selling(products: InsightProduct[], orders: InsightOrder[], now = new Date()): Selling {
  const d7 = new Date(now.getTime() - 7 * DAY);
  const d30 = new Date(now.getTime() - 30 * DAY);
  const d60 = new Date(now.getTime() - 60 * DAY);
  const paid = orders.filter(isPaid);
  const sold30 = soldSince(orders, d30);
  const byId = new Map(products.map(p => [p.id, p]));

  const top = [...sold30.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, sold]) => {
      const p = byId.get(id);
      const stock = p?.stock ?? 0;
      return {
        id,
        name: p ? `${p.brand} ${p.model}` : id,
        sold,
        stock,
        daysOfCover: sold ? Math.round(stock / (sold / 30)) : null,
      };
    });

  const inWindow = (from: Date, to: Date) => paid.filter(o => {
    const t = new Date(o.createdAt);
    return t >= from && t < to;
  });

  return {
    units7: inWindow(d7, now).reduce((n, o) => n + units(o), 0),
    units30: inWindow(d30, now).reduce((n, o) => n + units(o), 0),
    revenue30: round2(inWindow(d30, now).reduce((n, o) => n + o.total, 0)),
    revenuePrev30: round2(inWindow(d60, d30).reduce((n, o) => n + o.total, 0)),
    top,
  };
}

// ── 3. Push to sell ────────────────────────────────────────────

export interface PushItem {
  id: string;
  name: string;
  stock: number;
  /** Retail value sitting on the shelf. */
  value: number;
  reason: string;
  /** What to do about it, in a few words. */
  action: string;
}

/**
 * Stock that is not moving: listed, in stock, nothing sold in 30 days. Biggest
 * money on the shelf first, because that is where a push pays most. The reason
 * says why it is stuck when the data can tell.
 */
export function pushToSell(
  products: InsightProduct[],
  orders: InsightOrder[],
  demand: ProductDemand[] = [],
  now = new Date(),
): PushItem[] {
  const sold30 = soldSince(orders, new Date(now.getTime() - 30 * DAY));
  const views = new Map(demand.map(d => [d.productId, d]));

  return products
    .filter(p => p.listed && p.stock > 0 && p.price > 0 && !sold30.get(p.id))
    .map(p => {
      const d = views.get(p.id);
      const age = p.createdAt ? daysBetween(now, new Date(p.createdAt)) : null;
      let reason: string;
      let action: string;
      if (!p.hasPhoto) {
        reason = 'No photo yet';
        action = 'Upload photos';
      } else if (d && d.views >= 10 && !d.addToCart) {
        reason = `${d.views} views, nobody added it to a cart`;
        action = 'Check the price';
      } else if (d && d.addToCart > 0) {
        reason = `${d.addToCart} added to cart, no sale`;
        action = 'Check price or delivery';
      } else if (d && d.views < 10) {
        reason = d.views ? `Only ${d.views} views` : 'No views';
        action = 'Feature it on the home page';
      } else {
        reason = age != null ? `No sale in ${Math.min(age, 30)} days` : 'No sale in 30 days';
        action = 'Feature it or review the price';
      }
      return { id: p.id, name: `${p.brand} ${p.model}`, stock: p.stock, value: round2(p.stock * p.price), reason, action };
    })
    .sort((a, b) => b.value - a.value);
}

// ── 4. Accounts ────────────────────────────────────────────────

export interface Accounts {
  monthLabel: string;
  revenueMonth: number;
  ordersMonth: number;
  revenueLastMonth: number;
  averageOrder: number;
  refundsMonth: number;
  /** Retail value of everything in stock. */
  stockValue: number;
  stockUnits: number;
  /** Product profit on orders whose cost is recorded; null when none are. */
  grossProfitMonth: number | null;
  /** Paid orders this month with no cost recorded, so not in the profit. */
  ordersWithoutCost: number;
  /** Orders that never went through PayPal, left out of every figure. */
  unpaidExcluded: number;
}

export function accounts(products: InsightProduct[], orders: InsightOrder[], now = new Date()): Accounts {
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const thisMonth = orders.filter(o => new Date(o.createdAt) >= monthStart);
  const paidMonth = thisMonth.filter(isPaid);
  const paidLast = orders.filter(o => isPaid(o) && new Date(o.createdAt) >= lastMonthStart && new Date(o.createdAt) < monthStart);

  let profit = 0;
  let costed = 0;
  for (const o of paidMonth) {
    if (!o.items.length || !o.items.every(i => typeof i.buyPrice === 'number')) continue;
    costed++;
    profit += o.items.reduce((n, i) => n + (i.price - (i.buyPrice ?? 0)) * Math.max(1, Number(i.quantity) || 1), 0);
  }

  const revenueMonth = round2(paidMonth.reduce((n, o) => n + o.total, 0));
  const inStock = products.filter(p => p.stock > 0);
  return {
    monthLabel: now.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }),
    revenueMonth,
    ordersMonth: paidMonth.length,
    revenueLastMonth: round2(paidLast.reduce((n, o) => n + o.total, 0)),
    averageOrder: paidMonth.length ? round2(revenueMonth / paidMonth.length) : 0,
    refundsMonth: round2(thisMonth.reduce((n, o) => n + (Number(o.refundedAmount) || (o.status === 'refunded' ? o.total : 0)), 0)),
    stockValue: round2(inStock.reduce((n, p) => n + p.stock * p.price, 0)),
    stockUnits: inStock.reduce((n, p) => n + p.stock, 0),
    grossProfitMonth: costed ? round2(profit) : null,
    ordersWithoutCost: paidMonth.length - costed,
    unpaidExcluded: orders.filter(o => !o.paypalOrderId).length,
  };
}

// ── 5. Coming up ───────────────────────────────────────────────

export interface AheadItem {
  id: string;
  name: string;
  detail: string;
}

export interface WaitingItem extends AheadItem {
  waiting: number;
}

export interface Ahead {
  /** Back in stock with people waiting for an email: send it. */
  backInStock: WaitingItem[];
  /** Will sell out within two weeks at the current rate. */
  runningOut: AheadItem[];
  /** Out of stock but people are still looking or buying. */
  missedDemand: AheadItem[];
  /** In stock over 90 days with no sale in 30: tying up money. */
  ageing: AheadItem[];
}

export function ahead(
  products: InsightProduct[],
  orders: InsightOrder[],
  demand: ProductDemand[] = [],
  now = new Date(),
): Ahead {
  const sold30 = soldSince(orders, new Date(now.getTime() - 30 * DAY));
  const views = new Map(demand.map(d => [d.productId, d.views]));
  const waiting = new Map(demand.map(d => [d.productId, d.waiting ?? 0]));
  const name = (p: InsightProduct) => `${p.brand} ${p.model}`;

  const runningOut = products
    .filter(p => p.listed && p.stock > 0 && (sold30.get(p.id) ?? 0) > 0)
    .map(p => ({ p, days: Math.round(p.stock / ((sold30.get(p.id) ?? 1) / 30)) }))
    .filter(x => x.days <= 14)
    .sort((a, b) => a.days - b.days)
    .map(({ p, days }) => ({ id: p.id, name: name(p), detail: `${p.stock} left, about ${days} day${days === 1 ? '' : 's'} at this rate` }));

  // People waiting for an email come first: each one is a sale to make.
  const missedDemand = products
    .filter(p => p.listed && p.stock <= 0
      && ((sold30.get(p.id) ?? 0) > 0 || (views.get(p.id) ?? 0) >= 5 || (waiting.get(p.id) ?? 0) > 0))
    .sort((a, b) => (waiting.get(b.id) ?? 0) - (waiting.get(a.id) ?? 0))
    .map(p => {
      const s = sold30.get(p.id) ?? 0;
      const v = views.get(p.id) ?? 0;
      const w = waiting.get(p.id) ?? 0;
      const parts = [w ? `${w} waiting` : '', s ? `${s} sold in 30 days` : '', v ? `${v} views` : ''].filter(Boolean);
      return { id: p.id, name: name(p), detail: `Out of stock · ${parts.join(', ')}` };
    });

  const ageing = products
    .filter(p => p.stock > 0 && p.createdAt && daysBetween(now, new Date(p.createdAt)) > 90 && !sold30.get(p.id))
    .map(p => ({ id: p.id, name: name(p), detail: `${p.stock} in stock for ${daysBetween(now, new Date(p.createdAt!))} days` }));

  const backInStock = products
    .filter(p => p.listed && p.stock > 0 && (waiting.get(p.id) ?? 0) > 0)
    .map(p => {
      const w = waiting.get(p.id) ?? 0;
      return { id: p.id, name: name(p), waiting: w, detail: `${w} waiting · ${p.stock} in stock` };
    })
    .sort((a, b) => b.waiting - a.waiting);

  return { backInStock, runningOut, missedDemand, ageing };
}

// ── 6. Ready for launch ────────────────────────────────────────

export type CheckState = 'done' | 'todo' | 'unknown';

export interface ReadinessCheck {
  label: string;
  state: CheckState;
  detail: string;
}

export function readiness(
  products: InsightProduct[],
  orders: InsightOrder[],
  health: SiteHealth | null,
  extra: { icoRegistration?: string } = {},
): ReadinessCheck[] {
  const sellable = products.filter(p => p.listed && p.stock > 0);
  const withPhoto = sellable.filter(p => p.hasPhoto).length;
  const listedEmpty = products.filter(p => p.listed && p.stock <= 0).length;
  const unpaid = orders.filter(o => !o.paypalOrderId).length;
  const known = (v: boolean | undefined) => health != null && v !== undefined;

  return [
    {
      label: 'PayPal takes real payments',
      state: !known(health?.paypalConfigured) ? 'unknown' : health?.paypalConfigured && health.paypalEnv === 'live' ? 'done' : 'todo',
      detail: !known(health?.paypalConfigured) ? 'Could not read the live settings'
        : !health?.paypalConfigured ? 'PayPal is not configured'
        : health.paypalEnv === 'live' ? 'Live mode' : 'Still in sandbox (test) mode: set PAYPAL_ENV=live',
    },
    {
      label: 'Order emails send',
      state: !known(health?.emailConfigured) ? 'unknown' : health?.emailConfigured ? 'done' : 'todo',
      detail: !known(health?.emailConfigured) ? 'Could not read the live settings'
        : health?.emailConfigured ? 'Email provider configured' : 'No email provider key set',
    },
    {
      label: 'Every product for sale has photos',
      state: !sellable.length ? 'unknown' : withPhoto === sellable.length ? 'done' : 'todo',
      detail: sellable.length ? `${withPhoto} of ${sellable.length} in-stock products have photos` : 'Nothing in stock yet',
    },
    {
      label: 'Listed products have stock',
      state: listedEmpty ? 'todo' : 'done',
      detail: listedEmpty ? `${listedEmpty} listed products show as out of stock` : 'Every listed product can be bought',
    },
    {
      label: 'No test orders mixed in',
      state: unpaid ? 'todo' : 'done',
      detail: unpaid ? `${unpaid} order${unpaid === 1 ? '' : 's'} never went through PayPal (left out of the accounts)` : 'All orders are real payments',
    },
    {
      label: 'ICO data-protection registration',
      state: extra.icoRegistration ? 'done' : 'todo',
      detail: extra.icoRegistration ? `Registered: ${extra.icoRegistration}` : 'Register with the ICO and add the number to company settings',
    },
  ];
}
