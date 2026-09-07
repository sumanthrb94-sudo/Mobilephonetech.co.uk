import { describe, it, expect } from 'vitest';
import { previewModeFrom, PREVIEW_MESSAGE } from '../../config/preview';

/**
 * Preview mode decides whether the shop can take money, so the parsing rule
 * matters more than it looks. One variable drives both the banner and the
 * order route; if the two ever read it differently, the banner says one thing
 * while checkout does another.
 */
describe('reading the switch', () => {
  it('is off when unset, so a missing variable never freezes production', () => {
    expect(previewModeFrom(undefined)).toBe(false);
    expect(previewModeFrom('')).toBe(false);
    expect(previewModeFrom('   ')).toBe(false);
  });

  it('is off for the words people mean by off', () => {
    for (const value of ['0', 'false', 'off', 'no', 'FALSE', 'Off']) {
      expect(previewModeFrom(value)).toBe(false);
    }
  });

  it('is on for anything else once set', () => {
    for (const value of ['1', 'true', 'on', 'yes', 'ON', 'preview']) {
      expect(previewModeFrom(value)).toBe(true);
    }
  });

  it('treats a typo as on rather than off', () => {
    // Failing towards refusing orders is the cheap mistake. Failing towards
    // taking them is a real order with no payment behind it.
    expect(previewModeFrom('tru')).toBe(true);
    expect(previewModeFrom('ture')).toBe(true);
  });

  it('says what it is rather than only that something is wrong', () => {
    expect(PREVIEW_MESSAGE).toMatch(/preview/i);
    expect(PREVIEW_MESSAGE).toMatch(/checkout|orders/i);
  });
});
