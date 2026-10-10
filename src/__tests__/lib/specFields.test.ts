import { describe, it, expect } from 'vitest';
import { cleanSpecs, SPEC_GROUPS, SPEC_MAX_LENGTH } from '../../lib/specFields';
import { draftToRow, emptyDraft, productToDraft, type ProductDraft } from '../../lib/adminApi';
import { MOCK_PHONES } from '../../test/fixtures/mockPhones';
import type { ProductSpecs } from '../../types';

describe('cleanSpecs', () => {
  it('trims values and drops empty ones so the page falls back to its default', () => {
    expect(cleanSpecs({ chip: '  A15 Bionic ', ram: '   ', battery: '' } as ProductSpecs))
      .toEqual({ chip: 'A15 Bionic' });
  });

  it('caps each value at the maximum length', () => {
    const out = cleanSpecs({ display: 'x'.repeat(SPEC_MAX_LENGTH + 50) } as ProductSpecs);
    expect(out.display).toHaveLength(SPEC_MAX_LENGTH);
  });

  it('keeps fields the editor does not show and ignores non-strings', () => {
    const out = cleanSpecs({ customNote: 'kept', weird: 5 } as unknown as ProductSpecs);
    expect(out).toEqual({ customNote: 'kept' });
  });

  it('handles missing specs', () => {
    expect(cleanSpecs(undefined)).toEqual({});
    expect(cleanSpecs(null)).toEqual({});
  });
});

describe('SPEC_GROUPS', () => {
  it('lists every field once', () => {
    const keys = SPEC_GROUPS.flatMap(g => g.items.map(i => i.key));
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe('specs in the product draft', () => {
  const base = (): ProductDraft => ({
    ...emptyDraft(), id: 'apple-iphone-13', brand: 'Apple', model: 'iPhone 13', price: 300, originalPrice: 500,
  });

  it('stores edited specs cleaned', () => {
    const row = draftToRow({ ...base(), specs: { chip: ' A15 Bionic ', ram: '' } as ProductSpecs });
    expect(row.specs).toEqual({ chip: 'A15 Bionic' });
  });

  it('round-trips existing specs through the editor', () => {
    const product = MOCK_PHONES.find(p => Object.keys(p.specs ?? {}).length > 0)!;
    const row = draftToRow(productToDraft(product));
    expect(row.specs).toEqual(cleanSpecs(product.specs));
  });
});
