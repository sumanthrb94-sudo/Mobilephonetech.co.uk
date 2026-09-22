import { describe, it, expect } from 'vitest';
import { siblingProducts, variantChoices, isChoosable, currentValue } from '../../lib/productSiblings';
import type { Product } from '../../types';

/**
 * The other listings of the same phone.
 *
 * The property this exists to guarantee: every option a shopper can pick
 * corresponds to a product that is really for sale, at that product's own
 * price. The page used to invent sizes from a ladder and hand the chosen one
 * the base product's price, so a 256GB could be bought for the price of a
 * 64GB that was never a 256GB. Nothing below may reintroduce that.
 */

const product = (over: Partial<Product> & { id: string }): Product => ({
  brand: 'Apple', model: 'iPhone 8',
  price: 55, originalPrice: 99, stock: 2,
  grade: 'Excellent', category: 'Phones',
  imageUrl: '', galleryImages: [], isCertified: true,
  batteryHealth: 90, warrantyMonths: 12, returnDays: 30,
  specs: {} as Product['specs'],
  ...over,
} as Product);

const V = (o: { value: string }) => o.value;

describe('siblingProducts', () => {
  const p64 = product({ id: 'iphone-8-64', storage: '64 GB' });
  const p128 = product({ id: 'iphone-8-128', storage: '128 GB', price: 75 });
  const other = product({ id: 'iphone-11', model: 'iPhone 11' });

  it('groups listings of the same brand and model', () => {
    const out = siblingProducts([p64, p128, other], p64).map(p => p.id);
    expect(out.sort()).toEqual(['iphone-8-128', 'iphone-8-64']);
  });

  it('ignores spacing and case when matching a model', () => {
    const messy = product({ id: 'messy', model: 'iphone  8', storage: '256 GB' });
    expect(siblingProducts([p64, messy], p64).map(p => p.id)).toContain('messy');
  });

  it('does not group different models that share a prefix', () => {
    const plus = product({ id: 'iphone-8-plus', model: 'iPhone 8 Plus' });
    expect(siblingProducts([p64, plus], p64).map(p => p.id)).not.toContain('iphone-8-plus');
  });

  /**
   * A size we have sold out of is not a choice. Offering it only moves the
   * disappointment from the product page to the basket.
   */
  it('leaves out a sold-out sibling', () => {
    const gone = product({ id: 'iphone-8-256', storage: '256 GB', stock: 0 });
    expect(siblingProducts([p64, gone], p64).map(p => p.id)).not.toContain('iphone-8-256');
  });

  it('keeps the viewed product even when it is itself sold out', () => {
    const soldOut = product({ id: 'iphone-8-64', storage: '64 GB', stock: 0 });
    expect(siblingProducts([soldOut], soldOut).map(p => p.id)).toEqual(['iphone-8-64']);
  });

  it('includes the viewed product when the catalogue has not loaded it yet', () => {
    expect(siblingProducts([], p64).map(p => p.id)).toEqual(['iphone-8-64']);
  });
});

