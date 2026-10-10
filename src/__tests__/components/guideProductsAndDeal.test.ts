import { describe, it, expect } from 'vitest';
import { guideProducts } from '../../components/content/GuideProducts';
import { pickDeal } from '../../components/NewsletterSignup';
import { MOCK_PHONES } from '../../test/fixtures/mockPhones';
import type { Product } from '../../types';

const photo = (n: string) => `https://res.cloudinary.com/x/image/upload/v1/${n}.png`;
const make = (o: Partial<Product>): Product => ({ ...MOCK_PHONES[0], stock: 3, ...o } as Product);

describe('guideProducts', () => {
  const block = { type: 'products' as const, title: 'Pixels', brand: 'Google', include: ['Pixel'], exclude: ['Watch'], href: '/products?brand=Google' };

  it('shows in-stock matches only, one per model, photographed first', () => {
    const list = [
      make({ id: 'a', brand: 'Google', model: 'Pixel 9a', price: 270, imageUrl: '' }),
      make({ id: 'b', brand: 'Google', model: 'Pixel 8 Pro', price: 240, imageUrl: photo('p8') }),
      make({ id: 'b2', brand: 'Google', model: 'Pixel 8 Pro', price: 300, imageUrl: photo('p8b') }),
      make({ id: 'c', brand: 'Google', model: 'Pixel Watch 2', price: 150, imageUrl: photo('w') }),
      make({ id: 'd', brand: 'Google', model: 'Pixel 7', price: 150, imageUrl: photo('p7'), stock: 0 }),
      make({ id: 'e', brand: 'Apple', model: 'iPhone 15', price: 400, imageUrl: photo('i') }),
    ];
    expect(guideProducts(list, block).map(p => p.id)).toEqual(['b', 'a']);
  });

  it('caps the rail at four', () => {
    const list = Array.from({ length: 9 }, (_, i) => make({ id: `p${i}`, brand: 'Google', model: `Pixel ${i}`, price: 100 + i }));
    expect(guideProducts(list, block)).toHaveLength(4);
  });
});

describe('pickDeal', () => {
  it('picks the biggest saving among in-stock products with a real photo', () => {
    const list = [
      make({ id: 'small', price: 900, originalPrice: 1000, imageUrl: photo('a') }),
      make({ id: 'big', price: 500, originalPrice: 1000, imageUrl: photo('b') }),
      make({ id: 'no-photo', price: 100, originalPrice: 1000, imageUrl: '' }),
      make({ id: 'sold-out', price: 100, originalPrice: 1000, imageUrl: photo('c'), stock: 0 }),
    ];
    expect(pickDeal(list)?.id).toBe('big');
  });

  it('shows nothing rather than an invented saving', () => {
    expect(pickDeal([make({ price: 500, originalPrice: 500, imageUrl: photo('a') })])).toBeNull();
    expect(pickDeal([])).toBeNull();
  });
});
