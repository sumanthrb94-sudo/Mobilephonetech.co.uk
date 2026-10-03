import {
  collection, deleteDoc, doc, getDoc, getDocs, query, serverTimestamp,
  setDoc, updateDoc, where, limit as fsLimit,
} from 'firebase/firestore';
import {
  deleteObject, getDownloadURL, listAll, ref, uploadBytes,
} from 'firebase/storage';
import { db, storage, COL, withAdminRetry } from './firebase';
import { uploadViaCloudinary } from './cloudinary';
import { buildSearchTerms, docToProduct, stripUndefined } from './productMapper';
import { capImages } from './productImages';
import type { InventoryUnit, Product, ProductGrade, ProductVariant } from '../types';

/** Storage folder for product imagery. */
export const IMAGE_BUCKET = 'product-images';
export const BANNER_BUCKET = 'banner-images';
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/**
 * The six-image limit and the helper that applies it live in
 * src/lib/productImages.ts, so the editor's cap and the product page's
 * frame count are one number rather than two that can drift apart.
 * Re-exported here because the editor reaches for it alongside the other
 * upload constants.
 */
export { MAX_PRODUCT_IMAGES, capImages } from './productImages';
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];

export const GRADES: ProductGrade[] = ['New', 'Pristine', 'Excellent', 'Good', 'Fair'];
/** The two grades staff can publish for newly-created stock. */
export const SELLABLE_GRADES: ProductGrade[] = ['Pristine', 'Excellent'];

/**
 * Admin data layer for the back store.
 *
 * Every call goes through the ordinary browser SDK carrying the signed-in
 * user's ID token — authorization is enforced by firestore.rules and
 * storage.rules, which check the `admin` custom claim, not by this file. A
 * non-admin who calls these functions gets a permission-denied error, which is
 * the point: hiding the UI is presentation, the rules are the actual gate.
 */

export interface ProductDraft {
  id: string;
  model: string;
  brand: string;
  category: string;
  storage?: string;
  price: number;
  originalPrice: number;
  buyPrice?: number;
  supplier?: string;
  imei?: string;
  sku?: string;
  stockLocation?: 'OFFICE' | 'SHS' | 'FBA' | 'WAREHOUSE';
  grade: ProductGrade;
  batteryHealth?: number;
  warrantyMonths: number;
  returnDays: number;
  imageUrl?: string;
  galleryImages?: string[];
  isCertified: boolean;
  stock: number;
  description?: string;
  conditionDescription?: string;
  colorOptions?: string[];
  storageOptions?: string[];
  /** One model can have many independently priced, sellable configurations. */
  variants?: ProductVariant[];
  /** True once staff deliberately manage this record as a model matrix. */
  variantMode?: boolean;
}

function cleanVariant(v: ProductVariant): ProductVariant {
  const inventoryUnits = v.inventoryUnits?.map(cleanInventoryUnit);
  return {
    id: v.id.trim(),
    color: v.color?.trim() || undefined,
    storage: v.storage?.trim() || undefined,
    connectivity: v.connectivity?.trim() || undefined,
    condition: v.condition,
    price: Number(v.price),
    originalPrice: Number(v.originalPrice),
    buyPrice: v.buyPrice == null ? undefined : Number(v.buyPrice),
    supplier: v.supplier?.trim() || undefined,
    imei: v.imei?.trim() || undefined,
    sku: v.sku?.trim() || undefined,
    stockLocation: v.stockLocation || 'OFFICE',
    stockInDate: v.stockInDate || undefined,
    notes: v.notes?.trim() || undefined,
    unitHistory: v.unitHistory,
    // A tracked configuration cannot drift away from the actual devices in
    // its unit ledger. Older rows without `inventoryUnits` keep quantity stock
    // until a staff member starts tracking them individually.
    stock: inventoryUnits?.length
      ? inventoryUnits.filter(unit => unit.status === 'available').length
      : Number(v.stock),
    batteryHealth: v.batteryHealth == null ? undefined : Number(v.batteryHealth),
    imageUrl: v.imageUrl?.trim() || undefined,
    galleryImages: v.galleryImages?.filter(Boolean),
    inventoryUnits: inventoryUnits?.length ? inventoryUnits : undefined,
  };
}

