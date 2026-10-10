import { describe, it, expect } from 'vitest';
import { photosFirst } from '../../lib/productImages';
import { docToProduct } from '../../lib/productMapper';
import { homeRowsCheck } from '../../lib/dashboardInsights';

/**
 * Eight in-stock iPhones had real Cloudinary photos stored behind the bundled
 * drawing they were created with, so the shop kept showing the drawing and the
 * home page had no iPhones with photos. Real photos now always lead.
 */
const SVG = '/assets/catalogue/apple-iphone-12-128gb--blue.svg';
const FRONT = 'https://res.cloudinary.com/x/image/upload/iphone-12-blue-front.png';
const BACK = 'https://res.cloudinary.com/x/image/upload/iphone-12-blue-back.png';

describe('real photos come before placeholder drawings', () => {
  it('promotes the first real photo and drops the drawing', () => {
    expect(photosFirst(SVG, [SVG, FRONT, BACK])).toEqual({ imageUrl: FRONT, galleryImages: [FRONT, BACK] });
  });

  it('leaves a product with no real photo exactly as it was', () => {
    expect(photosFirst(SVG, [SVG])).toEqual({ imageUrl: SVG, galleryImages: [SVG] });
  });

  it('does not repeat a photo that is both the main image and in the gallery', () => {
    expect(photosFirst(FRONT, [FRONT, BACK]).galleryImages).toEqual([FRONT, BACK]);
  });

  it('applies to each colour and gives the product its in-stock colour photo', () => {
    const p = docToProduct('apple-iphone-12-128gb', {
      brand: 'Apple', model: 'iPhone 12', imageUrl: '/assets/catalogue/apple-iphone-12-128gb.svg', stock: 4,
      variants: [
        { id: 'a', color: 'Green', stock: 0, price: 1, originalPrice: 1, imageUrl: SVG, galleryImages: [SVG, 'https://res.cloudinary.com/x/green.png'] },
        { id: 'b', color: 'Blue', stock: 4, price: 1, originalPrice: 1, imageUrl: SVG, galleryImages: [SVG, FRONT, BACK] },
      ],
    });
    expect(p.variants?.[1].imageUrl).toBe(FRONT);
    expect(p.variants?.[1].galleryImages).toEqual([FRONT, BACK]);
    expect(p.imageUrl).toBe(FRONT);
  });
});

describe('the dashboard names home page rows that are hidden', () => {
  it('flags a row with nothing in stock by name', () => {
    const c = homeRowsCheck([{ label: 'iPhone', showing: 6 }, { label: 'iPhone 17 series', showing: 0 }]);
    expect(c.state).toBe('todo');
    expect(c.detail).toMatch(/iPhone 17 series/);
  });

  it('is done when every row shows something', () => {
    expect(homeRowsCheck([{ label: 'iPhone', showing: 6 }]).state).toBe('done');
  });

  it('says so when the rows could not be read', () => {
    expect(homeRowsCheck(null).state).toBe('unknown');
  });
});
