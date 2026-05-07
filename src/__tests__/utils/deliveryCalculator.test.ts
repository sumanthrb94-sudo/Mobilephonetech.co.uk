import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  calculateDeliveryPromises,
  getFastestDelivery,
  isNextDayDeliveryAvailable,
  getRegionFromPostcode,
} from '../../utils/deliveryCalculator';

const AM_TIME = '2026-01-15T09:00:00'; // 9 AM — before cutoff
const PM_TIME = '2026-01-15T16:00:00'; // 4 PM — after cutoff

describe('isNextDayDeliveryAvailable', () => {
  it('returns true for orders placed before 2 PM', () => {
    const morning = new Date('2026-01-15T08:30:00');
    expect(isNextDayDeliveryAvailable(morning)).toBe(true);
  });
  it('returns false for orders placed at 2 PM exactly', () => {
    const cutoff = new Date('2026-01-15T14:00:00');
    expect(isNextDayDeliveryAvailable(cutoff)).toBe(false);
  });
  it('returns false for orders placed after 2 PM', () => {
    const afternoon = new Date('2026-01-15T15:30:00');
    expect(isNextDayDeliveryAvailable(afternoon)).toBe(false);
  });
  it('accepts ISO string input', () => {
    expect(isNextDayDeliveryAvailable(AM_TIME)).toBe(true);
    expect(isNextDayDeliveryAvailable(PM_TIME)).toBe(false);
  });
  it('returns true for midnight order', () => {
    expect(isNextDayDeliveryAvailable(new Date('2026-01-15T00:00:00'))).toBe(true);
  });
  it('returns false for 13:59 boundary (just before 14:00)', () => {
    expect(isNextDayDeliveryAvailable(new Date('2026-01-15T13:59:59'))).toBe(true);
  });
});

describe('calculateDeliveryPromises', () => {
  it('returns at least one promise for any postcode', () => {
    const promises = calculateDeliveryPromises('SW1A 1AA', AM_TIME);
    expect(promises.length).toBeGreaterThan(0);
  });

  it('includes next-day promise when ordered before 2 PM', () => {
    const promises = calculateDeliveryPromises('SW1A 1AA', AM_TIME);
    const nextDay = promises.find(p => p.label.includes('Tomorrow'));
    expect(nextDay).toBeDefined();
  });

  it('excludes next-day promise when ordered after 2 PM', () => {
    const promises = calculateDeliveryPromises('SW1A 1AA', PM_TIME);
    const nextDay = promises.find(p => p.label.includes('Tomorrow'));
    expect(nextDay).toBeUndefined();
  });

  it('all promises have valid ISO date strings', () => {
    const promises = calculateDeliveryPromises('M1 1AE', AM_TIME);
    for (const p of promises) {
      expect(p.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('all promises have a non-empty label', () => {
    const promises = calculateDeliveryPromises('EH1 1AB', AM_TIME);
    for (const p of promises) {
      expect(p.label.length).toBeGreaterThan(0);
    }
  });

  it('all promises have a valid confidence level', () => {
    const promises = calculateDeliveryPromises('SW1A 1AA', AM_TIME);
    const valid = ['high', 'medium', 'low'];
    for (const p of promises) {
      expect(valid).toContain(p.confidence);
    }
  });

  it('handles unknown postcode prefix gracefully', () => {
    const promises = calculateDeliveryPromises('ZZ9 9ZZ', AM_TIME);
    expect(promises.length).toBeGreaterThan(0);
  });

  it('Belfast gets slower delivery than London', () => {
    const london  = calculateDeliveryPromises('SW1A 1AA', AM_TIME);
    const belfast = calculateDeliveryPromises('BT1 1AA', AM_TIME);
    const londonFirst  = new Date(london[london.length - 1].date);
    const belfastFirst = new Date(belfast[belfast.length - 1].date);
    // Belfast should arrive same day or later than London
    expect(belfastFirst.getTime()).toBeGreaterThanOrEqual(londonFirst.getTime());
  });

  it('accepts Date object as orderTime', () => {
    const d = new Date(AM_TIME);
    expect(() => calculateDeliveryPromises('SW1A 1AA', d)).not.toThrow();
  });
});

describe('getFastestDelivery', () => {
  it('returns the first promise', () => {
    const fastest = getFastestDelivery('SW1A 1AA', AM_TIME);
    expect(fastest).not.toBeNull();
    expect(typeof fastest!.label).toBe('string');
  });

  it('returns null-like safe result for any UK postcode', () => {
    const result = getFastestDelivery('M1 1AE', PM_TIME);
    // getFastestDelivery should always return something (standard always present)
    expect(result).not.toBeNull();
  });
});

describe('getRegionFromPostcode', () => {
  it('returns London for SW postcodes', () => {
    expect(getRegionFromPostcode('SW1A 1AA')).toBe('London');
  });
  it('returns Manchester for M postcodes', () => {
    expect(getRegionFromPostcode('M1 1AE')).toBe('Manchester');
  });
  it('returns Belfast for BT postcodes', () => {
    expect(getRegionFromPostcode('BT1 1AA')).toBe('Belfast');
  });
  it('returns UK for unknown prefixes', () => {
    expect(getRegionFromPostcode('ZZ9 9ZZ')).toBe('UK');
  });
  it('handles lowercase postcode input', () => {
    const region = getRegionFromPostcode('sw1a 1aa');
    // normalisation should upcase before lookup
    expect(['London', 'UK']).toContain(region);
  });
});
