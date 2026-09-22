import { describe, it, expect } from 'vitest';
import {
  BUILT_IN_PANELS, EMPTY_PANEL, PANEL_RAIL_LIMIT,
  matchesPanel, panelProducts, panelProblems, parseWords, joinWords, toPanel,
  type SeriesPanel,
} from '../../lib/seriesPanels';
import type { Product } from '../../types';

/**
 * The rule deciding which products belong to a home-page series.
 *
 * This replaced four hand-written JavaScript predicates, so the first thing
 * worth proving is that the plain-words version still selects what those did
 * — a Galaxy Z Fold in the foldables panel, a Pixel Watch nowhere near the
 * Pixel one. The second is that a rule typed by someone non-technical cannot
 * do anything worse than match nothing.
 */

const product = (brand: string, model: string, extra: Partial<Product> = {}): Product => ({
  id: `${brand}-${model}`.toLowerCase().replace(/\s+/g, '-'),
  brand, model,
  price: 499, originalPrice: 699, stock: 3,
  grade: 'Excellent', category: 'Phones',
  images: [], description: '', conditionDescription: '',
  batteryHealth: 90, warrantyMonths: 12, returnDays: 30,
  colorOptions: [], storageOptions: [],
  imageUrl: '', isCertified: true, specs: {} as Product['specs'],
  ...extra,
} as Product);

const CATALOGUE: Product[] = [
  product('Apple', 'iPhone 17 Pro Max'),
  product('Apple', 'iPhone 17 Pro'),
  product('Apple', 'iPhone 17'),
  product('Apple', 'iPhone 16'),
  product('Samsung', 'Galaxy S23 Ultra'),
  product('Samsung', 'Galaxy S22'),
  product('Samsung', 'Galaxy Tab S9'),
  product('Samsung', 'Galaxy Z Fold 5'),
  product('Samsung', 'Galaxy Z Flip 5'),
  product('Samsung', 'Galaxy A54'),
  product('Google', 'Pixel 8 Pro'),
  product('Google', 'Pixel 7'),
  product('Google', 'Pixel Watch 2'),
  product('Google', 'Pixel Buds Pro'),
];

const panel = (over: Partial<SeriesPanel>): SeriesPanel =>
  ({ ...EMPTY_PANEL, id: 'p', updatedAt: '', ...over } as SeriesPanel);

const models = (list: Product[]) => list.map(p => p.model);
const byId = (id: string) => BUILT_IN_PANELS.find(p => p.id === id)!;

describe('matchesPanel', () => {
  it('requires the brand to match exactly, ignoring case', () => {
    const p = panel({ brand: 'Samsung', include: ['Galaxy'] });
    expect(matchesPanel(product('Samsung', 'Galaxy S23'), p)).toBe(true);
    expect(matchesPanel(product('samsung', 'Galaxy S23'), p)).toBe(true);
    expect(matchesPanel(product('Apple', 'Galaxy S23'), p)).toBe(false);
  });

  it('matches any brand when none is given', () => {
    const p = panel({ brand: '', include: ['Pixel'] });
    expect(matchesPanel(product('Google', 'Pixel 8'), p)).toBe(true);
    expect(matchesPanel(product('Nothing', 'Pixel clone'), p)).toBe(true);
  });

  it('matches any model when no include words are given', () => {
    const p = panel({ brand: 'Apple', include: [] });
    expect(matchesPanel(product('Apple', 'anything at all'), p)).toBe(true);
  });

  it('treats include words as alternatives', () => {
    const p = panel({ brand: 'Samsung', include: ['Fold', 'Flip'] });
    expect(matchesPanel(product('Samsung', 'Galaxy Z Fold 5'), p)).toBe(true);
    expect(matchesPanel(product('Samsung', 'Galaxy Z Flip 5'), p)).toBe(true);
    expect(matchesPanel(product('Samsung', 'Galaxy S23'), p)).toBe(false);
  });

  /**
   * Stated this way round so that adding an exclusion can only narrow a
   * panel. A staff member fixing "the Pixel Watch is in my phones panel"
   * should never widen it by accident.
   */
  it('lets an exclusion beat an inclusion', () => {
    const p = panel({ brand: 'Google', include: ['Pixel'], exclude: ['Watch', 'Buds'] });
    expect(matchesPanel(product('Google', 'Pixel 8 Pro'), p)).toBe(true);
    expect(matchesPanel(product('Google', 'Pixel Watch 2'), p)).toBe(false);
    expect(matchesPanel(product('Google', 'Pixel Buds Pro'), p)).toBe(false);
  });

  it('is case-insensitive on the words staff type', () => {
    const p = panel({ brand: 'Samsung', include: ['fold'], exclude: ['TAB'] });
    expect(matchesPanel(product('Samsung', 'Galaxy Z Fold 5'), p)).toBe(true);
    expect(matchesPanel(product('Samsung', 'Galaxy Tab S9'), p)).toBe(false);
  });

  /**
   * The words go nowhere near a regular-expression engine, so characters
   * that would be syntax there are just characters here — no throw, no
   * catastrophic backtracking, and no accidental wildcard.
   */
  it('treats regex metacharacters as ordinary text', () => {
    const p = panel({ brand: '', include: ['.*'] });
    expect(matchesPanel(product('Apple', 'iPhone 17'), p)).toBe(false);
    expect(matchesPanel(product('Apple', 'iPhone .* special'), p)).toBe(true);

    const nasty = panel({ brand: '', include: ['(a+)+$'] });
    expect(() => matchesPanel(product('Apple', 'a'.repeat(5000)), nasty)).not.toThrow();
    expect(matchesPanel(product('Apple', 'a'.repeat(5000)), nasty)).toBe(false);
  });
});

