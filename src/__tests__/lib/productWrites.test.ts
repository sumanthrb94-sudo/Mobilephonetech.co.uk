import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * The console's product reads and writes, with Firestore faked at the SDK
 * boundary. What matters: a save never puts a cost on the public document,
 * clears any a legacy document still holds, and the editor reads back exactly
 * what it saved.
 */

type Doc = Record<string, any>;
let store: Record<string, Doc> = {};
const DELETE = { __delete: true };

const commits: Array<Array<{ op: string; path: string; data: Doc }>> = [];

vi.mock('firebase/firestore', async (orig) => ({
  ...(await orig<typeof import('firebase/firestore')>()),
  doc: (_db: unknown, col: string, id: string) => ({ path: `${col}/${id}` }),
  getDoc: async (ref: { path: string }) => ({
    id: ref.path.split('/')[1],
    exists: () => ref.path in store,
    data: () => structuredClone(store[ref.path]),
  }),
  deleteField: () => DELETE,
  serverTimestamp: () => 'now',
  writeBatch: () => {
    const ops: Array<{ op: string; path: string; data: Doc }> = [];
    return {
      set: (ref: { path: string }, data: Doc) => { ops.push({ op: 'set', path: ref.path, data }); },
      update: (ref: { path: string }, data: Doc) => { ops.push({ op: 'update', path: ref.path, data }); },
      commit: async () => {
        commits.push(ops);
        for (const { op, path, data } of ops) {
          const next = op === 'set' ? {} : { ...(store[path] ?? {}) };
          for (const [k, v] of Object.entries(data)) {
            if (v === DELETE) delete next[k];
            else next[k] = v;
          }
          store[path] = next;
        }
      },
    };
  },
}));
vi.mock('../../lib/firebase', () => ({
  db: {}, storage: {}, auth: { currentUser: null },
  COL: { products: 'products', productPrivate: 'productPrivate', orders: 'orders', orderPrivate: 'orderPrivate' },
  withAdminRetry: <T,>(fn: () => Promise<T>) => fn(),
}));

const { createProduct, updateProduct, getProduct, productToDraft, emptyDraft } = await import('../../lib/adminApi');

const draft = () => ({
  ...emptyDraft(),
  id: 'apple-iphone-15', brand: 'Apple', model: 'iPhone 15', price: 400, originalPrice: 500,
  variantMode: true,
  variants: [{
    id: 'v128', storage: '128GB', color: 'Black', condition: 'Excellent' as const, price: 400, originalPrice: 500, stock: 0,
    batteryHealth: 90, buyPrice: 300, supplier: 'MHL', notes: 'boxed',
    inventoryUnits: [{ id: 'u1', imei: '356789012345678', buyPrice: 300, status: 'available' as const }],
  }],
});

const leaks = (p: Doc) => [
  ...['buyPrice', 'supplier', 'imei', 'sku'].filter(k => k in p),
  ...(p.variants ?? []).flatMap((v: Doc) => ['buyPrice', 'supplier', 'imei', 'sku', 'notes', 'stockInDate', 'unitHistory', 'inventoryUnits'].filter(k => k in v)),
];

beforeEach(() => { store = {}; commits.length = 0; });

describe('product writes', () => {
  it('creates the public and private halves in one batch', async () => {
    await createProduct(draft());
    expect(commits).toHaveLength(1);
    expect(commits[0].map(c => c.path)).toEqual(['products/apple-iphone-15', 'productPrivate/apple-iphone-15']);
    expect(leaks(store['products/apple-iphone-15'])).toEqual([]);
    expect(store['products/apple-iphone-15'].variants[0].stock).toBe(1);
    expect(store['productPrivate/apple-iphone-15'].variants.v128).toMatchObject({ buyPrice: 300, notes: 'boxed' });
  });

  it('reads back exactly what the editor saved', async () => {
    const saved = await createProduct(draft());
    const loaded = await getProduct('apple-iphone-15');
    expect(loaded?.variants?.[0]).toMatchObject({ buyPrice: 300, supplier: 'MHL', notes: 'boxed' });
    expect(loaded?.variants?.[0].inventoryUnits?.[0]).toMatchObject({ imei: '356789012345678', buyPrice: 300 });
    expect(saved.variants?.[0].inventoryUnits).toHaveLength(1);
  });

  it('moves a legacy product\'s costs off the public document on its next save', async () => {
    store['products/apple-iphone-15'] = {
      model: 'iPhone 15', brand: 'Apple', price: 400, buyPrice: 250, supplier: 'OLD', imei: '350000000000001', sku: 'IP15',
      variantMode: true,
      variants: [{ id: 'v128', price: 400, originalPrice: 500, stock: 1, buyPrice: 250, inventoryUnits: [{ id: 'u0', status: 'available' }] }],
    };
    // The editor opens the legacy document as-is, costs included.
    const opened = await getProduct('apple-iphone-15');
    expect(opened).toMatchObject({ buyPrice: 250, supplier: 'OLD', imei: '350000000000001', sku: 'IP15' });
    expect(opened?.variants?.[0].buyPrice).toBe(250);

    await updateProduct(productToDraft(opened!));
    expect(leaks(store['products/apple-iphone-15'])).toEqual([]);
    const priv = store['productPrivate/apple-iphone-15'];
    expect(priv).toMatchObject({ buyPrice: 250, supplier: 'OLD', imei: '350000000000001', sku: 'IP15' });
    expect(priv.variants.v128.inventoryUnits).toEqual([expect.objectContaining({ id: 'u0', status: 'available' })]);
    // And nothing was lost on the way.
    expect(await getProduct('apple-iphone-15')).toMatchObject({ buyPrice: 250, supplier: 'OLD' });
  });
});
