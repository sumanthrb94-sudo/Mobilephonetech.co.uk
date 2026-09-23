import { describe, it, expect } from 'vitest';
import {
  initialSplitRows, splitProblems, parsedSplitRows, totalSplitStock,
  type ColourSplitRow,
} from '../../lib/productColourSplit';

/**
 * Turning one listing that names several colours into one listing per
 * colour — the storage pattern applied to colour. What is pinned here is
 * the property the feature exists for: nothing is written until every row
 * carries a real, distinct stock count and a real, distinct slug, and
 * nothing here ever guesses a number on the person's behalf.
 */

describe('initialSplitRows', () => {
  it('proposes a slug per colour and leaves stock blank', () => {
    const rows = initialSplitRows({ brand: 'Apple', model: 'iPhone 8', storage: '128GB' }, ['Blue', 'Silver']);
    expect(rows).toEqual([
      { colour: 'Blue', id: 'apple-iphone-8-128gb-blue', stock: '' },
      { colour: 'Silver', id: 'apple-iphone-8-128gb-silver', stock: '' },
    ]);
  });

  it('copes with no storage', () => {
    const rows = initialSplitRows({ brand: 'Apple', model: 'iPhone SE' }, ['Black']);
    expect(rows[0].id).toBe('apple-iphone-se-black');
  });
});

const row = (over: Partial<ColourSplitRow> = {}): ColourSplitRow =>
  ({ colour: 'Blue', id: 'apple-iphone-8-blue', stock: '2', ...over });

describe('splitProblems', () => {
  it('is silent when every row has a real stock count and a distinct slug', () => {
    const rows = [row(), row({ colour: 'Silver', id: 'apple-iphone-8-silver', stock: '1' })];
    expect(splitProblems(rows, 'apple-iphone-8')).toEqual([]);
  });

  /**
   * The whole point of the feature: no guessed number reaches the database.
   * A blank stock field is refused rather than silently treated as zero.
   */
  it('refuses a blank stock count', () => {
    const problems = splitProblems([row({ stock: '' })], 'other-id');
    expect(problems).toEqual([{ index: 0, message: 'Enter the real stock count for this colour.' }]);
  });

  it('refuses a stock count that is not a whole number', () => {
    for (const bad of ['-1', '1.5', 'two', ' ']) {
      expect(splitProblems([row({ stock: bad })], 'other-id')[0]?.message).toMatch(/whole number|real stock/i);
    }
  });

  it('accepts zero — a colour split out with none currently in stock', () => {
    expect(splitProblems([row({ stock: '0' })], 'other-id')).toEqual([]);
  });

  it('requires a slug', () => {
    expect(splitProblems([row({ id: '' })], 'other-id')[0]?.message).toMatch(/slug/i);
  });

  /**
   * The original is archived in the same write that creates the new rows.
   * A new listing reusing its slug would be that write touching one
   * document twice — once to create it, once to archive it.
   */
  it('refuses a new row that reuses the original\'s own slug', () => {
    const problems = splitProblems([row({ id: 'apple-iphone-8' })], 'apple-iphone-8');
    expect(problems[0]?.message).toMatch(/being archived/i);
  });

  it('refuses two colours sharing one slug, naming the one it collides with', () => {
    const rows = [
      row({ colour: 'Blue', id: 'same-slug' }),
      row({ colour: 'Silver', id: 'same-slug' }),
    ];
    const problems = splitProblems(rows, 'other-id');
    expect(problems).toHaveLength(1);
    expect(problems[0].index).toBe(1);
    expect(problems[0].message).toContain('Blue');
  });

  it('reports every row independently, not just the first problem found', () => {
    const rows = [row({ stock: '' }), row({ colour: 'Silver', id: '' })];
    const problems = splitProblems(rows, 'other-id');
    expect(problems.map(p => p.index).sort()).toEqual([0, 1]);
  });
});

describe('parsedSplitRows', () => {
  it('trims and converts to numbers', () => {
    expect(parsedSplitRows([row({ stock: ' 3 ', id: ' apple-iphone-8-blue ' })]))
      .toEqual([{ colour: 'Blue', id: 'apple-iphone-8-blue', stock: 3 }]);
  });
});

describe('totalSplitStock', () => {
  it('sums what has been entered so far', () => {
    expect(totalSplitStock([row({ stock: '2' }), row({ stock: '1' })])).toBe(3);
  });

  /**
   * A reference line under a half-filled form must not throw or show NaN —
   * it is shown while the person is still typing.
   */
  it('ignores rows not yet filled in rather than propagating NaN', () => {
    expect(totalSplitStock([row({ stock: '2' }), row({ stock: '' })])).toBe(2);
    expect(totalSplitStock([row({ stock: 'two' })])).toBe(0);
  });
});
