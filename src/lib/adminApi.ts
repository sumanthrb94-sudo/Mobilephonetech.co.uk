import { supabase } from './supabase';
import { rowToProduct } from '../hooks/useProducts';
import type { Product, ProductGrade } from '../types';

export const IMAGE_BUCKET = 'product-images';
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];

export const GRADES: ProductGrade[] = ['New', 'Pristine', 'Excellent', 'Good', 'Fair'];

/**
 * Admin data layer for the back store.
 *
 * Every call goes through the ordinary browser client carrying the signed-in
 * user's JWT — authorization is enforced by the RLS policies added in
 * `20260805000000_admin_inventory.sql`, not by this file. A non-admin who
 * calls these functions gets a Postgres permission error, which is the point:
 * hiding the UI is presentation, the database is the actual gate.
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

/** Inverse of rowToProduct — camelCase draft to the snake_case column names. */
export function draftToRow(draft: ProductDraft): Record<string, unknown> {
  return {
    id: draft.id,
    model: draft.model,
    brand: draft.brand,
    category: draft.category,
    storage: draft.storage || null,
    price: draft.price,
    original_price: draft.originalPrice,
    grade: draft.grade,
    battery_health: draft.batteryHealth ?? null,
    warranty_months: draft.warrantyMonths,
    return_days: draft.returnDays,
    image_url: draft.imageUrl || null,
    gallery_images: draft.galleryImages?.length ? draft.galleryImages : null,
    is_certified: draft.isCertified,
    stock: draft.stock,
    description: draft.description || null,
    condition_description: draft.conditionDescription || null,
    color_options: draft.colorOptions?.length ? draft.colorOptions : null,
    storage_options: draft.storageOptions?.length ? draft.storageOptions : null,
  };
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

/** Human-readable message for a Supabase error, with the RLS case called out. */
export function describeError(err: unknown): string {
  const e = err as { code?: string; message?: string } | null;
  const message = e?.message ?? String(err);

  if (e?.code === '23505') return 'A product with that slug already exists. Pick a different one.';
  if (e?.code === '42501' || /row-level security/i.test(message)) {
    return 'Your account is not an admin, so the database refused the change.';
  }
  if (e?.code === '23514') return 'A value is outside the range the database allows.';
  return message || 'Something went wrong.';
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

  let query = supabase.from('products').select('*', { count: 'exact' });

  if (search?.trim()) {
    const term = search.trim().replace(/[%,]/g, '');
    query = query.or(`model.ilike.%${term}%,brand.ilike.%${term}%,id.ilike.%${term}%`);
  }
  if (brand) query = query.eq('brand', brand);

  if (stockFilter === 'in') query = query.gt('stock', 0);
  else if (stockFilter === 'out') query = query.eq('stock', 0);
  else if (stockFilter === 'low') query = query.gt('stock', 0).lte('stock', LOW_STOCK_THRESHOLD);

  switch (sort) {
    case 'stock_asc':  query = query.order('stock', { ascending: true }); break;
    case 'price_desc': query = query.order('price', { ascending: false }); break;
    case 'model_asc':  query = query.order('model', { ascending: true }); break;
    default:           query = query.order('created_at', { ascending: false });
  }

  query = query.range((page - 1) * pageSize, page * pageSize - 1);

  const { data, error, count } = await query;
  if (error) throw error;

  return {
    products: (data ?? []).map(r => rowToProduct(r as Record<string, unknown>)),
    total: count ?? 0,
  };
}

export async function getProduct(id: string): Promise<Product | null> {
  const { data, error } = await supabase.from('products').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? rowToProduct(data as Record<string, unknown>) : null;
}

export async function listBrands(): Promise<string[]> {
  const { data, error } = await supabase.from('products').select('brand');
  if (error) throw error;
  const set = new Set<string>();
  for (const row of data ?? []) {
    const b = (row as { brand?: string }).brand;
    if (b) set.add(b);
  }
  return [...set].sort();
}

// ── Writes ─────────────────────────────────────────────────────

export async function createProduct(draft: ProductDraft): Promise<Product> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('products') as any)
    .insert(draftToRow(draft))
    .select()
    .single();
  if (error) throw error;
  return rowToProduct(data as Record<string, unknown>);
}

export async function updateProduct(draft: ProductDraft): Promise<Product> {
  const row = draftToRow(draft);
  // The primary key is the URL slug — changing it would orphan every existing
  // link, so it is fixed after creation and never sent in an update.
  delete row.id;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('products') as any)
    .update(row)
    .eq('id', draft.id)
    .select()
    .single();
  if (error) throw error;
  return rowToProduct(data as Record<string, unknown>);
}

export async function setStock(id: string, stock: number): Promise<void> {
  if (!Number.isInteger(stock) || stock < 0) throw new Error('Stock must be a whole number of 0 or more.');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('products') as any).update({ stock }).eq('id', id);
  if (error) throw error;
}

export async function deleteProduct(id: string): Promise<void> {
  // product_variants cascades on delete; the stored images do not, so they are
  // removed first. Losing an image is recoverable, a dangling variant is not.
  await deleteAllImagesFor(id).catch(() => { /* orphaned files are not fatal */ });
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) throw error;
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

  const { error } = await supabase.storage
    .from(IMAGE_BUCKET)
    .upload(path, file, { cacheControl: '31536000', upsert: false });
  if (error) throw error;

  const { data } = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Storage path from a public URL. Returns null for images that are not in our
 * bucket — seeded products point at `/assets/…` files bundled with the app, and
 * trying to "delete" one of those from storage would fail confusingly.
 */
export function pathFromPublicUrl(url: string): string | null {
  const marker = `/storage/v1/object/public/${IMAGE_BUCKET}/`;
  const i = url.indexOf(marker);
  return i === -1 ? null : decodeURIComponent(url.slice(i + marker.length));
}

export async function deleteImage(url: string): Promise<void> {
  const path = pathFromPublicUrl(url);
  if (!path) return; // bundled asset — nothing stored to remove
  const { error } = await supabase.storage.from(IMAGE_BUCKET).remove([path]);
  if (error) throw error;
}

async function deleteAllImagesFor(productId: string): Promise<void> {
  const { data, error } = await supabase.storage.from(IMAGE_BUCKET).list(productId);
  if (error || !data?.length) return;
  await supabase.storage.from(IMAGE_BUCKET).remove(data.map(f => `${productId}/${f.name}`));
}
