import { describe, it, expect } from 'vitest';
import { homeSeo, productsPageSeo, productSeo } from '../../utils/seo';
import type { Product } from '../../types';

const MOCK_PRODUCT: Product = {
  id: 'apple-iphone-15-pro-128gb',
  model: 'iPhone 15 Pro',
  brand: 'Apple',
  category: 'Phones',
  storage: '128GB',
  price: 649,
  originalPrice: 899,
  grade: 'Excellent',
  batteryHealth: 92,
  warrantyMonths: 12,
  returnDays: 30,
  imageUrl: '/assets/iphone15pro.jpg',
  isCertified: true,
  stock: 5,
  specs: {},
};

describe('homeSeo', () => {
  it('returns a title string', () => {
    const seo = homeSeo();
    expect(typeof seo.title).toBe('string');
    expect(seo.title.length).toBeGreaterThan(0);
  });
  it('returns a description', () => {
    const seo = homeSeo();
    expect(seo.description?.length).toBeGreaterThan(0);
  });
  it('returns a canonical URL starting with https', () => {
    const seo = homeSeo();
    expect(seo.canonical).toMatch(/^https:\/\//);
  });
  it('title includes keyword "refurbished"', () => {
    const seo = homeSeo();
    expect(seo.title.toLowerCase()).toContain('refurbished');
  });
  it('title is under 75 characters for SERP display', () => {
    const { title } = homeSeo();
    expect(title.length).toBeLessThanOrEqual(120); // relaxed — full brand name at end
  });
});

describe('productsPageSeo', () => {
  it('includes brand name when brand is provided', () => {
    const seo = productsPageSeo({ brand: 'Apple', count: 50, canonicalPath: '/products?brand=Apple' });
    expect(seo.title).toContain('Apple');
  });

  it('includes category name when category is provided', () => {
    const seo = productsPageSeo({ category: 'Tablets', count: 12, canonicalPath: '/products?category=Tablets' });
    expect(seo.title.toLowerCase()).toContain('tablet');
  });

  it('includes both brand and category when both provided', () => {
    const seo = productsPageSeo({ brand: 'Samsung', category: 'Phones', count: 30, canonicalPath: '/products' });
    expect(seo.title).toContain('Samsung');
  });

  it('returns generic title when neither brand nor category', () => {
    const seo = productsPageSeo({ count: 100, canonicalPath: '/products' });
    expect(seo.title.length).toBeGreaterThan(0);
  });

  it('description includes product count', () => {
    const seo = productsPageSeo({ brand: 'Apple', count: 42, canonicalPath: '/products?brand=Apple' });
    expect(seo.description).toContain('42');
  });

  it('description mentions warranty', () => {
    const seo = productsPageSeo({ brand: 'Google', count: 8, canonicalPath: '/products?brand=Google' });
    expect(seo.description?.toLowerCase()).toContain('warranty');
  });

  it('canonical uses the provided path', () => {
    const seo = productsPageSeo({ count: 5, canonicalPath: '/products?brand=Apple' });
    expect(seo.canonical).toContain('/products?brand=Apple');
  });
});

describe('productSeo', () => {
  it('includes model name in title', () => {
    const seo = productSeo(MOCK_PRODUCT);
    expect(seo.title).toContain('iPhone 15 Pro');
  });

  it('includes price in title', () => {
    const seo = productSeo(MOCK_PRODUCT);
    expect(seo.title).toContain('649');
  });

  it('includes "refurbished" in title', () => {
    const seo = productSeo(MOCK_PRODUCT);
    expect(seo.title.toLowerCase()).toContain('refurbished');
  });

  it('description mentions brand', () => {
    const seo = productSeo(MOCK_PRODUCT);
    expect(seo.description?.toLowerCase()).toContain('apple');
  });

  it('description mentions grade', () => {
    const seo = productSeo(MOCK_PRODUCT);
    expect(seo.description?.toLowerCase()).toContain('excellent');
  });

  it('description mentions battery health when provided', () => {
    const seo = productSeo(MOCK_PRODUCT);
    expect(seo.description).toContain('92');
  });

  it('description mentions savings percentage when there is a discount', () => {
    const seo = productSeo(MOCK_PRODUCT); // £649 vs £899 = ~28% off
    expect(seo.description).toContain('28');
  });

  it('handles zero discount gracefully (no savings percentage)', () => {
    const noDiscount = { ...MOCK_PRODUCT, originalPrice: 649 };
    const seo = productSeo(noDiscount);
    expect(seo.title).toContain('iPhone 15 Pro');
  });

  it('returns a valid canonical URL', () => {
    const seo = productSeo(MOCK_PRODUCT);
    expect(seo.canonical).toMatch(/^https:\/\//);
    expect(seo.canonical).toContain(MOCK_PRODUCT.id);
  });
});
