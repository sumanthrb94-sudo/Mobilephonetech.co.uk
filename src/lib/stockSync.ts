import type { Product, ProductVariant } from '../types';
import {
  brandOf, canonicalModel, categoryOf, colourOf, describe, slugify, storageOf, GRADE_NOTE,
} from '../../scripts/lib/catalogue.mjs';

/**
 * Stock sync: make the shop match the stock app's inventory report.
 *
 * The report's Office Stock tab lists every handset on the shelf (sold units
 * are not in it). This turns that tab into a plan of product writes:
 *
 *   - every listing with units in the report gets exactly those units as its
 *     stock, priced at the highest buying price in each colour plus MARKUP,
 *     rounded up to the pound, and shown as Pristine;
 *   - every other listing is set to 0 and stays on the shop as out of stock.
 *
 * The plan is pure so it can be previewed and tested; the admin page applies
 * it. Buying prices never reach a product document: products are public, and
 * what we paid is not.
 */

/** Selling price = buying price × this. 1.2 is a 20% markup. */
export const MARKUP = 1.2;

/** The tab that holds what is physically in the office. SHS is stock not yet received. */
export const OFFICE_SHEET = 'Office Stock';

export interface SyncUnit {
  imei: string;
  brand: string;
  model: string;
  category: string;
  storage: string | null;
  colour: string | null;
  buyPrice: number;
}

export interface SkippedRow { row: number; model: string; reason: string }

export function retailPrice(buyPrice: number): number {
  // Rounded to pence first so 100 × 1.2 = 120.00000000000001 is £120, not £121.
  return Math.ceil(Math.round(buyPrice * MARKUP * 100) / 100);
}

/** Rows of the Office Stock tab, as SheetJS reads them (header row → keys). */
export function parseOfficeRows(rows: Record<string, unknown>[]): { units: SyncUnit[]; skipped: SkippedRow[] } {
  const units: SyncUnit[] = [];
  const skipped: SkippedRow[] = [];
  const seen = new Set<string>();

  rows.forEach((row, index) => {
    const line = index + 2; // header is row 1
    const rawModel = String(row.Model ?? '').trim();
    const imei = String(row.IMEI ?? '').trim();
    const buyPrice = Number(row.BP);
    const location = String(row['Stock Type'] ?? '').trim().toUpperCase() || 'OFFICE';

    if (!rawModel && !imei) return; // blank line
    const reason = location !== 'OFFICE' ? `Stock Type is ${location}, not OFFICE`
      : !rawModel ? 'No model'
      : !imei ? 'No IMEI'
      : seen.has(imei) ? 'IMEI listed twice'
      : !(buyPrice > 0) ? 'No buying price'
      : null;
    if (reason) {
      skipped.push({ row: line, model: rawModel, reason });
      return;
    }
    seen.add(imei);

    units.push({
      imei,
      brand: brandOf(rawModel),
      model: canonicalModel(rawModel),
      category: categoryOf(rawModel),
      storage: storageOf(row.Storage),
      colour: colourOf(row.Colour),
      buyPrice,
    });
  });
  return { units, skipped };
}

const norm = (s: string | null | undefined) => String(s ?? '').trim().toLowerCase();

/** The (brand, model, storage) a listing sells, in the same shape a unit has. */
function listingKey(brand: string, model: string, storage: string | null | undefined): string {
  return slugify(brand, canonicalModel(model), storageOf(storage) ?? '');
}

/** Every key an existing product answers to: one per storage it offers. */
function keysOf(p: Product): string[] {
  const storages = new Set<string>();
  if (p.storage) storages.add(p.storage);
  if (p.specs?.storage) storages.add(p.specs.storage);
  for (const s of p.storageOptions ?? []) storages.add(s);
  for (const v of p.variants ?? []) if (v.storage) storages.add(v.storage);
  const keys = new Set<string>([p.id]);
  if (!storages.size) keys.add(listingKey(p.brand, p.model, null));
  for (const s of storages) keys.add(listingKey(p.brand, p.model, s));
  return [...keys];
}

export interface PlannedVariantLine { storage: string | null; colour: string | null; units: number; maxBuyPrice: number; price: number }

export interface PlannedProduct {
  id: string;
  /** null when the listing is new. */
  existing: Product | null;
  brand: string;
  model: string;
  category: string;
  lines: PlannedVariantLine[];
  stock: number;
  price: number;
  /** The fields written to products/{id}. */
  row: Record<string, unknown>;
}

export interface ZeroedProduct { id: string; brand: string; model: string; previousStock: number }

export interface SyncPlan {
  updates: PlannedProduct[];
  creates: PlannedProduct[];
  zeroed: ZeroedProduct[];
  /** Listings already at 0 and not in the report: nothing to write. */
  alreadyOut: number;
  units: number;
}

function variantStock(p: Product): number {
  const fromVariants = (p.variants ?? []).reduce((sum, v) => sum + (Number(v.stock) || 0), 0);
  return Math.max(Number(p.stock) || 0, fromVariants);
}

