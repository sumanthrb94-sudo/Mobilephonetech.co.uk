import {
  collection, doc, getDocs, limit as fsLimit, query, serverTimestamp, writeBatch,
} from 'firebase/firestore';
import { db, COL, withAdminRetry } from './firebase';
import { deleteProduct, draftToRow, emptyDraft, slugify, type ProductDraft } from './adminApi';
import LEGACY_SAMPLE_IDS from '../data/catalogue/legacySampleIds.json';
import type { ProductVariant } from '../types';
import type { CatalogueModel } from '../data/catalogue/apple';

/**
 * Reference catalogue -> draft products.
 *
 * Each model becomes one product with a configuration for every storage ×
 * colour × connectivity Apple sold. Configurations carry no price, condition
 * or stock: those are the shop's decisions per unit, made in the editor. The
 * product is written as a draft (`listed: false`), so it never reaches the
 * shop until staff have priced it and uploaded photos.
 *
 * Import is additive only. A product id that already exists is skipped,
 * never overwritten, so re-running the import cannot undo staff edits,
 * prices, photos or stock.
 */

/** Firestore allows 500 writes per batch; staying well under leaves room. */
const BATCH_SIZE = 200;

export function variantsFor(model: CatalogueModel): ProductVariant[] {
  const storages = model.storage.length ? model.storage : [undefined];
  const radios = model.connectivity?.length ? model.connectivity : [undefined];
  const variants: ProductVariant[] = [];
  for (const storage of storages) {
    for (const colour of model.colours) {
      for (const connectivity of radios) {
        variants.push({
          id: slugify(model.id, storage ?? '', colour.name, connectivity ?? ''),
          storage,
          color: colour.name,
          colorHex: colour.hex,
          connectivity,
          price: 0,
          originalPrice: 0,
          stock: 0,
          stockLocation: 'OFFICE',
        });
      }
    }
  }
  return variants;
}

export function modelToDraft(model: CatalogueModel): ProductDraft {
  return {
    ...emptyDraft(),
    id: model.id,
    brand: model.brand,
    model: model.model,
    category: model.category,
    colorOptions: model.colours.map(c => c.name),
    storageOptions: model.storage,
    variants: variantsFor(model),
    variantMode: true,
    listed: false,
  };
}

/** The Firestore document for a new draft, including the reference-only fields. */
export function modelToDocument(model: CatalogueModel): Record<string, unknown> {
  return {
    ...draftToRow(modelToDraft(model)),
    specs: { ...model.specs, released: model.released },
    released: model.released,
    family: model.family,
    // Where the record came from, so a later import or report can tell
    // reference drafts from products staff created by hand.
    source: 'apple-reference',
  };
}

/** What the import screen needs to know about a product already in the database. */
export interface ExistingProduct {
  id: string;
  brand: string;
  model: string;
  price: number;
  stock: number;
  /** Set by the importers (`inventory-import`, `apple-reference`); absent on the old demo seed. */
  source?: string;
}

/** Every product already in the database, drafts included, keyed by id. */
export async function existingProducts(): Promise<Map<string, ExistingProduct>> {
  const snap = await getDocs(query(collection(db, COL.products), fsLimit(2000)));
  return new Map(snap.docs.map(d => {
    const data = d.data() as Record<string, unknown>;
    return [d.id, {
      id: d.id,
      brand: String(data.brand ?? ''),
      model: String(data.model ?? ''),
      price: Number(data.price ?? 0),
      stock: Number(data.stock ?? 0),
      source: typeof data.source === 'string' ? data.source : undefined,
    }];
  }));
}

export async function existingProductIds(): Promise<Set<string>> {
  return new Set((await existingProducts()).keys());
}

/**
 * Ids of the demo catalogue that `npm run seed` and /api/bootstrap-seed used
 * to copy into Firestore (the old src/data/mockPhones.ts). A product with one
 * of these ids and no `source` was written by that seed rather than by staff
 * or an import, so it is sample data, not stock.
 */
const LEGACY_IDS = new Set<string>(LEGACY_SAMPLE_IDS as string[]);

export function isLegacySample(p: ExistingProduct): boolean {
  return LEGACY_IDS.has(p.id) && !p.source;
}

/** Delete products one at a time, reporting progress; stops at the first failure. */
export async function deleteProducts(ids: string[], onProgress?: (done: number, total: number) => void): Promise<void> {
  for (const [i, id] of ids.entries()) {
    await deleteProduct(id);
    onProgress?.(i + 1, ids.length);
  }
}

export interface ImportResult {
  created: string[];
  skipped: string[];
}

/**
 * Write every model whose id is not already taken. Batches commit in order,
 * so a failure part-way leaves earlier batches written; the caller re-reads
 * existing ids and a second run picks up exactly where the first stopped.
 */
export async function importModels(
  models: CatalogueModel[],
  onProgress?: (done: number, total: number) => void,
): Promise<ImportResult> {
  const existing = await existingProductIds();
  const toCreate = models.filter(m => !existing.has(m.id));
  const skipped = models.filter(m => existing.has(m.id)).map(m => m.id);

  const created: string[] = [];
  for (let i = 0; i < toCreate.length; i += BATCH_SIZE) {
    const chunk = toCreate.slice(i, i + BATCH_SIZE);
    // Built inside the retried function: a WriteBatch cannot be committed
    // twice, so a retry after a token refresh needs a fresh one.
    await withAdminRetry(() => {
      const batch = writeBatch(db);
      for (const model of chunk) {
        batch.set(doc(db, COL.products, model.id), {
          ...modelToDocument(model),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      return batch.commit();
    });
    created.push(...chunk.map(m => m.id));
    onProgress?.(created.length, toCreate.length);
  }
  return { created, skipped };
}
