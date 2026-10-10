import { describe, it, expect } from 'vitest';
import { storageLabel } from '../../utils/storageLabel';

const v = (storage: string, stock = 1) => ({ id: storage + stock, storage, stock, price: 1, originalPrice: 1 }) as never;

describe('storageLabel', () => {
  it('uses the product storage when there are no configurations', () => {
    expect(storageLabel({ storage: '128GB', variants: [] })).toBe('128GB');
  });
  it('shows one size or the range across configurations in stock', () => {
    expect(storageLabel({ storage: '', variants: [v('64GB'), v('64GB')] })).toBe('64GB');
    expect(storageLabel({ storage: '', variants: [v('256GB'), v('64GB'), v('1TB', 0)] })).toBe('64GB – 256GB');
    expect(storageLabel({ storage: '', variants: [v('128GB'), v('1 TB')] })).toBe('128GB – 1TB');
  });
  it('falls back to all configurations when none are in stock', () => {
    expect(storageLabel({ storage: '', variants: [v('32GB', 0), v('128GB', 0)] })).toBe('32GB – 128GB');
  });
});
