import {
  collection, deleteDoc, deleteField, doc, getDoc, getDocs, query,
  serverTimestamp, setDoc, updateDoc, where, limit as fsLimit,
} from 'firebase/firestore';
import {
  deleteObject, getDownloadURL, listAll, ref, uploadBytes,
} from 'firebase/storage';
import { auth, db, storage, COL, withAdminRetry } from './firebase';
import { uploadViaCloudinary } from './cloudinary';
import { buildSearchTerms, docToProduct, stripUndefined } from './productMapper';
import { capImages } from './productImages';
import type { Product, ProductGrade } from '../types';

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
    // Capped here rather than only in the editor, so a product cannot carry
    // a seventh image into the gallery through an import, a script, or a
    // document edited by hand in the Firebase console.
    galleryImages: draft.galleryImages?.length ? capImages(draft.galleryImages) : null,
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
  /**
   * Which products to list.
   *
   * 'live' — on sale. The default, because that is what the day's work is.
   * 'archived' — withdrawn. Where you go to find one and put it back.
   * 'all' — both, for the export, which should carry the whole record.
   */
  archived?: 'live' | 'archived' | 'all';
}

export const LOW_STOCK_THRESHOLD = 5;

export interface InventoryPage {
  products: Product[];
  /** How many matched, within what was read. */
  total: number;
  /**
   * True when the catalogue is larger than one read can carry, so the figures
   * above describe a subset.
   *
   * The console must say so where it shows them. A count that is quietly
   * wrong is the failure InventoryManager's month-long simulation found in
   * its own reorder panel: a figure on screen, nothing behind it, and no
   * indication that anything was missing.
   */
  truncated: boolean;
}

/**
 * How many documents one inventory read will pull back.
 *
 * Exported so the console can say when it has hit the ceiling rather than
 * quietly showing part of the catalogue as though it were all of it.
 */
export const INVENTORY_READ_CAP = 1000;

export async function listInventory(q: InventoryQuery = {}): Promise<InventoryPage> {
  const {
    search, brand, stockFilter = 'all', sort = 'newest',
    page = 1, pageSize = 25, archived = 'live',
  } = q;

  // One indexed query (brand, when given) then narrowing in memory.
  //
  // Firestore permits a single range filter per query and no OR across fields,
  // so expressing search + stock band + sort as a query would need a composite
  // index per combination. The catalogue is a few hundred documents, so it is
  // cheaper — in latency and in index maintenance — to read once and filter here.
  //
  // It stops being cheaper somewhere past a thousand, and more importantly it
  // stops being *correct*: at the cap, the search box and the stock filters
  // are narrowing an arbitrary subset while presenting themselves as
  // narrowing the catalogue, so a product that exists cannot be found and
  // nothing says why. One document over the cap is fetched deliberately so
  // that case can be detected and reported instead of guessed at — see
  // `truncated` below.
  const constraints = brand ? [where('brand', '==', brand)] : [];
  const snap = await getDocs(query(
    collection(db, COL.products), ...constraints, fsLimit(INVENTORY_READ_CAP + 1),
  ));
  const truncated = snap.size > INVENTORY_READ_CAP;

  let rows = snap.docs.map(d => docToProduct(d.id, d.data()));

  // Archived first, before anything else narrows the list: every count below
  // — the stock bands, the total the pager reads — should describe the set
  // the person is actually looking at.
  if (archived === 'live') rows = rows.filter(p => !p.archivedAt);
  else if (archived === 'archived') rows = rows.filter(p => Boolean(p.archivedAt));

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
  return {
    products: rows.slice((page - 1) * pageSize, page * pageSize),
    total,
    truncated,
  };
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
  /**
   * True when the catalogue is larger than one read can carry.
   *
   * Every figure above then describes the first INVENTORY_READ_CAP products
   * rather than the shop. Found by opening this page against twelve hundred
   * products: it reported "1000 listed SKUs" with total conviction, and the
   * out-of-stock and low-stock counts under it were drawn from the same
   * truncated set. A dashboard that is confidently wrong is worse than one
   * that admits it cannot see everything, which is the whole of
   * InventoryManager's "Awaiting rather than zero" rule applied to a count.
   */
  catalogueTruncated: boolean;
}

