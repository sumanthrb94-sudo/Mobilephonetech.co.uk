import { describe, it, expect } from 'vitest';
import { MAX_PRODUCT_IMAGES, capImages, galleryFrames } from '../../lib/productImages';

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
  it('always returns six frames', () => {
    for (const n of [1, 2, 3, 4, 5, 6, 7, 20]) {
      const images = Array.from({ length: n }, (_, i) => `img-${i}`);
      expect(galleryFrames(images)).toHaveLength(MAX_PRODUCT_IMAGES);
    }
  });

  it('repeats what a product has, cycling from the start', () => {
    expect(galleryFrames(['a', 'b'])).toEqual(['a', 'b', 'a', 'b', 'a', 'b']);
    expect(galleryFrames(['only'])).toEqual(Array(6).fill('only'));
    expect(galleryFrames(['a', 'b', 'c', 'd'])).toEqual(['a', 'b', 'c', 'd', 'a', 'b']);
  });

  it('passes six through untouched', () => {
    const six = ['a', 'b', 'c', 'd', 'e', 'f'];
    expect(galleryFrames(six)).toEqual(six);
  });

  it('shows the first six of an over-long list, not a wrapped seventh', () => {
    const many = Array.from({ length: 12 }, (_, i) => `img-${i}`);
    expect(galleryFrames(many)).toEqual(['img-0', 'img-1', 'img-2', 'img-3', 'img-4', 'img-5']);
  });

  it('starts from the primary image', () => {
    expect(galleryFrames(['primary', 'b'])[0]).toBe('primary');
  });

  /**
   * An empty gallery rather than six copies of nothing: six blank frames
   * would render as six broken images, which looks like a fault rather than
   * a product awaiting photos. The caller decides what that state looks like.
   */
  it('gives nothing back when there is nothing to show', () => {
    expect(galleryFrames([])).toEqual([]);
    expect(galleryFrames(['', '', ''])).toEqual([]);
  });

  it('ignores blanks among real images rather than framing them', () => {
    expect(galleryFrames(['a', '', 'b'])).toEqual(['a', 'b', 'a', 'b', 'a', 'b']);
  });
});