function cleanInventoryUnit(unit: InventoryUnit): InventoryUnit {
  return {
    id: unit.id.trim(),
    imei: unit.imei?.trim() || undefined,
    sku: unit.sku?.trim() || undefined,
    supplier: unit.supplier?.trim() || undefined,
    buyPrice: unit.buyPrice == null ? undefined : Number(unit.buyPrice),
    batteryHealth: unit.batteryHealth == null ? undefined : Number(unit.batteryHealth),
    stockLocation: unit.stockLocation || 'OFFICE',
    stockInDate: unit.stockInDate || undefined,
    notes: unit.notes?.trim() || undefined,
    status: unit.status || 'available',
    unitHistory: unit.unitHistory,
  };
}

/**
 * The storefront catalogue still has a top-level price and stock for cards,
 * search and legacy integrations. For a model with variants they are derived
 * from the sellable rows, never hand-maintained duplicates.
 */
function variantSummary(draft: ProductDraft) {
  if (!draft.variantMode) return null;
  const variants = (draft.variants ?? []).map(cleanVariant);
  if (!variants.length) return null;
  const prices = variants.map(v => v.price).filter(Number.isFinite);
  const originalPrices = variants.map(v => v.originalPrice).filter(Number.isFinite);
  const battery = variants.map(v => v.batteryHealth).filter((v): v is number => v != null);
  return {
    variants,
    stock: variants.reduce((sum, v) => sum + Math.max(0, v.stock || 0), 0),
    price: prices.length ? Math.min(...prices) : draft.price,
    originalPrice: originalPrices.length ? Math.min(...originalPrices) : draft.originalPrice,
    grade: variants[0].condition ?? draft.grade,
    batteryHealth: battery.length ? Math.min(...battery) : draft.batteryHealth,
    colorOptions: [...new Set(variants.map(v => v.color).filter((v): v is string => Boolean(v)))],
    storageOptions: [...new Set(variants.map(v => v.storage).filter((v): v is string => Boolean(v)))],
    conditionOptions: [...new Set(variants.map(v => v.condition).filter((v): v is ProductGrade => Boolean(v)))],
  };
}

/**
 * Draft to Firestore document.
 *
 * `id` is deliberately absent: it is the document key, not a field, so writing
 * it into the body too would let the two drift apart on a later edit.
 * searchTerms is derived here so every write keeps the search index in step —
 * Firestore has no triggers to do it for us.
 */
export function draftToRow(draft: ProductDraft): Record<string, unknown> {
  const summary = variantSummary(draft);
  return stripUndefined({
    model: draft.model,
    brand: draft.brand,
    category: draft.category,
    storage: draft.storage || null,
    price: summary?.price ?? draft.price,
    originalPrice: summary?.originalPrice ?? draft.originalPrice,
    grade: summary?.grade ?? draft.grade,
    batteryHealth: summary?.batteryHealth ?? draft.batteryHealth ?? null,
    warrantyMonths: draft.warrantyMonths,
    returnDays: draft.returnDays,
    imageUrl: draft.imageUrl || null,
    // Capped here rather than only in the editor, so a product cannot carry
    // a seventh image into the gallery through an import, a script, or a
    // document edited by hand in the Firebase console.
    galleryImages: draft.galleryImages?.length ? capImages(draft.galleryImages) : null,
    isCertified: draft.isCertified,
    stock: summary?.stock ?? draft.stock,
    description: draft.description || null,
    conditionDescription: draft.conditionDescription || null,
    colorOptions: summary?.colorOptions.length ? summary.colorOptions : draft.colorOptions?.length ? draft.colorOptions : null,
    storageOptions: summary?.storageOptions.length ? summary.storageOptions : draft.storageOptions?.length ? draft.storageOptions : null,
    conditionOptions: summary?.conditionOptions.length ? summary.conditionOptions : null,
    variants: summary?.variants.length ? summary.variants : null,
    buyPrice: summary?.variants?.[0]?.buyPrice ?? draft.buyPrice ?? null,
    supplier: summary?.variants?.[0]?.supplier ?? draft.supplier ?? null,
    imei: draft.imei ?? null,
    sku: draft.sku ?? null,
    stockLocation: draft.stockLocation ?? 'OFFICE',
    searchTerms: buildSearchTerms(draft.brand, draft.model, draft.category),
  });
}

