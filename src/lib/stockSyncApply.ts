import { collection, doc, getDocs, limit as fsLimit, query, serverTimestamp, writeBatch } from 'firebase/firestore';
import * as XLSX from 'xlsx';
import { db, COL, withAdminRetry } from './firebase';
import { buildSearchTerms, docToProduct } from './productMapper';
import { OFFICE_SHEET, parseOfficeRows, zeroRow, type SyncPlan } from './stockSync';
import type { Product } from '../types';

/** Firestore allows 500 writes per batch; this leaves headroom. */
const BATCH_SIZE = 200;

/** Read the Office Stock tab of an inventory report the stock app exported. */
export async function readInventoryReport(file: File) {
  const wb = XLSX.read(await file.arrayBuffer());
  const sheet = wb.Sheets[OFFICE_SHEET];
  if (!sheet) throw new Error(`This file has no "${OFFICE_SHEET}" tab. Export the inventory report from the stock app and upload that.`);
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
  return parseOfficeRows(rows);
}

export async function loadAllProducts(): Promise<Product[]> {
  const snap = await getDocs(query(collection(db, COL.products), fsLimit(5000)));
  return snap.docs.map(d => docToProduct(d.id, d.data() as Record<string, unknown>));
}

/**
 * Write the plan. Batches commit one after another, so an error part-way
 * leaves the earlier batches applied; running the sync again with the same
 * report finishes the job, because every write sets an absolute value.
 */
export async function applyStockSync(
  plan: SyncPlan,
  products: Product[],
  onProgress?: (done: number, total: number) => void,
): Promise<void> {
  const byId = new Map(products.map(p => [p.id, p]));
  const writes: Array<{ id: string; data: Record<string, unknown>; create: boolean }> = [
    ...plan.updates.map(p => ({ id: p.id, create: false, data: { ...p.row, searchTerms: buildSearchTerms(p.brand, p.model, p.category) } })),
    ...plan.creates.map(p => ({ id: p.id, create: true, data: { ...p.row, searchTerms: buildSearchTerms(p.brand, p.model, p.category) } })),
    ...plan.zeroed.map(z => ({ id: z.id, create: false, data: zeroRow(byId.get(z.id)!) })),
  ];

  let done = 0;
  for (let i = 0; i < writes.length; i += BATCH_SIZE) {
    const chunk = writes.slice(i, i + BATCH_SIZE);
    // Built inside the retried function: a WriteBatch cannot be committed twice.
    await withAdminRetry(() => {
      const batch = writeBatch(db);
      for (const w of chunk) {
        const ref = doc(db, COL.products, w.id);
        if (w.create) batch.set(ref, { ...w.data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
        else batch.update(ref, { ...w.data, updatedAt: serverTimestamp() });
      }
      return batch.commit();
    });
    done += chunk.length;
    onProgress?.(done, writes.length);
  }
}
