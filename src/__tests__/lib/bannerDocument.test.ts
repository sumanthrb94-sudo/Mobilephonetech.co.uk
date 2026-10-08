import { describe, it, expect } from 'vitest';
import { bannerDocument, EMPTY_BANNER, HOME_BANNER_SET, type Banner } from '../../lib/banners';

const banner = { ...EMPTY_BANNER, id: 'b1', updatedAt: '', headline: 'Hi', image: '/x.jpg', alt: 'x', imageWide: undefined } as Banner;

describe('bannerDocument', () => {
  it('drops undefined fields, which Firestore refuses', () => {
    const data = bannerDocument(banner);
    expect(Object.values(data)).not.toContain(undefined);
    expect('imageWide' in data).toBe(false);
  });

  it('puts a saved banner in the set the home page shows', () => {
    expect(bannerDocument({ ...banner, campaignSet: 'old-set' }).campaignSet).toBe(HOME_BANNER_SET);
  });

  it('falls back to the products link when none is given', () => {
    expect(bannerDocument({ ...banner, ctaHref: '  ' }).ctaHref).toBe('/products');
  });
});