/** Seed a blank draft. Slug is derived from brand+model as the user types. */
export function emptyDraft(): ProductDraft {
  return {
    id: '',
    model: '',
    brand: '',
    category: 'Phones',
    price: 0,
    originalPrice: 0,
    grade: 'Pristine',
    warrantyMonths: 12,
    returnDays: 30,
    isCertified: true,
    stock: 0,
    galleryImages: [],
    variants: [],
    variantMode: false,
  };
}

export function productToDraft(p: Product): ProductDraft {
  return {
    id: p.id,
    model: p.model,
    brand: p.brand,
    category: p.category,
    storage: p.storage,
    price: p.price,
    originalPrice: p.originalPrice,
    grade: p.grade,
    batteryHealth: p.batteryHealth,
    warrantyMonths: p.warrantyMonths,
    returnDays: p.returnDays,
    imageUrl: p.imageUrl,
    galleryImages: p.galleryImages ?? [],
    isCertified: p.isCertified,
    stock: p.stock,
    description: p.description,
    conditionDescription: p.conditionDescription,
    colorOptions: p.colorOptions,
    storageOptions: p.storageOptions,
    variants: p.variants ?? [],
    buyPrice: p.buyPrice ?? p.variants?.[0]?.buyPrice,
    supplier: p.supplier ?? p.variants?.[0]?.supplier,
    imei: p.imei ?? p.variants?.[0]?.imei,
    sku: p.sku ?? p.variants?.[0]?.sku,
    stockLocation: p.stockLocation ?? p.variants?.[0]?.stockLocation ?? 'OFFICE',
    // Preserve older catalogue documents exactly until staff choose to manage
    // their rows as the new model matrix.
    variantMode: false,
  };
}