export function planStockSync(units: SyncUnit[], products: Product[]): SyncPlan {
  const index = new Map<string, Product>();
  for (const p of products) for (const k of keysOf(p)) if (!index.has(k)) index.set(k, p);

  // Units grouped by the listing they belong to: an existing product when one
  // sells that model and storage, otherwise a new listing per model + storage.
  const groups = new Map<string, { existing: Product | null; units: SyncUnit[] }>();
  for (const unit of units) {
    const key = listingKey(unit.brand, unit.model, unit.storage);
    const existing = index.get(key) ?? null;
    const id = existing?.id ?? key;
    if (!groups.has(id)) groups.set(id, { existing, units: [] });
    groups.get(id)!.units.push(unit);
  }

  const updates: PlannedProduct[] = [];
  const creates: PlannedProduct[] = [];

  for (const [id, { existing, units: group }] of groups) {
    const byLine = new Map<string, SyncUnit[]>();
    for (const u of group) {
      const k = `${u.storage ?? ''}|${u.colour ?? ''}`;
      if (!byLine.has(k)) byLine.set(k, []);
      byLine.get(k)!.push(u);
    }

    const lines: PlannedVariantLine[] = [...byLine.values()].map(lineUnits => {
      // The dearest unit sets the price, so no unit behind it sells under cost + markup.
      const maxBuyPrice = Math.max(...lineUnits.map(u => u.buyPrice));
      return {
        storage: lineUnits[0].storage, colour: lineUnits[0].colour,
        units: lineUnits.length, maxBuyPrice, price: retailPrice(maxBuyPrice),
      };
    }).sort((a, b) => a.price - b.price || norm(a.colour).localeCompare(norm(b.colour)));

    // Photos and swatches staff added to a colour stay with that colour.
    const photoFor = (colour: string | null): Partial<ProductVariant> => {
      const match = (existing?.variants ?? []).find(v => norm(v.color) === norm(colour) && (v.imageUrl || v.galleryImages?.length || v.colorHex));
      return match ? { imageUrl: match.imageUrl, galleryImages: match.galleryImages, colorHex: match.colorHex } : {};
    };

    const variants: ProductVariant[] = lines.map(line => {
      const v: ProductVariant = {
        id: slugify('pristine', line.storage ?? '', line.colour ?? 'default'),
        condition: 'Pristine',
        price: line.price,
        originalPrice: line.price,
        stock: line.units,
        batteryHealth: 100,
        ...photoFor(line.colour),
      };
      if (line.colour) v.color = line.colour;
      if (line.storage) v.storage = line.storage;
      return v;
    });

    const first = group[0];
    const stock = group.length;
    const price = lines[0].price;
    const colours = [...new Set(lines.map(l => l.colour).filter((c): c is string => Boolean(c)))].sort();
    const storages = [...new Set(lines.map(l => l.storage).filter((s): s is string => Boolean(s)))];

    const row: Record<string, unknown> = {
      price,
      // Same as price: a "was" price nobody ever charged is a fake saving.
      originalPrice: price,
      grade: 'Pristine',
      batteryHealth: 100,
      stock,
      variants: variants.map(stripUndefined),
      variantMode: true,
      colorOptions: colours.length ? colours : null,
      storageOptions: storages.length ? storages : null,
      conditionOptions: ['Pristine'],
      conditionDescription: GRADE_NOTE.Pristine,
      listed: true,
      // Cost data must not sit on a public document.
      buyPrice: null,
      supplier: null,
    };

    const planned: PlannedProduct = {
      id, existing,
      brand: existing?.brand ?? first.brand,
      model: existing?.model ?? first.model,
      category: existing?.category ?? first.category,
      lines, stock, price, row,
    };

    if (existing) {
      updates.push(planned);
    } else {
      Object.assign(row, {
        brand: first.brand,
        model: first.model,
        category: first.category,
        storage: first.storage,
        warrantyMonths: 12,
        returnDays: 30,
        isCertified: true,
        imageUrl: '',
        specs: first.storage ? { storage: first.storage } : {},
        description: describe({
          brand: first.brand, model: first.model, category: first.category,
          storage: first.storage, simType: null, caseSize: null,
          grades: ['Pristine'], colours,
        }),
        stockLocation: 'OFFICE',
        source: 'stock-sync',
      });
      creates.push(planned);
    }
  }

  const synced = new Set(groups.keys());
  const zeroed: ZeroedProduct[] = [];
  let alreadyOut = 0;
  for (const p of products) {
    if (synced.has(p.id)) continue;
    const previousStock = variantStock(p);
    if (previousStock > 0) zeroed.push({ id: p.id, brand: p.brand, model: p.model, previousStock });
    else alreadyOut += 1;
  }

  const byName = (a: { brand: string; model: string }, b: { brand: string; model: string }) =>
    `${a.brand} ${a.model}`.localeCompare(`${b.brand} ${b.model}`);
  return {
    updates: updates.sort(byName), creates: creates.sort(byName), zeroed: zeroed.sort(byName),
    alreadyOut, units: units.length,
  };
}

/** The write that takes a listing out of stock without hiding it. */
export function zeroRow(p: Product): Record<string, unknown> {
  return {
    stock: 0,
    // The per-unit ledger goes too: the editor recounts stock from it on save,
    // which would quietly put these units back on sale, and it held IMEIs and
    // buying prices on a public document. The stock app is the unit record.
    variants: p.variants?.length
      ? p.variants.map(({ inventoryUnits: _units, buyPrice: _cost, supplier: _supplier, imei: _imei, ...v }) => stripUndefined({ ...v, stock: 0 }))
      : null,
    buyPrice: null,
    supplier: null,
  };
}

function stripUndefined<T extends object>(o: T): T {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T;
}
