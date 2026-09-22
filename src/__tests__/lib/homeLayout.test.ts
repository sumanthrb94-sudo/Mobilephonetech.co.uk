import { describe, it, expect } from 'vitest';
import {
  SECTIONS, defaultLayout, resolveLayout, visibleSections, type StoredLayout,
} from '../../lib/homeLayout';

/**
 * The home page's running order.
 *
 * This resolver is the only thing standing between a stored preference and
 * the shop's front page, so what it refuses to do matters more than what it
 * does. Two properties carry the weight:
 *
 *   - a stored layout can never remove a section from existence, only hide
 *     it, so a section shipped after the layout was saved still appears;
 *   - the locked sections stay on however the document is edited, including
 *     by hand in the Firebase console.
 */

const ids = (layout: { id: string }[]) => layout.map(s => s.id);

describe('defaultLayout', () => {
  it('is the shipped order with everything visible', () => {
    const out = defaultLayout();
    expect(ids(out)).toEqual(SECTIONS.map(s => s.id));
    expect(out.every(s => s.visible)).toBe(true);
    expect(out.map(s => s.order)).toEqual(SECTIONS.map((_, i) => i));
  });
});

describe('resolveLayout', () => {
  it('falls back to the shipped order when nothing is stored', () => {
    expect(ids(resolveLayout(null))).toEqual(ids(defaultLayout()));
    expect(ids(resolveLayout(undefined))).toEqual(ids(defaultLayout()));
  });

  it('applies a stored order', () => {
    const stored: StoredLayout = {
      order: ['hero', 'faq', 'trustBanner', 'brandShowcase'],
      hidden: [],
      updatedAt: '',
    };
    const out = ids(resolveLayout(stored));
    // The four it names keep the relative order it gave them.
    expect(out.indexOf('hero')).toBeLessThan(out.indexOf('faq'));
    expect(out.indexOf('faq')).toBeLessThan(out.indexOf('trustBanner'));
    expect(out.indexOf('trustBanner')).toBeLessThan(out.indexOf('brandShowcase'));
  });

  it('hides what the stored layout hides, and nothing else', () => {
    const out = resolveLayout({ order: [], hidden: ['blog', 'pressLogos'], updatedAt: '' });
    const hidden = out.filter(s => !s.visible).map(s => s.id);
    expect(hidden.sort()).toEqual(['blog', 'pressLogos']);
  });

  /**
   * The point of resolving against SECTIONS rather than reading the stored
   * list as the page: a layout saved before a section existed must not be
   * able to suppress it for ever.
   */
  it('still shows a section the stored layout has never heard of', () => {
    const stale: StoredLayout = { order: ['trustBanner', 'hero'], hidden: [], updatedAt: '' };
    const out = resolveLayout(stale);

    expect(ids(out).sort()).toEqual(SECTIONS.map(s => s.id).sort());
    expect(out.every(s => s.visible)).toBe(true);
  });

  it('keeps an unknown section beside its neighbours, not at the end', () => {
    // A layout that names everything except the blog, which sits between the
    // FAQ and the quality strip in the shipped order.
    const order = SECTIONS.map(s => s.id).filter(id => id !== 'blog');
    const out = ids(resolveLayout({ order, hidden: [], updatedAt: '' }));

    expect(out.indexOf('blog')).toBeGreaterThan(out.indexOf('faq'));
    expect(out.indexOf('blog')).toBeLessThan(out.indexOf('qualityPromise'));
    expect(out[out.length - 1]).not.toBe('blog');
  });

  it('drops a stored id that no longer exists in the code', () => {
    const out = resolveLayout({ order: ['hero', 'a-section-we-deleted'], hidden: [], updatedAt: '' });
    expect(ids(out)).not.toContain('a-section-we-deleted');
    expect(ids(out).sort()).toEqual(SECTIONS.map(s => s.id).sort());
  });

  /**
   * The banner carousel is the shop front. Hiding it leaves the home page
   * opening on a trust strip and a wall of text, so the document is not
   * allowed to do it even if edited outside the admin.
   */
  it('refuses to hide a locked section, however the document was written', () => {
    const locked = SECTIONS.filter(s => s.locked).map(s => s.id);
    expect(locked.length).toBeGreaterThan(0);

    const out = resolveLayout({ order: [], hidden: locked, updatedAt: '' });
    for (const id of locked) {
      expect(out.find(s => s.id === id)?.visible).toBe(true);
    }
  });

  it('survives a malformed document rather than throwing', () => {
    for (const junk of [
      { order: 'not-an-array', hidden: null },
      { order: [1, 2, 3], hidden: [{}] },
      {},
    ] as unknown as Partial<StoredLayout>[]) {
      const out = resolveLayout(junk);
      expect(ids(out).sort()).toEqual(SECTIONS.map(s => s.id).sort());
    }
  });

  it('numbers the result 0..n-1 so the admin can reorder from it', () => {
    const out = resolveLayout({ order: ['faq', 'hero'], hidden: ['blog'], updatedAt: '' });
    expect(out.map(s => s.order)).toEqual(out.map((_, i) => i));
  });
});

describe('visibleSections', () => {
  it('is never empty, because the locked sections cannot be switched off', () => {
    const everythingOff = resolveLayout({
      order: [],
      hidden: SECTIONS.map(s => s.id),
      updatedAt: '',
    });
    expect(visibleSections(everythingOff).length).toBeGreaterThan(0);
  });
});

/**
 * The layout list and the components it names are written in two places by
 * necessity — one has no JSX so it can be tested and imported freely, the
 * other is all JSX. This is the seam where they are checked against each
 * other, because the failure mode is silent: a section staff can switch on
 * that renders nothing, or a block on the home page they cannot see or move.
 */
describe('SECTIONS and SECTION_VIEWS agree', () => {
  it('every section staff can order has something to render', async () => {
    const { SECTION_VIEWS } = await import('../../components/HomeSections');

    const listed = SECTIONS.map(s => s.id).sort();
    const rendered = Object.keys(SECTION_VIEWS).sort();

    expect(rendered).toEqual(listed);
  });
});