/**
 * One read of the catalogue plus one of orders, aggregated in memory.
 *
 * Firestore has no GROUP BY and no SUM, so every figure here would otherwise
 * be a separate aggregation query or a maintained counter document. At a few
 * hundred products that is more moving parts than it is worth.
 */
export async function loadDashboardStats(): Promise<DashboardStats> {
  // One over the cap, so the truncation can be detected rather than guessed
  // at — see InventoryPage's listInventory for the same trick.
  const snap = await getDocs(query(
    collection(db, COL.products), fsLimit(INVENTORY_READ_CAP + 1),
  ));
  const catalogueTruncated = snap.size > INVENTORY_READ_CAP;

  // Archived products are withdrawn from sale. Counting them as stock made
  // "units in stock" and "stock value" describe inventory nobody can buy —
  // archiving zeroes stock, so the units were right by accident, but the SKU
  // count and the per-brand breakdown were not.
  const products = snap.docs
    .map(d => docToProduct(d.id, d.data()))
    .filter(p => !p.archivedAt)
    .slice(0, INVENTORY_READ_CAP);

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
    catalogueTruncated,
  };
}

export async function getProduct(id: string): Promise<Product | null> {
  const snap = await getDoc(doc(db, COL.products, id));
  return snap.exists() ? docToProduct(snap.id, snap.data()) : null;
}

/**
 * The brands and models the catalogue already carries.
 *
 * The catalogue gate, following InventoryManager: there, staff pick a model
 * from the admin catalogue and only a manager sees the "Add …" pill, so
 * model names snap to one spelling on write. Here the editor offers these as
 * suggestions and normalises what is typed to whichever entry it matches.
 *
 * WHY IT MATTERS MORE THAN IT LOOKS
 *
 * "iPhone 8" and "iphone  8" are two products to every piece of code that
 * groups by model — which is why src/lib/productSiblings.ts has to normalise
 * spacing and case before it can offer a shopper the other sizes of the
 * phone they are looking at. Every feature that groups has to remember to do
 * the same. Fixing it at the keyboard is one rule instead of many.
 *
 * Models are returned per brand, because "Galaxy S23" is a Samsung and
 * offering it while Apple is selected is noise.
 */
export interface CatalogueVocabulary {
  brands: string[];
  /** Brand (lower-cased) to the models listed under it, alphabetically. */
  modelsByBrand: Record<string, string[]>;
}

export async function listCatalogueVocabulary(): Promise<CatalogueVocabulary> {
  // Archived products are included deliberately. A model withdrawn from sale
  // is still the shop's spelling of that model, and excluding it would mean
  // re-listing a phone reintroduces the divergence this exists to prevent.
  const snap = await getDocs(query(collection(db, COL.products), fsLimit(1000)));

  const brands = new Set<string>();
  const models = new Map<string, Set<string>>();

  for (const d of snap.docs) {
    const row = d.data() as { brand?: string; model?: string };
    const brand = row.brand?.trim();
    if (!brand) continue;
    brands.add(brand);

    const model = row.model?.trim();
    if (!model) continue;
    const key = brand.toLowerCase();
    if (!models.has(key)) models.set(key, new Set());
    models.get(key)!.add(model);
  }

  return {
    brands: [...brands].sort((a, b) => a.localeCompare(b)),
    modelsByBrand: Object.fromEntries(
      [...models.entries()].map(([k, v]) => [k, [...v].sort((a, b) => a.localeCompare(b))]),
    ),
  };
}

/**
 * The catalogue's own spelling of what was typed, if it has one.
 *
 * Case and inner spacing are ignored when matching, so "iphone  8" finds
 * "iPhone 8" and is corrected to it. Anything the catalogue has never seen
 * comes back unchanged — this normalises, it does not reject. Refusing a new
 * model is the editor's decision to make, and it depends on who is typing.
 */
