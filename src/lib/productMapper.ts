import type { Product, ProductGrade, ProductVariant } from '../types';
import { isUploadedPhoto, photosFirst } from './productImages.js';

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
  buyPrice?: number | null;
  supplier?: string | null;
  imei?: string | null;
  sku?: string | null;
  stockLocation?: string | null;
  /** False hides the product from the shop; absent means listed. */
  listed?: boolean | null;
  variantMode?: boolean | null;
  /** Reference-catalogue fields carried for staff: release month and family. */
  released?: string | null;
  createdAt?: unknown;
  updatedAt?: unknown;
  /** Lowercased "brand model" for prefix search — Firestore has no ILIKE. */
  searchTerms?: string[];
}

export function docToProduct(id: string, d: Record<string, unknown>): Product {
  // Real photos ahead of placeholder drawings, for each colour and for the
  // product — see photosFirst. A product whose own main image is still a
  // drawing takes its first colour's photo, in-stock colours first, so a
  // card never shows a drawing while a real photo of that phone exists.
  const variants = Array.isArray(d.variants)
    ? (d.variants as ProductVariant[]).map(v => (v && typeof v === 'object' ? { ...v, ...photosFirst(v.imageUrl, v.galleryImages) } : v))
    : undefined;
  const own = photosFirst(d.imageUrl, d.galleryImages);
  const fromColour = isUploadedPhoto(own.imageUrl) ? undefined
    : [...(variants ?? [])].sort((a, b) => Number((b?.stock ?? 0) > 0) - Number((a?.stock ?? 0) > 0))
        .find(v => isUploadedPhoto(v?.imageUrl));
  const images = fromColour ? { imageUrl: fromColour.imageUrl as string, galleryImages: fromColour.galleryImages } : own;
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
    imageUrl: images.imageUrl ?? '',
    galleryImages: images.galleryImages ?? undefined,
    isCertified: Boolean(d.isCertified),
    stock: Number(d.stock ?? 0),
    specs: (d.specs as Product['specs']) ?? {},
    description: (d.description as string) ?? undefined,
    conditionDescription: (d.conditionDescription as string) ?? undefined,
    colorOptions: (d.colorOptions as string[]) ?? undefined,
    storageOptions: (d.storageOptions as string[]) ?? undefined,
    conditionOptions: (d.conditionOptions as ProductGrade[]) ?? undefined,
    variants,
    reviews: (d.reviews as Product['reviews']) ?? undefined,
    buyPrice: d.buyPrice != null ? Number(d.buyPrice) : undefined,
    supplier: (d.supplier as string) ?? undefined,
    imei: (d.imei as string) ?? undefined,
    sku: (d.sku as string) ?? undefined,
    stockLocation: (d.stockLocation as Product['stockLocation']) ?? undefined,
    listed: d.listed === false ? false : undefined,
    variantMode: d.variantMode === true ? true : undefined,
  };
}

/**
 * Whether shoppers may see a product. Only an explicit `listed: false` hides
 * one: every document written before drafts existed has no such field and
 * must stay on the shop.
 */
export function isListed(d: { listed?: unknown } | null | undefined): boolean {
  return d?.listed !== false;
}

/**
 * A configuration is on offer once it has a price. Imported models carry a
 * row for every storage × colour Apple made; staff price the ones they stock
 * and the rest stay unpriced, which keeps them out of the shop entirely.
 */
export function isOffered(v: { price?: unknown } | null | undefined): boolean {
  return Number(v?.price) > 0;
}

/** The product as shoppers see it: unpriced configurations removed. */
export function forShop(p: Product): Product {
  if (!p.variants?.length) return p;
  return { ...p, variants: p.variants.filter(isOffered) };
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
