/**
 * The half of a product only staff may see.
 *
 * `products/{id}` is the public catalogue: firestore.rules let anyone read it,
 * and /api/catalogue serves it to every visitor. What a handset cost, who sold
 * it to us, its IMEI and the unit ledger behind each configuration are not
 * catalogue data, so they live in `productPrivate/{id}`, which only staff can
 * read. Rules work per document, never per field, so a second document is the
 * only way to keep a field private while its neighbours stay public.
 *
 * These helpers are pure on purpose: the admin console (browser SDK) and the
 * order route (Admin SDK) both split and merge with them, and must agree.
 *
 * Products written before the split may still carry these fields on the public
 * document. mergePrivate reads them as a fallback, and every later save moves
 * them across, so nothing is lost and nothing needs a migration.
 */

/** Top-level product fields that never belong on the public document. */
export const PRIVATE_PRODUCT_KEYS = ['buyPrice', 'supplier', 'imei', 'sku'] as const;

/** Per-configuration fields that never belong on the public document. */
export const PRIVATE_VARIANT_KEYS = [
  'buyPrice', 'supplier', 'imei', 'sku', 'notes', 'stockInDate', 'unitHistory', 'inventoryUnits',
] as const;

export interface ProductPrivateDoc {
  buyPrice?: number | null;
  supplier?: string | null;
  imei?: string | null;
  sku?: string | null;
  /** Keyed by variant id, so reordering the matrix cannot attach a cost to the wrong row. */
  variants?: Record<string, Record<string, unknown>>;
  updatedAt?: unknown;
}

type Row = Record<string, unknown>;

/**
 * Variants are matched by id. A legacy row without one falls back to its
 * position, which is the best that row can offer and is never worse than
 * losing its cost.
 */
function variantKey(v: Row, index: number): string {
  const id = typeof v?.id === 'string' ? v.id.trim() : '';
  return id || `#${index}`;
}

function omit(row: Row, keys: readonly string[]): Row {
  const out: Row = {};
  for (const [k, v] of Object.entries(row)) if (!keys.includes(k)) out[k] = v;
  return out;
}

function pick(row: Row, keys: readonly string[]): Row {
  const out: Row = {};
  for (const k of keys) if (row[k] !== undefined) out[k] = row[k];
  return out;
}

/**
 * A product row as written by the admin console, split into what the public
 * document may hold and what goes to productPrivate. Undefined values are
 * dropped from both; nulls are kept, because a cleared field must overwrite.
 */
export function splitPrivate(row: Row): { publicRow: Row; privateDoc: ProductPrivateDoc } {
  const publicRow = omit(row, PRIVATE_PRODUCT_KEYS);
  const privateDoc: ProductPrivateDoc = pick(row, PRIVATE_PRODUCT_KEYS) as ProductPrivateDoc;

  if (Array.isArray(row.variants)) {
    const variants: Record<string, Row> = {};
    publicRow.variants = (row.variants as Row[]).map((v, i) => {
      if (!v || typeof v !== 'object') return v;
      const own = pick(v, PRIVATE_VARIANT_KEYS);
      if (Object.keys(own).length) variants[variantKey(v, i)] = own;
      return omit(v, PRIVATE_VARIANT_KEYS);
    });
    privateDoc.variants = variants;
  }
  return { publicRow, privateDoc };
}

/**
 * A public product document with its private half laid back over it, as staff
 * see it. The private document wins; fields still on a legacy public document
 * are used only where the private one has nothing.
 */
export function mergePrivate(publicData: Row, privateDoc?: ProductPrivateDoc | null): Row {
  const out: Row = { ...publicData };
  if (!privateDoc) return out;

  for (const k of PRIVATE_PRODUCT_KEYS) {
    if (privateDoc[k] !== undefined) out[k] = privateDoc[k];
  }
  const own = privateDoc.variants ?? {};
  if (Array.isArray(out.variants)) {
    out.variants = (out.variants as Row[]).map((v, i) => {
      const extra = v && typeof v === 'object' ? own[variantKey(v, i)] : undefined;
      return extra ? { ...v, ...pick(extra, PRIVATE_VARIANT_KEYS) } : v;
    });
  }
  return out;
}

/**
 * The public document with every private field removed, legacy ones included.
 * Anything served to shoppers goes through this, so a document written before
 * the split cannot leak a cost through the catalogue.
 */
export function stripPrivate<T extends Row>(data: T): T {
  return splitPrivate(data).publicRow as T;
}

/** Private top-level fields still sitting on a legacy public document. */
export function legacyPrivateKeys(publicData: Row): string[] {
  return PRIVATE_PRODUCT_KEYS.filter(k => k in publicData);
}

// ── Orders ──────────────────────────────────────────────────────
//
// A buyer can read their own order, so the cost each line was sold against
// lives in `orderPrivate/{orderId}`, one entry per line in the same order.

export interface OrderPrivateDoc {
  items: Array<{ buyPrice?: number }>;
  createdAt?: string;
}

/** Order lines without their cost, and the costs on their own. */
export function splitOrderCost(items: Row[]): { publicItems: Row[]; privateDoc: OrderPrivateDoc } {
  return {
    publicItems: items.map(item => omit(item, ['buyPrice'])),
    privateDoc: {
      items: items.map(item => (typeof item.buyPrice === 'number' ? { buyPrice: item.buyPrice } : {})),
    },
  };
}

/** Order lines with their cost restored: private first, legacy order field second. */
export function mergeOrderCost<T extends Row>(items: T[], privateDoc?: OrderPrivateDoc | null): T[] {
  if (!privateDoc?.items?.length) return items;
  return items.map((item, i) => {
    const cost = privateDoc.items[i]?.buyPrice;
    return typeof cost === 'number' ? { ...item, buyPrice: cost } : item;
  });
}
