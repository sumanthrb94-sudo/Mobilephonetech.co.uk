import { describe, it, expect, beforeEach } from 'vitest';
import { FieldValue } from 'firebase-admin/firestore';
import { priceAndValidate, commitOrder, restockOrder } from '../../../api/_orderCore.js';

/**
 * Costs, IMEIs and the unit ledger live in productPrivate, and line costs in
 * orderPrivate, because anyone can read a product and a buyer can read their
 * own order. The order route must still choose the handset, record what it
 * cost and keep stock right, exactly as it did when all of it sat on the
 * public documents — and must move a legacy document across as it goes.
 */

type Doc = Record<string, any>;
let store: Record<string, Record<string, Doc>> = {};

const isDelete = (v: unknown) => v instanceof FieldValue && v.isEqual(FieldValue.delete());

function collection(name: string) {
  store[name] ??= {};
  return {
    doc: (id: string) => ({
      id,
      collectionName: name,
      get: async () => ({
        exists: id in (store[name] ?? {}),
        data: () => (id in (store[name] ?? {}) ? structuredClone(store[name][id]) : undefined),
      }),
    }),
  };
}

async function runTransaction<T>(fn: (tx: any) => Promise<T>): Promise<T> {
  return fn({
    get: async (ref: any) => ref.get(),
    update: (ref: any, patch: Doc) => {
      const next = { ...(store[ref.collectionName]?.[ref.id] ?? {}) };
      for (const [k, v] of Object.entries(patch)) {
        if (isDelete(v)) delete next[k];
        else next[k] = v;
      }
      store[ref.collectionName][ref.id] = next;
    },
    set: (ref: any, value: Doc, opts?: { merge?: boolean }) => {
      store[ref.collectionName] ??= {};
      store[ref.collectionName][ref.id] = opts?.merge ? { ...(store[ref.collectionName][ref.id] ?? {}), ...value } : value;
    },
  });
}

const db = { collection, runTransaction };

const unit = (id: string, buyPrice: number, status = 'available') => ({
  id, imei: `35000000000000${id}`, supplier: 'MHL', buyPrice, status,
});

const PUBLIC = () => ({
  brand: 'Apple', model: 'iPhone 15', price: 400, stock: 2,
  variants: [{ id: 'v128', storage: '128GB', color: 'Black', condition: 'Good', price: 400, originalPrice: 500, stock: 2 }],
});
const PRIVATE = () => ({
  variants: { v128: { buyPrice: 300, supplier: 'MHL', inventoryUnits: [unit('1', 280), unit('2', 320)] } },
});

const basket = (quantity = 1) => ({
  items: [{ productId: 'apple-iphone-15', variantId: 'v128', quantity }],
  shippingOptionId: 'standard',
  shippingAddress: {
    fullName: 'Ram Test', addressLine1: '1 High St', city: 'London',
    postalCode: 'SE1 3TX', phone: '07700900123', email: 'ram@example.com',
  },
});

async function order(quantity = 1) {
  const priced = await priceAndValidate(db, basket(quantity), { uid: 'u1', email: 'ram@example.com' });
  if (!priced.ok) throw new Error(priced.error);
  await commitOrder(db, priced.order);
  return priced.order;
}

const PRIVATE_VARIANT_KEYS = ['buyPrice', 'supplier', 'imei', 'sku', 'notes', 'stockInDate', 'unitHistory', 'inventoryUnits'];
const publicLeaks = (p: Doc) => [
  ...['buyPrice', 'supplier', 'imei', 'sku'].filter(k => k in p),
  ...(p.variants ?? []).flatMap((v: Doc) => PRIVATE_VARIANT_KEYS.filter(k => k in v)),
];

beforeEach(() => {
  store = { products: { 'apple-iphone-15': PUBLIC() }, productPrivate: { 'apple-iphone-15': PRIVATE() } };
});

describe('pricing reads the cost from productPrivate', () => {
  it('prices a line against the private cost', async () => {
    const priced = await priceAndValidate(db, basket(), null);
    expect(priced.ok).toBe(true);
    if (!priced.ok) return;
    expect(priced.order.items[0].buyPrice).toBe(300);
  });

  it('still reads a legacy cost left on the public document', async () => {
    store.productPrivate = {};
    store.products['apple-iphone-15'].variants[0].buyPrice = 275;
    const priced = await priceAndValidate(db, basket(), null);
    expect(priced.ok && priced.order.items[0].buyPrice).toBe(275);
  });
});

