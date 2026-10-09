import { describe, it, expect } from 'vitest';
import {
  splitPrivate, mergePrivate, stripPrivate, legacyPrivateKeys,
  splitOrderCost, mergeOrderCost, PRIVATE_PRODUCT_KEYS, PRIVATE_VARIANT_KEYS,
} from '../../lib/productPrivate';
import { docToProduct, forShop } from '../../lib/productMapper';

/**
 * Anyone can read a product document, so the only thing standing between a
 * shopper and what each handset cost is that these fields are never on it.
 * Every property below is a way the split could quietly leak or lose data.
 */

const unit = (id: string, status = 'available') => ({
  id, imei: `35${id.padStart(13, '0')}`, sku: `SKU-${id}`, supplier: 'MHL', buyPrice: 310,
  notes: 'tiny scuff', status, unitHistory: [{ at: '2026-09-01', type: 'IN', detail: 'MHL' }],
});

const row = () => ({
  model: 'iPhone 15', brand: 'Apple', price: 400, stock: 2, listed: true,
  buyPrice: 300, supplier: 'MHL', imei: '350000000000001', sku: 'IP15',
  stockLocation: 'OFFICE',
  variants: [
    {
      id: 'v128', color: 'Black', storage: '128GB', price: 400, originalPrice: 500, stock: 2,
      stockLocation: 'OFFICE', simType: 'eSIM',
      buyPrice: 300, supplier: 'MHL', imei: '350000000000001', sku: 'IP15-128',
      notes: 'note', stockInDate: '2026-09-01', unitHistory: [{ at: '2026-09-01', type: 'IN' }],
      inventoryUnits: [unit('1'), unit('2')],
    },
    { id: 'v256', color: 'Blue', storage: '256GB', price: 0, originalPrice: 0, stock: 0 },
  ],
});

const leaks = (data: Record<string, any>) => [
  ...PRIVATE_PRODUCT_KEYS.filter(k => k in data),
  ...(data.variants ?? []).flatMap((v: Record<string, unknown>) => PRIVATE_VARIANT_KEYS.filter(k => k in v)),
];

describe('splitPrivate', () => {
  it('leaves nothing private on the public half, top level or per configuration', () => {
    const { publicRow } = splitPrivate(row());
    expect(leaks(publicRow)).toEqual([]);
    // What shoppers need is still there.
    expect(publicRow).toMatchObject({ model: 'iPhone 15', price: 400, stock: 2, stockLocation: 'OFFICE' });
    expect((publicRow.variants as any[])[0]).toEqual({
      id: 'v128', color: 'Black', storage: '128GB', price: 400, originalPrice: 500, stock: 2,
      stockLocation: 'OFFICE', simType: 'eSIM',
    });
  });

  it('keys private configuration data by variant id', () => {
    const { privateDoc } = splitPrivate(row());
    expect(privateDoc).toMatchObject({ buyPrice: 300, supplier: 'MHL', imei: '350000000000001', sku: 'IP15' });
    expect(Object.keys(privateDoc.variants!)).toEqual(['v128']);
    expect(privateDoc.variants!.v128.inventoryUnits).toHaveLength(2);
    expect(privateDoc.variants!.v128).toMatchObject({ notes: 'note', stockInDate: '2026-09-01', buyPrice: 300 });
  });

  it('writes no entry for a configuration with nothing private', () => {
    const { privateDoc } = splitPrivate(row());
    expect(privateDoc.variants).not.toHaveProperty('v256');
  });

  it('drops undefined but keeps null, so a cleared cost overwrites the old one', () => {
    const { publicRow, privateDoc } = splitPrivate({
      model: 'x', buyPrice: null, supplier: undefined,
      variants: [{ id: 'a', price: 1, buyPrice: undefined, notes: undefined }],
    });
    expect(privateDoc).toEqual({ buyPrice: null, variants: {} });
    expect('supplier' in privateDoc).toBe(false);
    expect(publicRow).toEqual({ model: 'x', variants: [{ id: 'a', price: 1 }] });
  });

  it('handles a product with no configurations', () => {
    const { publicRow, privateDoc } = splitPrivate({ model: 'x', variants: null, buyPrice: 5 });
    expect(publicRow).toEqual({ model: 'x', variants: null });
    expect(privateDoc).toEqual({ buyPrice: 5 });
  });

  it('does not mutate its input', () => {
    const input = row();
    const before = structuredClone(input);
    splitPrivate(input);
    expect(input).toEqual(before);
  });
});

