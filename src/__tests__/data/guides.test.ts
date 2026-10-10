import { describe, it, expect } from 'vitest';
import { GUIDES, GUIDE_REDIRECTS, guideBySlug, publishedGuides, todayInUk } from '../../data/guides';

const text = (g: (typeof GUIDES)[number]) =>
  [g.title, g.summary, ...g.body.map(b => (b.type === 'ul' ? b.items.join(' ') : b.type === 'products' ? b.title : b.text))].join(' ');

describe('blog guides', () => {
  it('every guide has a unique address and a body to read', () => {
    const slugs = GUIDES.map(g => g.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const g of GUIDES) {
      expect(g.slug).toMatch(/^[a-z0-9-]+$/);
      expect(g.body.length).toBeGreaterThan(2);
    }
  });

  it('old article links land on a real guide', () => {
    for (const target of Object.values(GUIDE_REDIRECTS)) expect(guideBySlug(target, '2099-01-01')).toBeTruthy();
  });

  it('agrees with what the shop promises', () => {
    const all = GUIDES.map(text).join(' ');
    // The iPhone battery minimum is 85%, not 80%.
    expect(all).not.toMatch(/80%\+|80% guarantee/);
    expect(all).toMatch(/85%/);
    // The shop sells Pristine, Excellent and Good only.
    expect(all).not.toMatch(/\bFair\b/);
    // Cancellation is 14 days by law; faulty goods 30 days.
    expect(all).toMatch(/14 days/);
    expect(all).toMatch(/30 days/);
  });
});

describe('scheduled guides', () => {
  const future = GUIDES.find(g => g.publishedAt > '2026-10-10')!;

  it('stay hidden until their day, then go live', () => {
    expect(future).toBeTruthy();
    expect(guideBySlug(future.slug, '2026-10-10')).toBeUndefined();
    expect(publishedGuides('2026-10-10').some(g => g.slug === future.slug)).toBe(false);
    expect(guideBySlug(future.slug, future.publishedAt)).toBe(future);
    expect(publishedGuides(future.publishedAt).some(g => g.slug === future.slug)).toBe(true);
  });

  it('list newest first', () => {
    const dates = publishedGuides('2099-01-01').map(g => g.publishedAt);
    expect(dates).toEqual([...dates].sort().reverse());
  });

  it('use the UK date', () => {
    // British Summer Time (UTC+1) runs to 25 October 2026; GMT after.
    expect(todayInUk(new Date('2026-10-13T23:30:00Z'))).toBe('2026-10-14');
    expect(todayInUk(new Date('2026-12-13T23:30:00Z'))).toBe('2026-12-13');
  });
});

describe('product links in guides', () => {
  it('point at the product list and name what they show', () => {
    for (const g of GUIDES) {
      for (const b of g.body) {
        if (b.type !== 'products') continue;
        expect(b.href.startsWith('/products')).toBe(true);
        expect(b.title.length).toBeGreaterThan(3);
      }
    }
  });

  it('never claim instalments the shop does not offer', () => {
    const all = GUIDES.map(text).join(' ');
    expect(all).not.toMatch(/we offer (klarna|clearpay|pay in 3|finance|instalments)/i);
  });
});