describe('the built-in panels still select what their JavaScript rules did', () => {
  it('iPhone 17: the 17s, not the 16', () => {
    expect(models(panelProducts(CATALOGUE, byId('iphone-17'))))
      .toEqual(['iPhone 17 Pro Max', 'iPhone 17 Pro', 'iPhone 17']);
  });

  it('Galaxy S: the phones, not the tablet', () => {
    const out = models(panelProducts(CATALOGUE, byId('galaxy-s')));
    expect(out).toContain('Galaxy S23 Ultra');
    expect(out).toContain('Galaxy S22');
    expect(out).not.toContain('Galaxy Tab S9');
    expect(out).not.toContain('Galaxy A54');
  });

  it('Fold & Flip: both foldables, nothing else', () => {
    expect(models(panelProducts(CATALOGUE, byId('galaxy-fold'))).sort())
      .toEqual(['Galaxy Z Flip 5', 'Galaxy Z Fold 5']);
  });

  it('Pixel: the phones, not the watch or the earbuds', () => {
    const out = models(panelProducts(CATALOGUE, byId('pixel')));
    expect(out).toEqual(['Pixel 8 Pro', 'Pixel 7']);
  });

  it('ships four panels, all switched on', () => {
    expect(BUILT_IN_PANELS).toHaveLength(4);
    expect(BUILT_IN_PANELS.every(p => p.active)).toBe(true);
    expect(BUILT_IN_PANELS.map(p => p.order)).toEqual([0, 1, 2, 3]);
  });
});

describe('panelProducts', () => {
  it('shows one entry per model, not one per storage size', () => {
    const dupes = [
      product('Apple', 'iPhone 17 Pro', { id: 'a', storage: '256GB' }),
      product('Apple', 'iPhone 17 Pro', { id: 'b', storage: '512GB' }),
      product('Apple', 'iPhone 17 Pro', { id: 'c', storage: '1TB' }),
    ];
    expect(panelProducts(dupes, byId('iphone-17'))).toHaveLength(1);
  });

  it('sorts flagships first when asked', () => {
    const out = models(panelProducts(CATALOGUE, panel({
      brand: 'Apple', include: ['iPhone 17'], sort: 'flagship',
    })));
    expect(out[0]).toBe('iPhone 17 Pro Max');
  });

  it('sorts newest first when asked', () => {
    const out = models(panelProducts(CATALOGUE, panel({
      brand: 'Samsung', include: ['Galaxy S'], exclude: ['Tab'], sort: 'newest',
    })));
    expect(out[0]).toBe('Galaxy S23 Ultra');
  });

  it('caps the rail rather than rendering the whole catalogue', () => {
    const many = Array.from({ length: 40 }, (_, i) => product('Apple', `iPhone 17 variant ${i}`));
    expect(panelProducts(many, byId('iphone-17')).length).toBe(PANEL_RAIL_LIMIT);
  });

  /**
   * A rule matching nothing is the failure staff are most likely to create,
   * by excluding a word that turns out to be in every model. It has to be
   * harmless: the panel simply does not render.
   */
  it('returns nothing for a rule that matches nothing', () => {
    expect(panelProducts(CATALOGUE, panel({ brand: 'Nokia', include: ['3310'] }))).toEqual([]);
  });

  it('can express a series the site never shipped with', () => {
    // The case the whole feature exists for: staff adding an A series panel.
    const aSeries = panel({ brand: 'Samsung', include: ['Galaxy A'] });
    expect(models(panelProducts(CATALOGUE, aSeries))).toEqual(['Galaxy A54']);
  });
});

describe('parseWords / joinWords', () => {
  it('round-trips a comma-separated list', () => {
    expect(parseWords('Fold, Flip')).toEqual(['Fold', 'Flip']);
    expect(joinWords(['Fold', 'Flip'])).toBe('Fold, Flip');
  });

  it('ignores stray commas and whitespace', () => {
    expect(parseWords('  Fold ,, Flip ,  ')).toEqual(['Fold', 'Flip']);
    expect(parseWords('')).toEqual([]);
  });

  it('caps the list so one field cannot carry a whole catalogue', () => {
    expect(parseWords(Array.from({ length: 50 }, (_, i) => `w${i}`).join(','))).toHaveLength(12);
  });
});

describe('panelProblems', () => {
  const ok = { eyebrow: 'Galaxy A · Everyday', headline: 'Flagship feel.', ctaHref: '/products' };

  it('passes a complete panel', () => {
    expect(panelProblems(ok)).toEqual([]);
  });

  it('requires a series name and a headline', () => {
    expect(panelProblems({ ...ok, eyebrow: ' ' })[0]).toMatch(/series name/i);
    expect(panelProblems({ ...ok, headline: ' ' })[0]).toMatch(/headline/i);
  });

  it('refuses a link that leaves the shop', () => {
    for (const href of ['https://evil.test', 'javascript:alert(1)', 'evil.test']) {
      expect(panelProblems({ ...ok, ctaHref: href })[0]).toMatch(/inside the shop/i);
    }
    expect(panelProblems({ ...ok, ctaHref: '/products?brand=Samsung' })).toEqual([]);
  });
});

describe('toPanel', () => {
  it('survives a malformed document rather than throwing', () => {
    const out = toPanel('x', {
      eyebrow: 123, include: 'not-an-array', exclude: null,
      tone: 'neon', sort: 'sideways', active: 'yes', order: 'first',
    });
    expect(out.include).toEqual([]);
    expect(out.exclude).toEqual([]);
    expect(out.tone).toBe('light');
    expect(out.sort).toBe('newest');
    // A string that is not literally `true` must not switch a panel on.
    expect(out.active).toBe(false);
  });
});
