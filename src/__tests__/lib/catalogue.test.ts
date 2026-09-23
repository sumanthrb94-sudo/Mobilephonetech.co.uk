import { describe, it, expect } from 'vitest';
import {
  modelKey, catalogueModelId, findCatalogueModel, pickable, brandsOf, modelsFor,
  modelNameProblem, planImport, type CatalogueModel,
} from '../../lib/catalogue';

/**
 * The managed catalogue of models.
 *
 * What is pinned here is the property the owner asked for: staff choose a
 * model, they never type one, and a model name that would quietly break the
 * shop front cannot get into the list in the first place. The product page
 * groups a listing with its other sizes and colours by brand and model, so
 * "iPhone 8 128GB" is a different phone from "iPhone 8" — an orphan whose
 * page offers no other sizes, and nothing on screen says why.
 */

const entry = (brand: string, model: string, over: Partial<CatalogueModel> = {}): CatalogueModel =>
  ({ id: catalogueModelId(brand, model), brand, model, ...over });

describe('modelKey', () => {
  /**
   * Must agree with the grouping key in productSiblings.ts. If the catalogue
   * merged two spellings the shop front keeps apart, or split two it merges,
   * the list staff pick from would disagree with the page shoppers see.
   */
  it('ignores case and spacing, as the product page does', () => {
    expect(modelKey('Apple', 'iPhone 8')).toBe(modelKey('apple', 'iphone  8'));
    expect(modelKey('Apple', 'iPhone 8')).not.toBe(modelKey('Apple', 'iPhone 8 Plus'));
  });
});

describe('catalogueModelId', () => {
  it('is the same for the same model, so adding it twice lands on one document', () => {
    expect(catalogueModelId('Apple', 'iPhone 8')).toBe(catalogueModelId('apple', 'iPhone  8'));
  });

  /**
   * Brand and model are kept apart in the id. Joined with a single hyphen,
   * "Apple" + "iPhone 8" and "Apple iPhone" + "8" would collide, and the
   * second model added would silently overwrite the first.
   */
  it('keeps brand and model apart', () => {
    expect(catalogueModelId('Apple', 'iPhone 8')).not.toBe(catalogueModelId('Apple iPhone', '8'));
  });

  /**
   * Pinned to literals because e2e/emulator-seed.mjs repeats this derivation
   * in plain Node (catalogueIdFor), and the two must agree. If they drifted,
   * every seeded listing would point at an entry the editor cannot find, and
   * the staff suites would fail in a way that looks like the catalogue being
   * broken rather than the harness. The same three literals are checked
   * against the harness's version.
   */
  it('produces the ids the test harness also produces', () => {
    expect(catalogueModelId('Apple', 'iPhone 8')).toBe('apple__iphone-8');
    expect(catalogueModelId('Samsung', 'Galaxy Z Fold5 (5G)')).toBe('samsung__galaxy-z-fold5-5g');
    expect(catalogueModelId('Google', 'Pixel 8 Pro')).toBe('google__pixel-8-pro');
  });

  it('is safe as a Firestore document id', () => {
    expect(catalogueModelId('Samsung', 'Galaxy Z Fold5 (5G)')).toMatch(/^[a-z0-9_-]+$/);
  });
});

describe('what staff can pick', () => {
  const models = [
    entry('Apple', 'iPhone 9'),
    entry('Apple', 'iPhone 10'),
    entry('Apple', 'iPhone 8'),
    entry('Apple', 'iPhone 7', { retiredAt: '2026-01-01T00:00:00.000Z' }),
    entry('Samsung', 'Galaxy S23'),
    entry('Nokia', '3310', { retiredAt: '2026-01-01T00:00:00.000Z' }),
  ];

  /**
   * A retired model stays in the catalogue — listings already point at it —
   * but a new listing cannot choose it. A brand with nothing left to pick is
   * not a choice either: offering it leads to an empty model list.
   */
  it('offers live models only, and no brand that has none left', () => {
    expect(pickable(models).map(m => m.model)).not.toContain('iPhone 7');
    expect(brandsOf(models)).toEqual(['Apple', 'Samsung']);
  });

  it('lists a brand\'s models in the order people count, not alphabetically', () => {
    // Alphabetical order puts iPhone 10 before iPhone 8.
    expect(modelsFor(models, 'apple').map(m => m.model)).toEqual(['iPhone 8', 'iPhone 9', 'iPhone 10']);
  });

  it('finds an entry however the caller spelt it', () => {
    expect(findCatalogueModel(models, 'APPLE', 'iphone  8')?.model).toBe('iPhone 8');
    expect(findCatalogueModel(models, 'Apple', 'iPhone 8 Plus')).toBeUndefined();
  });
});

