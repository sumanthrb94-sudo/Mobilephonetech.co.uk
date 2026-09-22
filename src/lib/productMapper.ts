import type { Product, ProductGrade, ProductVariant } from '../types';

/**
 * Firestore <-> app-model mapping for products.
 *
 * Firestore has no schema, so unlike the Postgres version this is the only
 * thing keeping documents consistent. Every read goes through `docToProduct`
 * and every write through `productToDoc`, so a field rename cannot half-land.
 *
 * Field names are camelCase here, matching the app model — the snake_case of
 * the old Postgres columns had no reason to survive the move.
 */

export interface ProductDoc {
  model: string;
  brand: string;
  category: string;
  storage?: string | null;
  price: number;
  originalPrice: number;
  grade: ProductGrade;
  batteryHealth?: number | null;
  warrantyMonths: number;
  returnDays: number;
  imageUrl?: string | null;
  galleryImages?: string[] | null;
  isCertified: boolean;
  stock: number;
  specs?: Record<string, unknown> | null;
  description?: string | null;
  conditionDescription?: string | null;
  colorOptions?: string[] | null;
  storageOptions?: string[] | null;
  conditionOptions?: ProductGrade[] | null;
  variants?: ProductVariant[] | null;
  createdAt?: unknown;
  updatedAt?: unknown;
  /** Lowercased "brand model" for prefix search — Firestore has no ILIKE. */
  searchTerms?: string[];
}

export function docToProduct(id: string, d: Record<string, unknown>): Product {
  return {
    id,
    model: (d.model as string) ?? '',
    brand: (d.brand as string) ?? '',
    category: (d.category as Product['category']) ?? 'Phones',
    storage: (d.storage as string) ?? undefined,
    price: Number(d.price ?? 0),
    originalPrice: Number(d.originalPrice ?? 0),
    grade: (d.grade as ProductGrade) ?? 'Good',
    // Product.batteryHealth is required, so absent means 100 (a device with no
    // battery, e.g. an accessory) rather than undefined.
    batteryHealth: d.batteryHealth == null ? 100 : Number(d.batteryHealth),
    warrantyMonths: Number(d.warrantyMonths ?? 12),
    returnDays: Number(d.returnDays ?? 30),
    imageUrl: (d.imageUrl as string) ?? '',
    galleryImages: (d.galleryImages as string[]) ?? undefined,
    isCertified: Boolean(d.isCertified),
    stock: Number(d.stock ?? 0),
    specs: (d.specs as Product['specs']) ?? {},
    description: (d.description as string) ?? undefined,
    conditionDescription: (d.conditionDescription as string) ?? undefined,
    colorOptions: (d.colorOptions as string[]) ?? undefined,
    storageOptions: (d.storageOptions as string[]) ?? undefined,
    conditionOptions: (d.conditionOptions as ProductGrade[]) ?? undefined,
    variants: (d.variants as ProductVariant[]) ?? undefined,
    reviews: (d.reviews as Product['reviews']) ?? undefined,
    // Provenance. `archivedAt` decides whether the storefront shows this at
    // all; the rest is display only. Timestamps are normalised because a
    // document written by the browser SDK carries a Firestore Timestamp while
    // one written by a script or read back from an export carries a string,
    // and a page that has to know which is which will get it wrong.
    archivedAt: isoOrUndefined(d.archivedAt),
    archivedBy: (d.archivedBy as string) ?? undefined,
    updatedBy: (d.updatedBy as string) ?? undefined,
    updatedAt: isoOrUndefined(d.updatedAt),
  };
}

/**
 * A Firestore timestamp, an ISO string or nothing, as an ISO string or nothing.
 *
 * serverTimestamp() is a sentinel until the write lands, so a document echoed
 * back locally carries an object with no date in it at all. Returning
 * undefined for that is honest — the field has no value yet — where coercing
 * it would print 1970.
 */
function isoOrUndefined(value: unknown): string | undefined {
  if (!value) return undefined;
  if (typeof value === 'string') return value;
  const asDate = (value as { toDate?: () => Date }).toDate;
  if (typeof asDate === 'function') {
    try { return asDate.call(value).toISOString(); } catch { return undefined; }
  }
  if (value instanceof Date) return value.toISOString();
  return undefined;
}

/**
 * Whether this product should be shown to a shopper.
 *
 * Archived products stay in the database for ever — orders, returns and
 * invoices reference them — but they are not for sale, so every storefront
 * read filters them out. Admin reads deliberately do not: the console is
 * where you go to find one and put it back.
 *
 * Expressed as a predicate rather than a Firestore `where` clause because
 * Firestore cannot query for the *absence* of a field. A live product simply
 * has no `archivedAt`, and `where('archivedAt', '==', null)` matches none of
 * them — which would empty the shop rather than filter it.
 */
export function isLive(p: Pick<Product, 'archivedAt'>): boolean {
  return !p.archivedAt;
}

/** The subset of a list a shopper may see. */
export function liveOnly(products: Product[]): Product[] {
  return products.filter(isLive);
}

/**
 * Tokens for substring-ish search. Firestore cannot do `LIKE %term%`, only
 * equality and range, so the searchable words are precomputed on write and
 * matched with `array-contains`. Good enough for "iphone", "apple", "17";
 * genuinely fuzzy search would need a dedicated index (Algolia/Typesense).
 */
export function buildSearchTerms(brand: string, model: string, category?: string): string[] {
  const words = `${brand} ${model} ${category ?? ''}`
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);

  const terms = new Set<string>(words);
  // Prefixes so "iph" matches "iphone" without a full-text engine.
  for (const w of words) {
    for (let i = 2; i < Math.min(w.length, 12); i++) terms.add(w.slice(0, i));
  }
  return [...terms].slice(0, 120);
}

/**
 * Strip undefined — Firestore rejects it, unlike null.
 *
 * Recursive on purpose. A top-level-only version looks like it works and then
 * fails on the one record with an undefined buried inside an array: Firestore
 * rejects the whole write, so in a batch that means every document in it is
 * lost, not just the offending one.
 */
export function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map(v => stripUndefined(v)) as unknown as T;
  }
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v !== undefined) out[k] = stripUndefined(v);
    }
    return out as T;
  }
  return value;
}
