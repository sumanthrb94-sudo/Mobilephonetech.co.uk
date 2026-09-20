import { describe, it, expect } from 'vitest';
import { suggestionTerm } from '../../components/SearchAutocomplete';

/**
 * The one property that matters: the term must still find the product it was
 * derived from. ProductsPage matches the query as a substring of a single
 * field, so as long as the term is a substring of the model, the suggestion
 * cannot lead to an empty results page.
 *
 * These are real model strings from the catalogue, including the one that
 * genuinely says "Nintendo" twice.
 */
const REAL_MODELS = [
  'iPhone 17 Pro Max',
  'Samsung Galaxy Z Fold4 5G - Unlocked',
  'Playstation 5 Digital Edition Console (Disc Free)',
  'Google Pixel 7 Pro - Unlocked',
  'Meta Quest 3S 128GB All-In-One Mixed Reality Headset',
  'Nintendo Nintendo Switch - Neon (OLED Model)',
];

describe('suggestionTerm', () => {
  it('always returns a substring of the model it came from', () => {
    for (const model of REAL_MODELS) {
      const term = suggestionTerm(model);
      expect(
        model.toLowerCase().includes(term.toLowerCase()),
        `"${term}" is not findable in "${model}"`,
      ).toBe(true);
    }
  });

  it('never returns an empty term', () => {
    for (const model of REAL_MODELS) {
      expect(suggestionTerm(model).length).toBeGreaterThan(0);
    }
  });

  it('drops the retail tail after a dash', () => {
    expect(suggestionTerm('Google Pixel 7 Pro - Unlocked')).toBe('Google Pixel 7 Pro');
  });

  it('drops a parenthesised tail', () => {
    expect(suggestionTerm('Playstation 5 Digital Edition Console (Disc Free)'))
      .toBe('Playstation 5 Digital Edition Console');
  });

  it('collapses a word the catalogue repeats', () => {
    expect(suggestionTerm('Nintendo Nintendo Switch - Neon (OLED Model)')).toBe('Nintendo Switch');
  });

  it('leaves a clean model alone', () => {
    expect(suggestionTerm('iPhone 17 Pro Max')).toBe('iPhone 17 Pro Max');
  });

  /** A hyphen inside a word is not a retail tail. */
  it('does not cut on a hyphen that is not a separator', () => {
    expect(suggestionTerm('Meta Quest 3S 128GB All-In-One Mixed Reality Headset'))
      .toBe('Meta Quest 3S 128GB All-In-One Mixed Reality Headset');
  });
});