/** URL-safe id, e.g. "Apple" + "iPhone 17 Pro" -> "apple-iphone-17-pro". */
export function slugify(...parts: string[]): string {
  return parts
    .join(' ')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export interface ValidationErrors {
  [field: string]: string;
}

/**
 * Field-level validation. Mirrors the CHECK constraints in the schema so the
 * admin sees a useful message instead of a raw Postgres error.
 */
export function validateDraft(draft: ProductDraft): ValidationErrors {
  const errors: ValidationErrors = {};

  if (!draft.id.trim()) errors.id = 'Required — this is the product URL slug.';
  else if (!/^[a-z0-9-]+$/.test(draft.id)) errors.id = 'Lowercase letters, numbers and hyphens only.';

  if (!draft.model.trim()) errors.model = 'Required.';
  if (!draft.brand.trim()) errors.brand = 'Required.';
  if (!draft.category.trim()) errors.category = 'Required.';

  const hasVariants = Boolean(draft.variantMode && draft.variants?.length);
  if (!hasVariants && (!Number.isFinite(draft.price) || draft.price <= 0)) errors.price = 'Must be more than £0.';
  if (!hasVariants && (!Number.isFinite(draft.originalPrice) || draft.originalPrice <= 0)) {
    errors.originalPrice = 'Must be more than £0.';
  } else if (!hasVariants && draft.originalPrice < draft.price) {
    errors.originalPrice = 'Cannot be below the selling price — that would show a negative saving.';
  }

  if (!GRADES.includes(draft.grade)) errors.grade = 'Pick a condition grade.';

  const isApplePhone = draft.category === 'Phones' && draft.brand.trim().toLowerCase() === 'apple';

  if (draft.batteryHealth !== undefined && draft.batteryHealth !== null) {
    if (!Number.isInteger(draft.batteryHealth) || draft.batteryHealth < 0 || draft.batteryHealth > 100) {
      errors.batteryHealth = 'Must be a whole number between 0 and 100.';
    }
  }
  if (!hasVariants && isApplePhone && (draft.batteryHealth === undefined || draft.batteryHealth === null || draft.batteryHealth < 85)) {
    errors.batteryHealth = 'Apple phones require a verified battery health of at least 85%.';
  }

  if (hasVariants) {
    const seen = new Set<string>();
    const trackedImeis = new Set<string>();
    for (const [index, raw] of (draft.variants ?? []).entries()) {
      const v = cleanVariant(raw);
      const key = [v.color, v.storage, v.connectivity, v.condition].map(x => (x ?? '').toLowerCase()).join('|');
      if (!v.id) errors[`variant-${index}-id`] = 'Each variant needs an ID.';
      if (seen.has(key)) errors[`variant-${index}-duplicate`] = 'This configuration is already listed; increase its stock instead.';
      seen.add(key);
      if (!Number.isFinite(v.price) || v.price <= 0) errors[`variant-${index}-price`] = 'Each variant needs a selling price above £0.';
      if (!Number.isFinite(v.originalPrice) || v.originalPrice < v.price) errors[`variant-${index}-originalPrice`] = 'Was price must be at least the selling price.';
      if (!Number.isInteger(v.stock) || v.stock < 0) errors[`variant-${index}-stock`] = 'Stock must be a whole number of 0 or more.';
      if (!v.condition || !GRADES.includes(v.condition)) errors[`variant-${index}-condition`] = 'Choose a condition.';
      if (v.batteryHealth != null && (!Number.isInteger(v.batteryHealth) || v.batteryHealth < 0 || v.batteryHealth > 100)) errors[`variant-${index}-batteryHealth`] = 'Battery health must be 0–100.';
      if (isApplePhone && (v.batteryHealth == null || v.batteryHealth < 85)) errors[`variant-${index}-batteryHealth`] = 'Apple phone variants require verified battery health of at least 85%.';
      for (const [unitIndex, rawUnit] of (v.inventoryUnits ?? []).entries()) {
        const unit = cleanInventoryUnit(rawUnit);
        const prefix = `variant-${index}-unit-${unitIndex}`;
        if (!unit.id) errors[`${prefix}-id`] = 'Each physical unit needs an internal reference.';
        if (unit.imei) {
          const normalizedImei = unit.imei.replace(/\s+/g, '');
          if (!/^\d{15}$/.test(normalizedImei)) errors[`${prefix}-imei`] = 'IMEI must be 15 digits.';
          if (trackedImeis.has(normalizedImei)) errors[`${prefix}-imei`] = 'This IMEI is already attached to this model.';
          trackedImeis.add(normalizedImei);
        } else if (draft.category === 'Phones') {
          errors[`${prefix}-imei`] = 'Every tracked phone needs its IMEI.';
        }
        if (unit.buyPrice != null && (!Number.isFinite(unit.buyPrice) || unit.buyPrice < 0)) errors[`${prefix}-buyPrice`] = 'Buy price must be £0 or more.';
        if (unit.batteryHealth != null && (!Number.isInteger(unit.batteryHealth) || unit.batteryHealth < 0 || unit.batteryHealth > 100)) errors[`${prefix}-batteryHealth`] = 'Battery health must be 0–100.';
        if (isApplePhone && unit.batteryHealth != null && unit.batteryHealth < 85) errors[`${prefix}-batteryHealth`] = 'Apple units must have verified battery health of at least 85%.';
      }
    }
  }

  if (!hasVariants && (!Number.isInteger(draft.stock) || draft.stock < 0)) errors.stock = 'Must be 0 or more.';
  if (!Number.isInteger(draft.warrantyMonths) || draft.warrantyMonths < 0) {
    errors.warrantyMonths = 'Must be 0 or more.';
  }
  if (!Number.isInteger(draft.returnDays) || draft.returnDays < 0) {
    errors.returnDays = 'Must be 0 or more.';
  }

  return errors;
}

/**
 * Human-readable message for a Firebase error.
 *
 * `permission-denied` is by far the most common one here and its raw text
 * ("Missing or insufficient permissions") gives no clue what to do, so it is
 * translated into the actual cause: the account has no admin claim.
 */
export function describeError(err: unknown): string {
  const e = err as { code?: string; message?: string } | null;
  const code = e?.code ?? '';
  const message = e?.message ?? String(err);

  if (code === 'permission-denied' || code === 'storage/unauthorized' || /insufficient permissions/i.test(message)) {
    return 'Your account is not an admin, so the database refused the change.';
  }
  if (code === 'already-exists') return 'A product with that slug already exists. Pick a different one.';
  if (code === 'unavailable' || code === 'storage/retry-limit-exceeded') {
    return 'Could not reach the database. Check your connection and try again.';
  }
  if (code === 'unauthenticated') return 'Your session expired. Sign in again.';
  if (code === 'storage/quota-exceeded') return 'Storage quota exceeded.';
  return message || 'Something went wrong.';
}

/** Marker so callers can distinguish a duplicate slug from any other failure. */
class AlreadyExistsError extends Error {
  code = 'already-exists';
}

// ── Reads ──────────────────────────────────────────────────────

export interface InventoryQuery {
  search?: string;
  brand?: string;
  stockFilter?: 'all' | 'in' | 'low' | 'out';
  sort?: 'newest' | 'stock_asc' | 'price_desc' | 'model_asc';
  page?: number;
  pageSize?: number;
}

export const LOW_STOCK_THRESHOLD = 5;

export async function listInventory(q: InventoryQuery = {}): Promise<{ products: Product[]; total: number; brands: string[] }> {
  const { search, brand, stockFilter = 'all', sort = 'newest', page = 1, pageSize = 25 } = q;

  // One indexed query (brand, when given) then narrowing in memory.
  //
  // Firestore permits a single range filter per query and no OR across fields,
  // so expressing search + stock band + sort as a query would need a composite
  // index per combination. The catalogue is a few hundred documents, so it is
  // cheaper — in latency and in index maintenance — to read once and filter here.
  const constraints = brand ? [where('brand', '==', brand)] : [];
  const snap = await getDocs(query(collection(db, COL.products), ...constraints, fsLimit(1000)));

  let rows = snap.docs.map(d => docToProduct(d.id, d.data()));
  const brands = [...new Set(rows.map(p => p.brand).filter(Boolean))].sort();

  if (search?.trim()) {
    const term = search.trim().toLowerCase();
    rows = rows.filter(p =>
      p.model.toLowerCase().includes(term) ||
      p.brand.toLowerCase().includes(term) ||
      p.id.toLowerCase().includes(term));
  }

  if (stockFilter === 'in') rows = rows.filter(p => p.stock > 0);
  else if (stockFilter === 'out') rows = rows.filter(p => p.stock === 0);
  else if (stockFilter === 'low') rows = rows.filter(p => p.stock > 0 && p.stock <= LOW_STOCK_THRESHOLD);

  switch (sort) {
    case 'stock_asc':  rows.sort((a, b) => a.stock - b.stock); break;
    case 'price_desc': rows.sort((a, b) => b.price - a.price); break;
    case 'model_asc':  rows.sort((a, b) => a.model.localeCompare(b.model)); break;
    default: break; // documents already arrive newest-first from the seed order
  }

  const total = rows.length;
  return { products: rows.slice((page - 1) * pageSize, page * pageSize), total, brands };
}

// ── Dashboard ──────────────────────────────────────────────────────

export interface BrandStock {
  brand: string;
  units: number;
  value: number;
}

export interface RecentOrder {
  id: string;
  total: number;
  status: string;
  createdAt: string;
  customer: string;
  itemCount: number;
}

export interface DashboardStats {
  skuCount: number;
  unitsInStock: number;
  /** Retail value of stock on hand, in pounds. Not cost — LeHart does not
   *  record what each unit was bought for, which is also why the VAT margin
   *  scheme cannot be worked out from this data yet. */
  stockValue: number;
  outOfStock: number;
  lowStock: number;
  byBrand: BrandStock[];
  /** Out-of-stock first, then low stock; recent website demand breaks ties. */
  needsAttention: Array<Product & { soldUnits: number }>;
  orderCount: number;
  orderRevenue: number;
  unitsSold: number;
  unitsSoldToday: number;
  unitsSoldLast7Days: number;
  /** Website product GP. Excludes postage, payment fees and later repairs. */
  websiteGrossProfit: number;
  websiteGrossProfitMargin: number | null;
  ordersMissingCost: number;
  recentOrders: RecentOrder[];
  /** True when the orders read failed — so the panel can say "unavailable"
   *  rather than draw a confident zero. */
  ordersUnavailable: boolean;
}

/**
 * One read of the catalogue plus one of orders, aggregated in memory.
 *
 * Firestore has no GROUP BY and no SUM, so every figure here would otherwise
 * be a separate aggregation query or a maintained counter document. At a few
 * hundred products that is more moving parts than it is worth.
 */
export async function loadDashboardStats(): Promise<DashboardStats> {
  const snap = await getDocs(query(collection(db, COL.products), fsLimit(1000)));
  const products = snap.docs.map(d => docToProduct(d.id, d.data()));

  const brands = new Map<string, BrandStock>();
  let unitsInStock = 0;
  let stockValue = 0;
  let outOfStock = 0;
  let lowStock = 0;

  for (const p of products) {
    const units = Math.max(0, p.stock ?? 0);
    const value = units * (p.price ?? 0);
    unitsInStock += units;
    stockValue += value;

    if (units === 0) outOfStock++;
    else if (units <= LOW_STOCK_THRESHOLD) lowStock++;

    const row = brands.get(p.brand) ?? { brand: p.brand, units: 0, value: 0 };
    row.units += units;
    row.value += value;
    brands.set(p.brand, row);
  }

  // Out of stock first, then thinnest stock — the order you would work them in.
  let needsAttention: Array<Product & { soldUnits: number }> = products
    .filter(p => (p.stock ?? 0) <= LOW_STOCK_THRESHOLD)
    .map(p => ({ ...p, soldUnits: 0 }))
    .sort((a, b) => (a.stock ?? 0) - (b.stock ?? 0))
    .slice(0, 6);

  let orderCount = 0;
  let orderRevenue = 0;
  let unitsSold = 0;
  let unitsSoldToday = 0;
  let unitsSoldLast7Days = 0;
  let websiteGrossProfit = 0;
  let costedRevenue = 0;
  let ordersMissingCost = 0;
  let recentOrders: RecentOrder[] = [];
  let ordersUnavailable = false;

  try {
    const orderSnap = await getDocs(query(collection(db, COL.orders), fsLimit(500)));
    const soldByProduct = new Map<string, number>();
    const today = new Date().toISOString().slice(0, 10);
    const sevenDaysAgo = new Date(Date.now() - 6 * 86_400_000).toISOString().slice(0, 10);
    const rows = orderSnap.docs.map(d => {
      const o = d.data() as Record<string, unknown>;
      const addr = (o.shippingAddress ?? {}) as { fullName?: string };
      const status = String(o.status ?? 'pending');
      const items = Array.isArray(o.items) ? o.items as Array<Record<string, unknown>> : [];
      const hasCost = items.length > 0 && items.every(item => typeof item.buyPrice === 'number' && Number.isFinite(item.buyPrice));
      const productRevenue = Math.max(0, Number(o.subtotal ?? 0) - Number(o.discount ?? 0));
      if (status !== 'refunded') {
        const orderUnits = items.reduce((sum, item) => sum + Math.max(1, Number(item.quantity) || 1), 0);
        unitsSold += orderUnits;
        const orderDay = String(o.createdAt ?? '').slice(0, 10);
        if (orderDay === today) unitsSoldToday += orderUnits;
        if (orderDay >= sevenDaysAgo) unitsSoldLast7Days += orderUnits;
        for (const item of items) {
          const productId = String(item.productId ?? item.id ?? '');
          if (productId) soldByProduct.set(productId, (soldByProduct.get(productId) ?? 0) + Math.max(1, Number(item.quantity) || 1));
        }
        if (hasCost) {
          costedRevenue += productRevenue;
          websiteGrossProfit += productRevenue - items.reduce((sum, item) => sum + Number(item.buyPrice) * Math.max(1, Number(item.quantity) || 1), 0);
        } else {
          ordersMissingCost += 1;
        }
      }
      return {
        id: d.id,
        total: Number(o.total ?? 0),
        status,
        createdAt: String(o.createdAt ?? ''),
        customer: addr.fullName ?? 'Guest',
        itemCount: Array.isArray(o.items) ? o.items.length : 0,
      };
    });
    orderCount = rows.length;
    orderRevenue = rows.reduce((sum, o) => sum + o.total, 0);
    recentOrders = rows
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 5);
    // Demand makes a restock queue useful: two models with one left are not
    // equal if one has sold twelve times and the other has never sold.
    needsAttention = products
      .filter(p => (p.stock ?? 0) <= LOW_STOCK_THRESHOLD)
      .map(p => ({ ...p, soldUnits: soldByProduct.get(p.id) ?? 0 }))
      .sort((a, b) => (a.stock - b.stock) || (b.soldUnits - a.soldUnits))
      .slice(0, 6);
  } catch {
    // An admin who cannot read orders is a rules problem worth surfacing,
    // but it must not take the whole dashboard down with it.
    ordersUnavailable = true;
  }

  return {
    skuCount: products.length,
    unitsInStock,
    stockValue,
    outOfStock,
    lowStock,
    byBrand: [...brands.values()].sort((a, b) => b.units - a.units),
    needsAttention,
    orderCount,
    orderRevenue,
    unitsSold,
    unitsSoldToday,
    unitsSoldLast7Days,
    websiteGrossProfit,
    websiteGrossProfitMargin: costedRevenue ? websiteGrossProfit / costedRevenue : null,
    ordersMissingCost,
    recentOrders,
    ordersUnavailable,
  };
}

