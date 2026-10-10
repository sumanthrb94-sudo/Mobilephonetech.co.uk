import { describe, it, expect } from 'vitest';
import { cloudinarySrcSet, cloudinaryWidthUrl, isCloudinaryUrl } from '../../lib/cloudinaryUrl';

const BASE = 'https://res.cloudinary.com/demo/image/upload';

describe('cloudinaryWidthUrl', () => {
  it('adds a width limit with automatic format and quality', () => {
    expect(cloudinaryWidthUrl(`${BASE}/v1712/products/iphone.jpg`, 480))
      .toBe(`${BASE}/w_480,c_limit,f_auto,q_auto/v1712/products/iphone.jpg`);
  });

  it('folds in the f_auto,q_auto added at upload instead of repeating it', () => {
    expect(cloudinaryWidthUrl(`${BASE}/f_auto,q_auto/v1712/products/iphone.jpg`, 640))
      .toBe(`${BASE}/w_640,c_limit,f_auto,q_auto/v1712/products/iphone.jpg`);
  });

  it('keeps an existing transformation and runs it first', () => {
    expect(cloudinaryWidthUrl(`${BASE}/c_fill,g_auto,w_800,h_800/f_auto,q_auto/iphone.jpg`, 320))
      .toBe(`${BASE}/c_fill,g_auto,w_800,h_800/w_320,c_limit,f_auto,q_auto/iphone.jpg`);
  });

  it('handles a public id with no version or folder', () => {
    expect(cloudinaryWidthUrl(`${BASE}/iphone.jpg`, 160)).toBe(`${BASE}/w_160,c_limit,f_auto,q_auto/iphone.jpg`);
  });

  it('sizes a fetch link too, keeping its crop but choosing format and quality', () => {
    const src = 'https://images.samsung.com/is/image/samsung/p6pim/uk/s25-front.jpg';
    expect(cloudinaryWidthUrl(`https://res.cloudinary.com/smvandmc/image/fetch/c_crop,w_1280,h_1280,g_center/c_scale,w_1600,f_jpg,q_92/${src}`, 480))
      .toBe(`https://res.cloudinary.com/smvandmc/image/fetch/c_crop,w_1280,h_1280,g_center/c_scale,w_1600/w_480,c_limit,f_auto,q_auto/${src}`);
    expect(cloudinarySrcSet(`https://res.cloudinary.com/demo/image/fetch/${src}`, [320]))
      .toBe(`https://res.cloudinary.com/demo/image/fetch/w_320,c_limit,f_auto,q_auto/${src} 320w`);
  });

  it('leaves every other URL untouched', () => {
    for (const url of [
      '/assets/quality-inspection.png',
      'https://firebasestorage.googleapis.com/v0/b/x/o/photo.jpg?alt=media',
      'https://example.com/res.cloudinary.com/image/upload/a.jpg',
      '',
    ]) {
      expect(cloudinaryWidthUrl(url, 480)).toBe(url);
    }
  });
});

describe('cloudinarySrcSet', () => {
  it('lists one candidate per width', () => {
    expect(cloudinarySrcSet(`${BASE}/v1/a.jpg`, [320, 640])).toBe(
      `${BASE}/w_320,c_limit,f_auto,q_auto/v1/a.jpg 320w, ${BASE}/w_640,c_limit,f_auto,q_auto/v1/a.jpg 640w`,
    );
  });

  it('is undefined for a non-Cloudinary URL', () => {
    expect(cloudinarySrcSet('/assets/a.png')).toBeUndefined();
    expect(isCloudinaryUrl('not a url')).toBe(false);
  });
});