export function snapToCatalogue(typed: string, known: readonly string[]): string {
  const norm = (v: string) => v.toLowerCase().replace(/\s+/g, ' ').trim();
  const target = norm(typed);
  if (!target) return typed.trim();
  return known.find(k => norm(k) === target) ?? typed.trim();
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

/**
 * Who is making this change, for the audit stamp on every admin write.
 *
 * Read from the signed-in Firebase user rather than passed in, because a
 * parameter is a parameter somebody eventually forgets, and an audit trail
 * with gaps in it is worse than none: it invites you to conclude that the
 * unstamped rows were nobody.
 *
 * This records who the console believed was signed in. It is not proof —
 * the same browser writes both the change and the name on it — so it answers
 * "who do we think did this" for a team that trusts each other, not "who can
 * we prove did this" in a dispute. Proving it would need the write to go
 * through a server route that reads the uid from a verified token.
 */
function currentActor(): string {
  const user = auth.currentUser;
  return user?.email ?? user?.uid ?? 'unknown';
}

/**
 * The provenance fields every admin write carries.
 *
 * Deliberately not annotated `Record<string, unknown>`: updateDoc wants field
 * values, and widening these to `unknown` makes every spread of them fail to
 * typecheck at the call site rather than here.
 */
function auditFields() {
  return { updatedAt: serverTimestamp(), updatedBy: currentActor() };
}

export async function createProduct(draft: ProductDraft): Promise<Product> {
  const ref = doc(db, COL.products, draft.id);

  // Firestore's setDoc overwrites silently — there is no INSERT that fails on
  // a duplicate key — so the existence check has to be explicit or creating a
  // product with a taken slug would quietly destroy the existing one.
  const existing = await getDoc(ref);
  if (existing.exists()) throw new AlreadyExistsError('A product with that slug already exists.');

  const body = {
    ...draftToRow(draft),
    createdAt: serverTimestamp(),
    createdBy: currentActor(),
    ...auditFields(),
  };
  await withAdminRetry(() => setDoc(ref, body));
  return { ...docToProduct(draft.id, body as Record<string, unknown>) };
}

export async function updateProduct(draft: ProductDraft): Promise<Product> {
  const ref = doc(db, COL.products, draft.id);
  const body = { ...draftToRow(draft), ...auditFields() };
  await withAdminRetry(() => updateDoc(ref, body));
  return { ...docToProduct(draft.id, body as Record<string, unknown>) };
}

export async function setStock(id: string, stock: number): Promise<void> {
  if (!Number.isInteger(stock) || stock < 0) throw new Error('Stock must be a whole number of 0 or more.');
  await withAdminRetry(() => updateDoc(doc(db, COL.products, id), { stock, ...auditFields() }));
}

/**
 * Take a product off sale, keeping the record.
 *
 * This replaces the delete button, which removed the document and every image
 * with it. A product is referenced by every order that ever contained it, so
 * deleting one rewrote history: an old invoice lost the thing it was for, and
 * a return raised against it had nothing to check. InventoryManager's rule —
 * a sale is never deleted, only voided — is the right one here too, and
 * firestore.rules now refuses a product delete outright so this is not merely
 * the polite path but the only one.
 *
 * Stock is zeroed at the same time. An archived product with stock still on
 * it reads, to every count and every reorder list, as inventory the shop has;
 * it does not, because nobody can buy it.
 */
export async function archiveProduct(id: string): Promise<void> {
  const at = new Date().toISOString();
  await withAdminRetry(() => updateDoc(doc(db, COL.products, id), {
    archivedAt: at,
    archivedBy: currentActor(),
    stock: 0,
    ...auditFields(),
  }));
}

/**
 * Put an archived product back on sale.
 *
 * Stock deliberately stays at zero. Archiving zeroed it, and restoring a
 * count from before the product was withdrawn would be inventing stock —
 * whoever restores it should say how many they actually have.
 */
export async function restoreProduct(id: string): Promise<void> {
  await withAdminRetry(() => updateDoc(doc(db, COL.products, id), {
    // deleteField() rather than null: an absent field is what "live" has
    // always looked like, and a null would make every `archivedAt != null`
    // reader agree while every `'archivedAt' in doc` reader disagreed.
    archivedAt: deleteField(),
    archivedBy: deleteField(),
    ...auditFields(),
  }));
}

/**
 * Remove a product and its images for good.
 *
 * Not reachable from the console, and refused by firestore.rules for every
 * caller — it exists for scripts running under the Admin SDK, which bypasses
 * rules, to clear test data. Archiving is what the console does.
 */
export async function purgeProduct(id: string): Promise<void> {
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
  const hosted = await uploadViaCloudinary(
    bucket === BANNER_BUCKET ? 'banner' : 'product',
    file,
    productId,
  );
  if (hosted) return hosted;

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