export async function getProduct(id: string): Promise<Product | null> {
  const snap = await getDoc(doc(db, COL.products, id));
  return snap.exists() ? docToProduct(snap.id, snap.data()) : null;
}

export async function listBrands(): Promise<string[]> {
  const snap = await getDocs(query(collection(db, COL.products), fsLimit(1000)));
  const set = new Set<string>();
  for (const d of snap.docs) {
    const b = (d.data() as { brand?: string }).brand;
    if (b) set.add(b);
  }
  return [...set].sort();
}

// ── Writes ─────────────────────────────────────────────────────

export async function createProduct(draft: ProductDraft): Promise<Product> {
  const ref = doc(db, COL.products, draft.id);

  // Firestore's setDoc overwrites silently — there is no INSERT that fails on
  // a duplicate key — so the existence check has to be explicit or creating a
  // product with a taken slug would quietly destroy the existing one.
  const existing = await getDoc(ref);
  if (existing.exists()) throw new AlreadyExistsError('A product with that slug already exists.');

  const body = { ...draftToRow(draft), createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
  await withAdminRetry(() => setDoc(ref, body));
  return { ...docToProduct(draft.id, body as Record<string, unknown>) };
}

export async function updateProduct(draft: ProductDraft): Promise<Product> {
  const ref = doc(db, COL.products, draft.id);
  const body = { ...draftToRow(draft), updatedAt: serverTimestamp() };
  await withAdminRetry(() => updateDoc(ref, body));
  return { ...docToProduct(draft.id, body as Record<string, unknown>) };
}

export async function setStock(id: string, stock: number): Promise<void> {
  if (!Number.isInteger(stock) || stock < 0) throw new Error('Stock must be a whole number of 0 or more.');
  await withAdminRetry(() => updateDoc(doc(db, COL.products, id), { stock, updatedAt: serverTimestamp() }));
}

export async function deleteProduct(id: string): Promise<void> {
  // Stored images are removed first: losing an image is recoverable, but a
  // deleted document leaves no record of which files belonged to it.
  await deleteAllImagesFor(id).catch(() => { /* orphaned files are not fatal */ });
  await withAdminRetry(() => deleteDoc(doc(db, COL.products, id)));
}

// ── Images ─────────────────────────────────────────────────────

export function validateImageFile(file: File): string | null {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return `${file.name}: must be a JPEG, PNG, WebP or AVIF.`;
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return `${file.name}: ${(file.size / 1024 / 1024).toFixed(1)} MB is over the 5 MB limit.`;
  }
  return null;
}

