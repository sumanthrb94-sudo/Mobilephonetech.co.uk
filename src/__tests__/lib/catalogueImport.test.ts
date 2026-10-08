import { describe, it, expect } from 'vitest';
import { APPLE_CATALOGUE } from '../../data/catalogue/apple';
import { modelToDocument, modelToDraft, variantsFor } from '../../lib/catalogueImport';
import { validateDraft } from '../../lib/adminApi';
import { docToProduct, forShop, isListed } from '../../lib/productMapper';

describe('Apple reference catalogue', () => {
  it('has one entry per product id', () => {
    const ids = APPLE_CATALOGUE.map(m => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('uses URL-safe ids', () => {
    for (const m of APPLE_CATALOGUE) expect(m.id).toMatch(/^[a-z0-9-]+$/);
  });

  it('covers 2020 onwards only', () => {
    for (const m of APPLE_CATALOGUE) expect(Number(m.released.slice(0, 4))).toBeGreaterThanOrEqual(2020);
  });

  it('gives every model at least one finish, and phones and tablets their storage', () => {
    for (const m of APPLE_CATALOGUE) {
      expect(m.colours.length, m.id).toBeGreaterThan(0);
      if (m.family !== 'Apple Watch') expect(m.storage.length, m.id).toBeGreaterThan(0);
    }
  });

  it('includes the iPhone, iPad and Apple Watch ranges', () => {
    const count = (family: string) => APPLE_CATALOGUE.filter(m => m.family === family).length;
    expect(count('iPhone')).toBeGreaterThanOrEqual(30);
    expect(count('iPad')).toBeGreaterThanOrEqual(24);
    expect(count('Apple Watch')).toBeGreaterThanOrEqual(30);
  });

  it('never carries a price or an image', () => {
    for (const m of APPLE_CATALOGUE) {
      const doc = modelToDocument(m);
      expect(doc.price).toBe(0);
      expect(doc.imageUrl).toBeNull();
    }
  });
});

describe('catalogue import', () => {
  const iphone17ProMax = APPLE_CATALOGUE.find(m => m.id === 'apple-iphone-17-pro-max')!;
  const ipadAir = APPLE_CATALOGUE.find(m => m.id === 'apple-ipad-air-11-m2')!;
  const watch = APPLE_CATALOGUE.find(m => m.id === 'apple-watch-series-10-titanium-46mm')!;

  it('creates one configuration per storage and colour', () => {
    // 4 capacities × 3 finishes
    expect(variantsFor(iphone17ProMax)).toHaveLength(12);
  });

  it('multiplies iPad configurations by Wi-Fi and Cellular', () => {
    // 4 capacities × 4 finishes × 2 radios
    expect(variantsFor(ipadAir)).toHaveLength(32);
  });

  it('sells stainless steel and titanium watches as Cellular only', () => {
    expect(new Set(variantsFor(watch).map(v => v.connectivity))).toEqual(new Set(['GPS + Cellular']));
  });

  it('gives every configuration a unique id within its model', () => {
    for (const m of APPLE_CATALOGUE) {
      const ids = variantsFor(m).map(v => v.id);
      expect(new Set(ids).size, m.id).toBe(ids.length);
    }
  });

  it('writes drafts that are hidden, matrix-managed and carry the specs', () => {
    const doc = modelToDocument(iphone17ProMax);
    expect(doc.listed).toBe(false);
    expect(doc.variantMode).toBe(true);
    expect((doc.specs as Record<string, string>).chip).toBe('A19 Pro');
    expect(doc.category).toBe('Phones');
  });

  it('produces drafts the editor can save straight away', () => {
    for (const m of APPLE_CATALOGUE) expect(validateDraft(modelToDraft(m)), m.id).toEqual({});
  });

  it('produces drafts the editor refuses to list until priced', () => {
    expect(validateDraft({ ...modelToDraft(iphone17ProMax), listed: true })).toHaveProperty('listed');
  });
});

describe('what shoppers see of an imported model', () => {
  const model = APPLE_CATALOGUE.find(m => m.id === 'apple-iphone-16')!;

  it('hides the draft entirely', () => {
    expect(isListed(modelToDocument(model))).toBe(false);
  });

  it('shows only the configurations staff have priced once listed', () => {
    const doc = modelToDocument(model) as Record<string, unknown> & { variants: { price: number }[] };
    doc.variants[0].price = 499;
    const product = forShop(docToProduct(model.id, { ...doc, listed: true }));
    expect(product.variants).toHaveLength(1);
    expect(product.variants![0].price).toBe(499);
  });
});
