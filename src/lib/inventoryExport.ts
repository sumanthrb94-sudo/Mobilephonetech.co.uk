import { collection, getDocs, limit, query } from 'firebase/firestore';
import { db, COL } from './firebase';
import { docToProduct } from './productMapper';
import type { InventoryUnit as ReportUnit } from './reports';
import type { Product } from '../types';

/**
 * Stock on hand as report rows, one row per physical unit, read live from the
 * catalogue. Tracked units carry their own IMEI, supplier and date; untracked
 * stock is one row per counted unit. Buy prices and suppliers are included
 * only for staff allowed to see costs.
 */
export function productUnits(p: Product, { includeCost }: { includeCost: boolean }): ReportUnit[] {
  const name = `${p.brand} ${p.model}`.trim();
  const configs = p.variants?.length ? p.variants : [{ ...p, condition: p.grade, color: p.colorOptions?.[0] } as never];
  const rows: ReportUnit[] = [];

  for (const v of configs as Array<Record<string, any>>) {
    const base: ReportUnit = {
      model: name,
      storage: v.storage ?? p.storage,
      color: v.color,
      condition: v.condition ?? p.grade,
      simType: v.simType,
      stockLocation: v.stockLocation ?? p.stockLocation ?? 'OFFICE',
      stockInDate: v.stockInDate,
      ...(includeCost ? { buyPrice: v.buyPrice ?? p.buyPrice, supplier: v.supplier ?? p.supplier } : {}),
    };
    const tracked = (v.inventoryUnits ?? []).filter((u: Record<string, any>) => u.status === 'available');
    if (tracked.length) {
      for (const u of tracked) {
        rows.push({
          ...base,
          imei: u.imei,
          stockLocation: u.stockLocation ?? base.stockLocation,
          stockInDate: u.stockInDate ?? base.stockInDate,
          notes: u.notes,
          ...(includeCost ? { buyPrice: u.buyPrice ?? base.buyPrice, supplier: u.supplier ?? base.supplier } : {}),
        });
      }
    } else {
      for (let i = 0; i < Math.max(0, Number(v.stock) || 0); i++) rows.push({ ...base });
    }
  }
  return rows;
}

export async function liveInventoryUnits(opts: { includeCost: boolean }): Promise<ReportUnit[]> {
  const snap = await getDocs(query(collection(db, COL.products), limit(1000)));
  return snap.docs.flatMap(d => productUnits(docToProduct(d.id, d.data()), opts));
}