/** Storage path for an upload. Namespaced per product so deletes are cheap. */
export function imagePath(productId: string, fileName: string, unique: string): string {
  // `'noext'.split('.').pop()` is 'noext', not undefined, so a `?? 'jpg'`
  // fallback never fires — the whole filename would become the extension.
  // Only treat the tail as an extension when there is actually a dot.
  const dot = fileName.lastIndexOf('.');
  const raw = dot > 0 ? fileName.slice(dot + 1) : '';
  const ext = raw.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  return `${productId}/${unique}.${ext}`;
}

/**
 * @param bucket which top-level folder to write to. Defaults to product
 *   imagery; banner artwork lives under its own prefix so storage.rules can
 *   grant the two separately, and so a banner is never mistaken for a
 *   product's photo when either is cleaned up.
 */
export async function uploadImage(
  productId: string,
  file: File,
  bucket: string = IMAGE_BUCKET,
): Promise<string> {
  const invalid = validateImageFile(file);
  if (invalid) throw new Error(invalid);

  // Cloudinary when the deployment has it configured, Firebase Storage
  // otherwise — see src/lib/cloudinary.ts. Both return a URL, and everything
  // downstream only ever stores and renders that string.
  try {
    const hosted = await uploadViaCloudinary(
      bucket === BANNER_BUCKET ? 'banner' : 'product',
      file,
      productId,
    );
    if (hosted) return hosted;
  } catch (err) {
    console.warn('[uploadImage] Cloudinary upload failed, falling back to Firebase Storage backup:', err);
  }

  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const path = imagePath(productId, file.name, unique);

  const objectRef = ref(storage, `${bucket}/${path}`);
  await withAdminRetry(() => uploadBytes(objectRef, file, {
    contentType: file.type,
    cacheControl: 'public, max-age=31536000',
  }));
  return getDownloadURL(objectRef);
}

