import {
  collection, deleteDoc, doc, getDoc, getDocs, query, serverTimestamp,
  setDoc, updateDoc, where, limit as fsLimit,
} from 'firebase/firestore';
import {
  deleteObject, getDownloadURL, listAll, ref, uploadBytes,
} from 'firebase/storage';
import { db, storage, COL } from './firebase';
import { buildSearchTerms, docToProduct, stripUndefined } from './productMapper';
import type { Product, ProductGrade } from '../types';

/** Storage folder for product imagery. */
export const IMAGE_BUCKET = 'product-images';
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];

export const GRADES: ProductGrade[] = ['New', 'Pristine', 'Excellent', 'Good', 'Fair'];

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
  return stripUndefined({
    model: draft.model,
    brand: draft.brand,
    category: draft.category,
    storage: draft.storage || null,
    price: draft.price,
    originalPrice: draft.originalPrice,
    grade: draft.grade,
    batteryHealth: draft.batteryHealth ?? null,
    warrantyMonths: draft.warrantyMonths,
    returnDays: draft.returnDays,
    imageUrl: draft.imageUrl || null,
    galleryImages: draft.galleryImages?.length ? draft.galleryImages : null,
    isCertified: draft.isCertified,
    stock: draft.stock,
    description: draft.description || null,
    conditionDescription: draft.conditionDescription || null,
    colorOptions: draft.colorOptions?.length ? draft.colorOptions : null,
    storageOptions: draft.storageOptions?.length ? draft.storageOptions : null,
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
    grade: 'Good',
    warrantyMonths: 12,
    returnDays: 30,
    isCertified: true,
    stock: 0,
    galleryImages: [],
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

  if (!Number.isFinite(draft.price) || draft.price <= 0) errors.price = 'Must be more than £0.';
  if (!Number.isFinite(draft.originalPrice) || draft.originalPrice <= 0) {
    errors.originalPrice = 'Must be more than £0.';
  } else if (draft.originalPrice < draft.price) {
    errors.originalPrice = 'Cannot be below the selling price — that would show a negative saving.';
  }

  if (!GRADES.includes(draft.grade)) errors.grade = 'Pick a condition grade.';

  if (draft.batteryHealth !== undefined && draft.batteryHealth !== null) {
    if (!Number.isInteger(draft.batteryHealth) || draft.batteryHealth < 0 || draft.batteryHealth > 100) {
      errors.batteryHealth = 'Must be a whole number between 0 and 100.';
    }
  }

  if (!Number.isInteger(draft.stock) || draft.stock < 0) errors.stock = 'Must be 0 or more.';
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

export async function listInventory(q: InventoryQuery = {}): Promise<{ products: Product[]; total: number }> {
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
  return { products: rows.slice((page - 1) * pageSize, page * pageSize), total };
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
  needsAttention: Product[];
  orderCount: number;
  orderRevenue: number;
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
  const needsAttention = products
    .filter(p => (p.stock ?? 0) <= LOW_STOCK_THRESHOLD)
    .sort((a, b) => (a.stock ?? 0) - (b.stock ?? 0))
    .slice(0, 6);

  let orderCount = 0;
  let orderRevenue = 0;
  let recentOrders: RecentOrder[] = [];
  let ordersUnavailable = false;

  try {
    const orderSnap = await getDocs(query(collection(db, COL.orders), fsLimit(500)));
    const rows = orderSnap.docs.map(d => {
      const o = d.data() as Record<string, unknown>;
      const addr = (o.shippingAddress ?? {}) as { fullName?: string };
      return {
        id: d.id,
        total: Number(o.total ?? 0),
        status: String(o.status ?? 'pending'),
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
  await setDoc(ref, body);
  return { ...docToProduct(draft.id, body as Record<string, unknown>) };
}

export async function updateProduct(draft: ProductDraft): Promise<Product> {
  const ref = doc(db, COL.products, draft.id);
  const body = { ...draftToRow(draft), updatedAt: serverTimestamp() };
  await updateDoc(ref, body);
  return { ...docToProduct(draft.id, body as Record<string, unknown>) };
}

export async function setStock(id: string, stock: number): Promise<void> {
  if (!Number.isInteger(stock) || stock < 0) throw new Error('Stock must be a whole number of 0 or more.');
  await updateDoc(doc(db, COL.products, id), { stock, updatedAt: serverTimestamp() });
}

export async function deleteProduct(id: string): Promise<void> {
  // Stored images are removed first: losing an image is recoverable, but a
  // deleted document leaves no record of which files belonged to it.
  await deleteAllImagesFor(id).catch(() => { /* orphaned files are not fatal */ });
  await deleteDoc(doc(db, COL.products, id));
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

export async function uploadImage(productId: string, file: File): Promise<string> {
  const invalid = validateImageFile(file);
  if (invalid) throw new Error(invalid);

  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const path = imagePath(productId, file.name, unique);

  const objectRef = ref(storage, `${IMAGE_BUCKET}/${path}`);
  await uploadBytes(objectRef, file, {
    contentType: file.type,
    cacheControl: 'public, max-age=31536000',
  });
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
  await deleteObject(ref(storage, `${IMAGE_BUCKET}/${path}`));
}

async function deleteAllImagesFor(productId: string): Promise<void> {
  const folder = ref(storage, `${IMAGE_BUCKET}/${productId}`);
  const listing = await listAll(folder);
  await Promise.all(listing.items.map(item => deleteObject(item)));
}