describe('variantChoices', () => {
  const p64 = product({ id: 'iphone-8-64', storage: '64 GB', price: 55, colorOptions: ['Gold'] });
  const p128 = product({ id: 'iphone-8-128', storage: '128 GB', price: 75, colorOptions: ['Black'] });
  const p256 = product({ id: 'iphone-8-256', storage: '256 GB', price: 95, colorOptions: ['Red'] });

  it('offers every stocked size of the same phone', () => {
    const { storage } = variantChoices([p64, p128, p256], p64);
    expect(storage.map(V)).toEqual(['64 GB', '128 GB', '256 GB']);
  });

  /**
   * The bug this replaces, stated as a test: each option carries the price
   * of the product it opens, never the price of the one being viewed.
   */
  it('gives each size its own price and its own product', () => {
    const { storage } = variantChoices([p64, p128, p256], p64);

    expect(storage).toEqual([
      { value: '64 GB', productId: 'iphone-8-64', price: 55, stock: 2, current: true },
      { value: '128 GB', productId: 'iphone-8-128', price: 75, stock: 2, current: false },
      { value: '256 GB', productId: 'iphone-8-256', price: 95, stock: 2, current: false },
    ]);
  });

  it('marks only the viewed product as current', () => {
    const { storage } = variantChoices([p64, p128, p256], p128);
    expect(storage.filter(o => o.current).map(V)).toEqual(['128 GB']);
  });

  /**
   * The whole point: a size nobody stocks is not offered. The old ladder
   * turned a 64GB listing into 64/128/256 whether or not the others existed.
   */
  it('offers nothing but the one size when there are no siblings', () => {
    const { storage } = variantChoices([p64], p64);
    expect(storage.map(V)).toEqual(['64 GB']);
    expect(isChoosable(storage)).toBe(false);
  });

  it('sorts sizes by capacity, not alphabetically', () => {
    const big = product({ id: 'big', storage: '1 TB', price: 200 });
    const small = product({ id: 'small', storage: '64 GB' });
    const mid = product({ id: 'mid', storage: '512 GB', price: 150 });

    expect(variantChoices([big, small, mid], small).storage.map(V))
      .toEqual(['64 GB', '512 GB', '1 TB']);
  });

  it('collects the colours the listings actually declare', () => {
    const { colour } = variantChoices([p64, p128, p256], p64);
    expect(colour.map(V).sort()).toEqual(['Black', 'Gold', 'Red']);
    expect(colour.find(o => o.value === 'Black')?.productId).toBe('iphone-8-128');
  });

  it('takes every value from a listing that declares several', () => {
    const multi = product({ id: 'multi', storage: '64 GB', colorOptions: ['Gold', 'Silver', 'Red'] });
    const { colour } = variantChoices([multi], multi);

    expect(colour.map(V).sort()).toEqual(['Gold', 'Red', 'Silver']);
    // All of them are this product, so choosing one never navigates away.
    expect(colour.every(o => o.current)).toBe(true);
  });

  it('offers the grades that exist, not all four', () => {
    const excellent = product({ id: 'exc', grade: 'Excellent' });
    const good = product({ id: 'good', grade: 'Good', price: 45 });

    expect(variantChoices([excellent, good], excellent).condition.map(V).sort())
      .toEqual(['Excellent', 'Good']);
  });

  it('sends a shared value to the cheapest listing offering it', () => {
    const cheap = product({ id: 'cheap', storage: '128 GB', price: 70, colorOptions: ['Black'] });
    const dear = product({ id: 'dear', storage: '128 GB', price: 90, colorOptions: ['Black'] });

    const { storage } = variantChoices([p64, dear, cheap], p64);
    expect(storage.find(o => o.value === '128 GB')?.productId).toBe('cheap');
  });

  /**
   * Choosing what is already selected must never navigate: it would reload
   * the page for no reason, and could land on a different listing that
   * happens to share the value.
   */
  it('keeps the viewed product for its own value even when a cheaper one shares it', () => {
    const cheaper = product({ id: 'cheaper', storage: '64 GB', price: 40 });
    const { storage } = variantChoices([cheaper, p64], p64);

    const own = storage.find(o => o.value === '64 GB');
    expect(own?.productId).toBe('iphone-8-64');
    expect(own?.current).toBe(true);
  });

  it('ignores blank and whitespace-only values', () => {
    const blank = product({ id: 'blank', storage: '  ', colorOptions: ['', '  ', 'Gold'] });
    const out = variantChoices([blank], blank);

    expect(out.storage).toEqual([]);
    expect(out.colour.map(V)).toEqual(['Gold']);
  });

  it('falls back to the spec sheet when a listing has no storage field', () => {
    const fromSpecs = product({
      id: 'spec', storage: undefined,
      specs: { storage: '256 GB' } as Product['specs'],
    });
    expect(variantChoices([fromSpecs], fromSpecs).storage.map(V)).toEqual(['256 GB']);
  });
});

const opt = (value: string, current: boolean, productId = 'x') =>
  ({ value, productId, price: 1, stock: 1, current });

describe('isChoosable', () => {
  it('is false for the viewed product\'s own lone value', () => {
    expect(isChoosable([])).toBe(false);
    expect(isChoosable([opt('64 GB', true)])).toBe(false);
  });

  it('is true once there is something to choose between', () => {
    expect(isChoosable([opt('64 GB', true), opt('128 GB', false)])).toBe(true);
  });

  /**
   * The only other colour of this phone we stock is still a choice, even
   * though there is one of it. Hiding it is how a shopper fails to find it.
   */
  it('is true for a lone option belonging to a different listing', () => {
    expect(isChoosable([opt('Black', false, 'sibling')])).toBe(true);
  });
});

describe('currentValue', () => {
  it('is the value describing the viewed product', () => {
    expect(currentValue([opt('64 GB', true), opt('128 GB', false)])).toBe('64 GB');
  });

  /**
   * Labelling this listing with a colour that belongs to a different one
   * states something untrue about the thing being bought.
   */
  it('is null when no option describes the viewed product', () => {
    expect(currentValue([opt('Black', false, 'sibling')])).toBeNull();
    expect(currentValue([])).toBeNull();
  });
});
