import { describe, expect, it } from 'vitest';
import { parseOfficeRows, planStockSync, retailPrice, zeroRow } from '../../lib/stockSync';
import type { Product } from '../../types';

const row = (o: Record<string, unknown>) => ({ 'Stock Type': 'OFFICE', Storage: '64GB', Colour: 'Black', ...o });

const product = (o: Partial<Product>): Product => ({
  id: 'x', model: 'X', brand: 'Samsung', category: 'Phones', price: 50, originalPrice: 50, grade: 'Excellent',
  batteryHealth: 90, warrantyMonths: 12, returnDays: 30, imageUrl: '', isCertified: true, stock: 0, specs: {}, ...o,
});

describe('retailPrice', () => {
  it('adds 20% and rounds up to the pound', () => {
    expect(retailPrice(100)).toBe(120);
    expect(retailPrice(63)).toBe(76); // 75.60
    expect(retailPrice(58)).toBe(70); // 69.60
  });
});

describe('parseOfficeRows', () => {
  it('normalises names and skips rows that cannot be sold', () => {
    const { units, skipped } = parseOfficeRows([
      row({ Model: 'SAMSUNG GALAXY A16', IMEI: '1', BP: 92, Storage: '128GB/4GB' }),
      row({ Model: 'Galaxy A32', IMEI: '', BP: 60 }),
      row({ Model: 'Galaxy A32', IMEI: '2', BP: 0 }),
      row({ Model: 'Galaxy A32', IMEI: '3', BP: 60, 'Stock Type': 'SHS' }),
      row({ Model: 'Galaxy A32', IMEI: '1', BP: 60 }),
      row({ Model: 'P30 Pro', IMEI: '4', BP: 110, Colour: 'Unspecified' }),
      row({ Model: '', IMEI: '' }),
    ]);
    expect(units.map(u => [u.brand, u.model, u.storage, u.colour])).toEqual([
      ['Samsung', 'Galaxy A16', '128GB', 'Black'],
      ['Huawei', 'P30 Pro', '64GB', null],
    ]);
    expect(skipped.map(s => s.reason)).toEqual(['No IMEI', 'No buying price', 'Stock Type is SHS, not OFFICE', 'IMEI listed twice']);
  });
});

describe('planStockSync', () => {
  const units = parseOfficeRows([
    row({ Model: 'Galaxy A32', IMEI: '1', BP: 58 }),
    row({ Model: 'GALAXY A32', IMEI: '2', BP: 63 }),
    row({ Model: 'Galaxy A32', IMEI: '3', BP: 60, Colour: 'White' }),
    row({ Model: 'Galaxy S9', IMEI: '4', BP: 75 }),
  ]).units;

  const a32 = product({
    id: 'samsung-galaxy-a32-64gb', model: 'Galaxy A32', storage: '64GB', price: 58, stock: 62, buyPrice: 58, supplier: 'MHL',
    variants: [{ id: 'v1', color: 'Black', condition: 'Excellent', price: 58, originalPrice: 58, stock: 60, imageUrl: 'https://img/black.jpg' }],
  });
  const old = product({ id: 'apple-iphone-8', brand: 'Apple', model: 'iPhone 8', stock: 3,
    variants: [{ id: 'v', price: 55, originalPrice: 55, stock: 3, buyPrice: 40, imei: '9', inventoryUnits: [{ id: '9', status: 'available' }] }] });
  const empty = product({ id: 'gone', stock: 0 });

  const plan = planStockSync(units, [a32, old, empty]);

  it('prices each colour from its dearest unit, as Pristine, and keeps colour photos', () => {
    const [update] = plan.updates;
    expect(update.id).toBe('samsung-galaxy-a32-64gb');
    expect(update.lines.map(l => [l.colour, l.units, l.price])).toEqual([['Black', 2, 76], ['White', 1, 72]].sort((a, b) => (a[2] as number) - (b[2] as number)));
    expect(update.row).toMatchObject({ stock: 3, price: 72, originalPrice: 72, grade: 'Pristine', listed: true, buyPrice: null, supplier: null });
    const black = (update.row.variants as Array<Record<string, unknown>>).find(v => v.color === 'Black');
    expect(black).toMatchObject({ condition: 'Pristine', stock: 2, price: 76, imageUrl: 'https://img/black.jpg' });
    expect(JSON.stringify(update.row)).not.toMatch(/buyPrice":\d/);
  });

  it('creates a listing for a model the shop does not have', () => {
    expect(plan.creates.map(c => [c.id, c.stock, c.price])).toEqual([['samsung-galaxy-s9-64gb', 1, 90]]);
    expect(plan.creates[0].row).toMatchObject({ brand: 'Samsung', model: 'Galaxy S9', listed: true, grade: 'Pristine' });
  });

  it('takes everything else out of stock without hiding it, and strips cost data', () => {
    expect(plan.zeroed.map(z => z.id)).toEqual(['apple-iphone-8']);
    expect(plan.alreadyOut).toBe(1);
    const write = zeroRow(old);
    expect(write).toMatchObject({ stock: 0, buyPrice: null, supplier: null });
    expect(write).not.toHaveProperty('listed');
    expect(write.variants).toEqual([{ id: 'v', price: 55, originalPrice: 55, stock: 0 }]);
  });
});