/**
 * Storage path from a download URL, or null when the image is not ours.
 *
 * Seeded products point at `/assets/...` files bundled with the app; calling
 * delete on one of those would fail confusingly, so they are filtered out here
 * and the UI shows them as "Bundled" instead.
 *
 * Firebase download URLs percent-encode the path inside /o/ and append a
 * ?alt=media&token=... query, so both have to be undone.
 */
export function pathFromPublicUrl(url: string): string | null {
  const marker = '/o/';
  const i = url.indexOf(marker);
  if (i === -1 || !url.includes('firebasestorage')) return null;

  const encoded = url.slice(i + marker.length).split('?')[0];
  const full = decodeURIComponent(encoded);
  const prefix = `${IMAGE_BUCKET}/`;
  return full.startsWith(prefix) ? full.slice(prefix.length) : null;
}

export async function deleteImage(url: string): Promise<void> {
  const path = pathFromPublicUrl(url);
  if (!path) return; // bundled asset — nothing stored to remove
  await withAdminRetry(() => deleteObject(ref(storage, `${IMAGE_BUCKET}/${path}`)));
}

async function deleteAllImagesFor(productId: string): Promise<void> {
  const folder = ref(storage, `${IMAGE_BUCKET}/${productId}`);
  const listing = await listAll(folder);
  await withAdminRetry(() => Promise.all(listing.items.map(item => deleteObject(item))));
}

/**
 * Whether an address staff typed is one we are willing to put in an <img src>.
 *
 * Only a site-relative path or an absolute http(s) URL. A `data:` or
 * `javascript:` value reaching an image source is the thing this exists to
 * stop, and a protocol-relative `//host/x.jpg` is rejected too: it reads as a
 * path but silently resolves to a third-party host, so staff would not know
 * from looking at it where the picture actually comes from.
 *
 * It does not promise the image will load. The site's CSP limits which hosts
 * may serve images, and the address might simply be wrong — both of which the
 * preview beside the field shows immediately, which is why this only has to
 * rule out the values that are dangerous rather than merely broken.
 */
export function isUsableImageUrl(raw: string): boolean {
  const value = raw.trim();
  if (value.startsWith('//')) return false;
  if (value.startsWith('/')) return true;
  try {
    const { protocol } = new URL(value);
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
}
