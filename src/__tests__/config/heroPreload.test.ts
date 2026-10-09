import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { BUILT_IN_SLIDES } from '../../components/HeroCarousel';
import { RESPONSIVE_IMAGES } from '../../data/responsiveImages';

/**
 * index.html preloads the first hero slide by hand, because the <img> that
 * shows it sits in a lazy chunk the browser cannot see at parse time. A
 * preload that names a different file than the carousel renders is worse
 * than none: the shopper downloads both. These keep the two in step.
 */

const root = resolve(__dirname, '../../..');
const indexHtml = readFileSync(resolve(root, 'index.html'), 'utf8');
const preloads = [...indexHtml.matchAll(/<link rel="preload" as="image"[^>]*>/g)].map(m => m[0]);
const attr = (tag: string, name: string) => new RegExp(`${name}="([^"]*)"`).exec(tag)?.[1];

describe('hero preload', () => {
  const first = BUILT_IN_SLIDES[0];

  it.each([
    ['(max-width: 1023px)', first.imageMobile],
    ['(min-width: 1024px) and (max-width: 1599px)', first.image],
    ['(min-width: 1600px)', first.imageWide as string],
  ])('preloads exactly the AVIF candidates the carousel offers at %s', (media, src) => {
    const tag = preloads.find(t => attr(t, 'media') === media);
    expect(tag).toBeDefined();
    expect(attr(tag!, 'type')).toBe('image/avif');
    expect(attr(tag!, 'fetchpriority')).toBe('high');
    expect(attr(tag!, 'imagesrcset')).toBe(RESPONSIVE_IMAGES[src].avif);
  });

  it('points at files that exist', () => {
    for (const tag of preloads) {
      for (const candidate of attr(tag, 'imagesrcset')!.split(', ')) {
        const url = candidate.split(' ')[0];
        expect(existsSync(resolve(root, 'public' + url)), url).toBe(true);
      }
    }
  });
});

describe('responsive renditions', () => {
  it('cover every built-in slide', () => {
    for (const s of BUILT_IN_SLIDES) {
      for (const src of [s.image, s.imageMobile, s.imageWide]) {
        expect(RESPONSIVE_IMAGES[src as string], src).toBeDefined();
      }
    }
  });
});
