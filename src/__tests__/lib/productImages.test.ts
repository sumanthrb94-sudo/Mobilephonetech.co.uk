import { describe, it, expect } from 'vitest';
import { MAX_PRODUCT_IMAGES, capImages, galleryFrames, isUploadedPhoto } from '../../lib/productImages';

/**
 * Six images per product.
 *
 * The number belongs to the product page's gallery grid, so the two things
 * worth pinning are that nothing can exceed it — a seventh image wraps the
 * thumbnail row onto a line nobody designed — and that a product with fewer
 * still fills every frame, because a half-empty grid reads as broken rather
 * than as a shop with two photos.
 */

describe('capImages', () => {
  it('leaves a product at or under the limit alone', () => {
    const five = ['a', 'b', 'c', 'd', 'e'];
    expect(capImages(five)).toEqual(five);
    expect(capImages([])).toEqual([]);
  });

  it('drops everything past the sixth', () => {
    const nine = Array.from({ length: 9 }, (_, i) => `img-${i}`);
    const out = capImages(nine);

    expect(out).toHaveLength(MAX_PRODUCT_IMAGES);
    expect(out).toEqual(['img-0', 'img-1', 'img-2', 'img-3', 'img-4', 'img-5']);
  });

  /**
   * The first image is the primary one shown on cards and as the hero, so
   * trimming must take from the end. Reordering here would silently change
   * which photo represents the product everywhere in the shop.
   */
  it('keeps the primary image first', () => {
    const many = ['primary', 'b', 'c', 'd', 'e', 'f', 'g'];
    expect(capImages(many)[0]).toBe('primary');
  });

  it('keeps duplicates, because six distinct photos is a goal not a rule', () => {
    const dupes = ['a', 'a', 'b', 'b', 'a', 'b', 'c'];
    expect(capImages(dupes)).toEqual(['a', 'a', 'b', 'b', 'a', 'b']);
  });
});

describe('galleryFrames', () => {
  it('shows each distinct photo once, never padding with repeats', () => {
    expect(galleryFrames(['a', 'b'])).toEqual(['a', 'b']);
    expect(galleryFrames(['only'])).toEqual(['only']);
    expect(galleryFrames(['a', 'b', 'c'])).toEqual(['a', 'b', 'c']);
  });

  it('drops exact duplicates, keeping the first position', () => {
    expect(galleryFrames(['a', 'b', 'a', 'c', 'b'])).toEqual(['a', 'b', 'c']);
  });

  it('treats the same Cloudinary photo at other sizes or formats as one', () => {
    const base = 'https://res.cloudinary.com/smvandmc/image/upload/v17/lehart/iphone-13--green--front.png';
    const resized = 'https://res.cloudinary.com/smvandmc/image/upload/w_800,c_limit/f_auto,q_auto/v17/lehart/iphone-13--green--front.png';
    const other = 'https://res.cloudinary.com/smvandmc/image/upload/v17/lehart/iphone-13--back.png';
    expect(galleryFrames([base, resized, other])).toEqual([base, other]);
  });

  it('treats a fetched copy of a photo as that photo', () => {
    const src = 'https://cdn.example.test/p/iphone-13-front.jpg';
    const fetched = `https://res.cloudinary.com/smvandmc/image/fetch/f_auto,q_auto/${src}`;
    expect(galleryFrames([src, fetched])).toEqual([src]);
  });

  it('keeps different photos that merely share a folder', () => {
    expect(galleryFrames([
      'https://res.cloudinary.com/x/image/upload/v1/p/front.jpg',
      'https://res.cloudinary.com/x/image/upload/v1/p/side.jpg',
    ])).toHaveLength(2);
  });

  it('passes six through untouched and caps longer lists at six', () => {
    const six = ['a', 'b', 'c', 'd', 'e', 'f'];
    expect(galleryFrames(six)).toEqual(six);
    const many = Array.from({ length: 12 }, (_, i) => `img-${i}`);
    expect(galleryFrames(many)).toHaveLength(MAX_PRODUCT_IMAGES);
  });

  it('starts from the primary image', () => {
    expect(galleryFrames(['primary', 'b'])[0]).toBe('primary');
  });

  it('gives nothing back when there is nothing to show, and skips blanks', () => {
    expect(galleryFrames([])).toEqual([]);
    expect(galleryFrames(['', '', ''])).toEqual([]);
    expect(galleryFrames(['a', '', 'b'])).toEqual(['a', 'b']);
  });
});

describe('isUploadedPhoto', () => {
  it('accepts photos staff uploaded or linked', () => {
    expect(isUploadedPhoto('https://res.cloudinary.com/lehart/image/upload/v1/products/iphone.jpg')).toBe(true);
    expect(isUploadedPhoto('https://firebasestorage.googleapis.com/v0/b/x/o/products%2Fa.jpg')).toBe(true);
  });

  it('rejects the demo catalogue pictures bundled with the site', () => {
    expect(isUploadedPhoto('/assets/iphone-17-pro-max-orange.jpg')).toBe(false);
    expect(isUploadedPhoto('assets/galaxy-s23.jpg')).toBe(false);
  });

  it('rejects placeholders and empty values', () => {
    expect(isUploadedPhoto('https://placehold.co/600x600')).toBe(false);
    expect(isUploadedPhoto('')).toBe(false);
    expect(isUploadedPhoto(undefined)).toBe(false);
  });
});