describe('mergePrivate', () => {
  it('round-trips: split then merge gives back the original row', () => {
    const original = row();
    const { publicRow, privateDoc } = splitPrivate(original);
    expect(mergePrivate(publicRow, privateDoc)).toEqual(original);
  });

  it('reads a legacy public document as-is when there is no private half yet', () => {
    const legacy = row();
    expect(mergePrivate(legacy, undefined)).toEqual(legacy);
    expect(mergePrivate(legacy, null)).toEqual(legacy);
  });

  it('prefers the private half over legacy fields still on the public document', () => {
    const legacy = row();
    const merged = mergePrivate(legacy, {
      buyPrice: 250,
      variants: { v128: { buyPrice: 260, inventoryUnits: [unit('9')] } },
    });
    expect(merged.buyPrice).toBe(250);
    // Fields the private half lacks fall back to the legacy value.
    expect(merged.supplier).toBe('MHL');
    const v = (merged.variants as any[])[0];
    expect(v.buyPrice).toBe(260);
    expect(v.inventoryUnits.map((u: any) => u.id)).toEqual(['9']);
    expect(v.notes).toBe('note');
  });

  it('attaches costs by variant id, not position, so a reordered matrix keeps them straight', () => {
    const { publicRow, privateDoc } = splitPrivate(row());
    const reordered = { ...publicRow, variants: [...(publicRow.variants as any[])].reverse() };
    const merged = mergePrivate(reordered, privateDoc).variants as any[];
    expect(merged[0].id).toBe('v256');
    expect(merged[0]).not.toHaveProperty('buyPrice');
    expect(merged[1]).toMatchObject({ id: 'v128', buyPrice: 300 });
  });

  it('leaves configurations without private data untouched', () => {
    const merged = mergePrivate({ variants: [{ id: 'a', price: 1 }] }, { variants: {} });
    expect(merged.variants).toEqual([{ id: 'a', price: 1 }]);
  });

  it('falls back to position for a legacy configuration with no id', () => {
    const original = { variants: [{ price: 1, buyPrice: 9 }, { price: 2, buyPrice: 8 }] };
    const { publicRow, privateDoc } = splitPrivate(original);
    expect(publicRow.variants).toEqual([{ price: 1 }, { price: 2 }]);
    expect(mergePrivate(publicRow, privateDoc)).toEqual(original);
  });

  it('ignores keys in the private document that are not private fields', () => {
    const merged = mergePrivate({ price: 400, variants: [{ id: 'a', price: 1 }] }, {
      updatedAt: 'x', variants: { a: { price: 0.01, buyPrice: 3 } },
    } as any);
    expect(merged).not.toHaveProperty('updatedAt');
    expect((merged.variants as any[])[0]).toEqual({ id: 'a', price: 1, buyPrice: 3 });
  });
});

describe('stripPrivate and forShop', () => {
  it('strips every private field from a legacy document', () => {
    expect(leaks(stripPrivate(row()))).toEqual([]);
  });

  it('lists the legacy top-level fields a save must delete', () => {
    expect(legacyPrivateKeys(row())).toEqual(['buyPrice', 'supplier', 'imei', 'sku']);
    expect(legacyPrivateKeys({ model: 'x' })).toEqual([]);
  });

  it('a legacy document mapped for the shop shows no cost, supplier, IMEI or ledger', () => {
    const shown = forShop(docToProduct('apple-iphone-15', row()));
    expect(leaks(shown as unknown as Record<string, unknown>)).toEqual([]);
    // Unpriced configurations are still filtered as before.
    expect(shown.variants?.map(v => v.id)).toEqual(['v128']);
  });
});

describe('order costs', () => {
  const items = [
    { productId: 'a', price: 400, quantity: 1, buyPrice: 300, imei: '350000000000001' },
    { productId: 'b', price: 19, quantity: 2 },
  ];

  it('takes the cost off every line and keeps it per line, in order', () => {
    const { publicItems, privateDoc } = splitOrderCost(items);
    expect(publicItems.every(i => !('buyPrice' in i))).toBe(true);
    // The buyer seeing their own handset's IMEI is fine.
    expect(publicItems[0].imei).toBe('350000000000001');
    expect(privateDoc).toEqual({ items: [{ buyPrice: 300 }, {}] });
  });

  it('round-trips', () => {
    const { publicItems, privateDoc } = splitOrderCost(items);
    expect(mergeOrderCost(publicItems, privateDoc)).toEqual(items);
  });

  it('keeps a legacy order\'s own cost when there is no private record', () => {
    expect(mergeOrderCost(items, undefined)).toEqual(items);
    expect(mergeOrderCost(items, { items: [] })).toEqual(items);
  });

  it('prefers the private cost to a legacy one on the order', () => {
    expect(mergeOrderCost(items, { items: [{ buyPrice: 250 }] })[0].buyPrice).toBe(250);
  });
});
