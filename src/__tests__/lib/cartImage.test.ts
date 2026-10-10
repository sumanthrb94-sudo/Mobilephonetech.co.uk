import { describe, it, expect } from 'vitest';
import { cartLineImage } from '../../lib/cartImage';
import { MOCK_PHONES } from '../../test/fixtures/mockPhones';
import type { Product } from '../../types';

const photo = (n: string) => `https://res.cloudinary.com/x/image/upload/v1/${n}.png`;
const product: Product = {
  ...MOCK_PHONES[0], id: 'samsung-galaxy-s24', imageUrl: photo('s24-main'), galleryImages: [photo('s24-main')],
  variants: [
    { id: 'v-black', color: 'Onyx Black', storage: '128GB', condition: 'Excellent', price: 275, originalPrice: 799, stock: 1, galleryImages: [photo('s24-black-both'), photo('s24-black-front')] },
    { id: 'v-black-256', color: 'Onyx Black', storage: '256GB', condition: 'Excellent', price: 300, originalPrice: 859, stock: 1 },
    { id: 'v-violet', color: 'Cobalt Violet', storage: '128GB', condition: 'Excellent', price: 275, originalPrice: 799, stock: 1, imageUrl: photo('s24-violet') },
  ],
} as Product;

describe('cartLineImage', () => {
  it('replaces a stale saved placeholder with the configuration\'s photo now', () => {
    expect(cartLineImage({ id: 'v-black', productId: 'samsung-galaxy-s24', variantId: 'v-black', imageUrl: '/assets/old.png' }, [product])).toBe(photo('s24-black-both'));
  });
  it('uses another configuration in the same colour when the exact one has no photo', () => {
    expect(cartLineImage({ id: 'v-black-256', productId: 'samsung-galaxy-s24', variantId: 'v-black-256' }, [product])).toBe(photo('s24-black-both'));
  });
  it('falls back to the product photo, then to what was saved', () => {
    expect(cartLineImage({ id: 'samsung-galaxy-s24', imageUrl: '' }, [product])).toBe(photo('s24-main'));
    expect(cartLineImage({ id: 'gone', imageUrl: photo('saved') }, [product])).toBe(photo('saved'));
  });
  it('finds the product from a variant id alone', () => {
    expect(cartLineImage({ id: 'v-violet' }, [product])).toBe(photo('s24-violet'));
  });
});

describe('cartLineImage when the configuration is gone', () => {
  it('keeps the saved photo of the chosen colour rather than the shared product photo', () => {
    expect(cartLineImage({ id: 'v-gone', productId: 'samsung-galaxy-s24', variantId: 'v-gone', color: 'Marble Grey', imageUrl: photo('s24-grey') }, [product]))
      .toBe(photo('s24-grey'));
  });
});