describe('modelNameProblem', () => {
  /**
   * The one mistake that breaks grouping silently. A manager adding
   * "iPhone 8 128GB" would create a phone no other iPhone 8 listing is ever
   * grouped with, so it is refused, and the message says which field the
   * storage belongs in rather than only saying no.
   */
  it('refuses a storage size in the model name and says where it belongs', () => {
    for (const m of ['iPhone 8 128GB', 'iPhone 8 128 GB', 'Pixel 8 Pro 1TB', 'Galaxy S23 256gb']) {
      expect(modelNameProblem(m)).toMatch(/Storage field/);
    }
  });

  it('refuses a colour in the model name and says where it belongs', () => {
    expect(modelNameProblem('iPhone 8 Gold')).toMatch(/Colour options/);
    expect(modelNameProblem('Pixel 8 Obsidian')).toMatch(/Colour options/);
  });

  /**
   * The ones that must not be refused. "5G" is part of many real Samsung
   * model names and is not a capacity; "Redmi" contains "red" and is not a
   * colour. A guard that refused real phones would be worked around, and a
   * guard people work around protects nothing.
   */
  it('accepts real model names that only look suspicious', () => {
    for (const m of ['Galaxy A54 5G', 'Redmi Note 13', 'iPhone 15 Pro Max', 'Galaxy Z Fold5', 'Pixel 8 Pro', 'iPhone SE']) {
      expect(modelNameProblem(m)).toBeNull();
    }
  });

  it('requires something', () => {
    expect(modelNameProblem('   ')).toBe('Required.');
  });
});

describe('planImport', () => {
  /**
   * The catalogue starts empty and the shop does not. Every model already on
   * a listing has to become an entry, or on the day the rules go live staff
   * cannot create a listing for a phone the shop has sold for months.
   */
  it('adds each model the listings use, once', () => {
    const plan = planImport([
      { brand: 'Apple', model: 'iPhone 8' },
      { brand: 'Apple', model: 'iPhone 8' },
      { brand: 'Samsung', model: 'Galaxy S23' },
    ], []);

    expect(plan.toAdd.map(e => `${e.brand} ${e.model}`)).toEqual(['Apple iPhone 8', 'Samsung Galaxy S23']);
    expect(plan.toAdd.find(e => e.model === 'iPhone 8')?.listings).toBe(2);
  });

  /**
   * One model spelt two ways across listings. The commonest spelling wins,
   * and the others are reported rather than silently corrected, because those
   * listings will be re-spelt the next time someone saves them and the
   * manager should know that before it happens.
   */
  it('takes the commonest spelling and reports the rest', () => {
    const plan = planImport([
      { brand: 'Apple', model: 'iPhone 8' },
      { brand: 'Apple', model: 'iPhone 8' },
      { brand: 'apple', model: 'iphone  8' },
    ], []);

    expect(plan.toAdd).toHaveLength(1);
    expect(plan.toAdd[0].model).toBe('iPhone 8');
    expect(plan.spellings).toEqual([{ chosen: 'Apple iPhone 8', others: ['apple iphone  8'] }]);
  });

  /**
   * Importing "iPhone 8 128GB" would put the orphan the catalogue exists to
   * prevent straight into it. Those listings are reported for a person to
   * fix instead.
   */
  it('refuses to import a model name carrying storage or colour', () => {
    const plan = planImport([{ brand: 'Apple', model: 'iPhone 8 128GB' }], []);
    expect(plan.toAdd).toEqual([]);
    expect(plan.refused).toHaveLength(1);
    expect(plan.refused[0].problem).toMatch(/Storage field/);
  });

  it('is a no-op when everything is already there, so running it twice is safe', () => {
    const existing = [entry('Apple', 'iPhone 8')];
    const plan = planImport([{ brand: 'apple', model: 'iPhone 8' }], existing);
    expect(plan.toAdd).toEqual([]);
    expect(plan.alreadyPresent).toBe(1);
  });

  it('skips listings with no brand or model rather than inventing an entry', () => {
    const plan = planImport([{ brand: '', model: 'iPhone 8' }, { brand: 'Apple', model: '  ' }], []);
    expect(plan.toAdd).toEqual([]);
  });
});