describe('commitOrder', () => {
  it('sells a unit from the private ledger and recomputes public stock from it', async () => {
    const placed = await order();

    const priv = store.productPrivate['apple-iphone-15'].variants.v128;
    expect(priv.inventoryUnits.map((u: Doc) => u.status)).toEqual(['sold', 'available']);
    expect(priv.inventoryUnits[0].unitHistory.at(-1)).toMatchObject({ type: 'SOLD', detail: `WEBSITE · ${placed.id}`, amount: 400 });

    const pub = store.products['apple-iphone-15'];
    expect(pub.variants[0].stock).toBe(1);
    expect(pub.stock).toBe(1);
    expect(publicLeaks(pub)).toEqual([]);
  });

  it('keeps the order\'s cost off the order and in orderPrivate', async () => {
    const placed = await order();
    const saved = store.orders[placed.id];
    expect(saved.items[0]).not.toHaveProperty('buyPrice');
    // The handset itself is on the order: staff pack by it, and the buyer may see it.
    expect(saved.items[0]).toMatchObject({ imeis: ['350000000000001'], unitIds: ['1'] });
    expect(store.orderPrivate[placed.id]).toEqual({ items: [{ buyPrice: 280 }], createdAt: placed.createdAt });
    // The copy handed back to the browser carries no cost either.
    expect(placed.items[0]).not.toHaveProperty('buyPrice');
  });

  it('averages the cost of the units actually chosen', async () => {
    const placed = await order(2);
    expect(store.orderPrivate[placed.id].items[0].buyPrice).toBe(300);
    expect(store.products['apple-iphone-15'].stock).toBe(0);
  });

  it('refuses when the ledger has too few available units', async () => {
    store.productPrivate['apple-iphone-15'].variants.v128.inventoryUnits[1].status = 'sold';
    const priced = await priceAndValidate(db, basket(2), null);
    // Public stock still claims 2, so pricing passes; the ledger is the truth.
    expect(priced.ok).toBe(true);
    if (!priced.ok) return;
    await expect(commitOrder(db, priced.order)).rejects.toThrow(/no longer has enough available units/);
  });

  it('moves a legacy product\'s ledger and costs off the public document', async () => {
    store.productPrivate = {};
    const legacy = PUBLIC() as Doc;
    legacy.buyPrice = 290;
    legacy.supplier = 'MHL';
    legacy.variants[0] = { ...legacy.variants[0], ...PRIVATE().variants.v128, notes: 'boxed' };
    store.products['apple-iphone-15'] = legacy;

    const placed = await order();

    const pub = store.products['apple-iphone-15'];
    expect(publicLeaks(pub)).toEqual([]);
    expect(pub.variants[0].stock).toBe(1);
    const priv = store.productPrivate['apple-iphone-15'];
    expect(priv).toMatchObject({ buyPrice: 290, supplier: 'MHL' });
    expect(priv.variants.v128).toMatchObject({ buyPrice: 300, notes: 'boxed' });
    expect(priv.variants.v128.inventoryUnits.map((u: Doc) => u.status)).toEqual(['sold', 'available']);
    expect(store.orderPrivate[placed.id].items[0].buyPrice).toBe(280);
  });

  it('a product with nothing private gets no private document', async () => {
    store.productPrivate = {};
    store.products['apple-iphone-15'] = PUBLIC();
    const placed = await order();
    expect(store.productPrivate['apple-iphone-15']).toBeUndefined();
    expect(store.products['apple-iphone-15'].variants[0].stock).toBe(1);
    // Untracked stock has no cost to record; the line says so rather than guessing.
    expect(store.orderPrivate[placed.id]).toEqual({ items: [{ buyPrice: 0 }], createdAt: placed.createdAt });
  });
});

describe('restockOrder', () => {
  it('puts the sold unit back in the private ledger and the stock back on sale', async () => {
    const placed = await order();
    await restockOrder(db, placed.id, { status: 'refunded' });

    const priv = store.productPrivate['apple-iphone-15'].variants.v128;
    expect(priv.inventoryUnits.map((u: Doc) => u.status)).toEqual(['available', 'available']);
    expect(priv.inventoryUnits[0].unitHistory.at(-1)).toMatchObject({ type: 'RETURNED' });
    const pub = store.products['apple-iphone-15'];
    expect(pub.variants[0].stock).toBe(2);
    expect(pub.stock).toBe(2);
    expect(publicLeaks(pub)).toEqual([]);
    expect(store.orders[placed.id].status).toBe('refunded');
  });
});
