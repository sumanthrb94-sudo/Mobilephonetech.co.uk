import { describe, it, expect } from 'vitest';
import { GUIDES, GUIDE_REDIRECTS, guideBySlug } from '../../data/guides';

const text = (g: (typeof GUIDES)[number]) =>
  [g.title, g.summary, ...g.body.map(b => (b.type === 'ul' ? b.items.join(' ') : b.text))].join(' ');

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
    for (const target of Object.values(GUIDE_REDIRECTS)) expect(guideBySlug(target)).toBeTruthy();
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
