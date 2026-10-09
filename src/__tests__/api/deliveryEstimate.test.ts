import { describe, it, expect } from 'vitest';
import { estimateArrival, regionFor, addWorkdays, ukClock, dispatchesSameDay } from '../../../api/_deliveryEstimate.js';

/**
 * The date these produce is now the headline of the order emails, so being
 * wrong is not a cosmetic problem — it is a promise the shop then misses.
 *
 * Fixed dates throughout. An estimator tested against `new Date()` passes on a
 * Tuesday and fails on a Friday, which is the worst kind of flake: it only
 * appears once the weekend logic actually matters.
 */

// UK times, written with their offset (August is BST, +01:00) so the suite
// means the same thing on a UTC server as on a laptop in London.
// 2026-08-25 is a Tuesday. 10:00 is before the 16:00 cut-off.
const TUE_MORNING = new Date('2026-08-25T10:00:00+01:00');
const TUE_3PM = new Date('2026-08-25T15:00:00+01:00');
const TUE_AFTERNOON = new Date('2026-08-25T16:30:00+01:00');
// 2026-08-28 is a Friday.
const FRI_MORNING = new Date('2026-08-28T10:00:00+01:00');

describe('addWorkdays', () => {
  it('steps over the weekend', () => {
    // Friday + 1 working day is Monday, not Saturday.
    expect(addWorkdays(FRI_MORNING, 1).getDay()).toBe(1);
  });

  it('never lands on a Saturday or Sunday', () => {
    for (let d = 1; d <= 10; d++) {
      const day = addWorkdays(FRI_MORNING, d).getDay();
      expect(day).not.toBe(0);
      expect(day).not.toBe(6);
    }
  });
});

describe('estimateArrival', () => {
  it('gives next working day for a London postcode ordered before the cut-off', () => {
    const est = estimateArrival({ postcode: 'SE1 3TX', shippingMethod: 'Free Next-Day Delivery', from: TUE_MORNING });
    expect(est?.label).toBe('Wednesday 26 Aug');
    expect(est?.region).toBe('South London');
  });

  it('keeps the next-day promise for a 3pm order — the cut-off is 4pm', () => {
    // It was 2pm here while every page said "order before 4pm".
    const est = estimateArrival({ postcode: 'SE1 3TX', shippingMethod: 'Free Next-Day Delivery', from: TUE_3PM });
    expect(est?.label).toBe('Wednesday 26 Aug');
  });

  it('gives next working day across mainland UK, two days to the islands and Northern Ireland', () => {
    const at = (postcode: string) => estimateArrival({ postcode, shippingMethod: 'Free Next-Day Delivery', from: TUE_MORNING })!.label;
    expect(at('G1 1AA')).toBe('Wednesday 26 Aug');
    expect(at('CF10 1AA')).toBe('Wednesday 26 Aug');
    expect(at('BT1 1AA')).toBe('Thursday 27 Aug');
    expect(at('KW15 1AA')).toBe('Thursday 27 Aug');
  });

  it('treats an order with no stored method as next-day, the only service', () => {
    expect(estimateArrival({ postcode: 'SE1 3TX', from: TUE_MORNING })?.label).toBe('Wednesday 26 Aug');
  });

  it('dispatches a weekend order on Monday, so it arrives Tuesday', () => {
    const sat = estimateArrival({ postcode: 'SE1 3TX', from: new Date('2026-08-29T10:00:00+01:00') });
    expect(sat?.label).toBe('Tuesday 1 Sept');
  });

  it('adds a day when the order misses the 4pm cut-off', () => {
    const est = estimateArrival({ postcode: 'SE1 3TX', shippingMethod: 'Free Next-Day Delivery', from: TUE_AFTERNOON });
    // Picking starts the next working day, so Thursday rather than Wednesday.
    // Quoting the same date either side of the cut-off is how you are a day
    // late on your own promise.
    expect(est?.label).toBe('Thursday 27 Aug');
  });

  it('skips the weekend from a Friday afternoon order', () => {
    const est = estimateArrival({
      postcode: 'SE1 3TX', shippingMethod: 'Free Next-Day Delivery', from: new Date('2026-08-28T16:00:00+01:00'),
    });
    expect(est?.label).toBe('Tuesday 1 Sept');
  });

  it('is slower to the islands than to London', () => {
    const london = estimateArrival({ postcode: 'EC1A 1BB', from: TUE_MORNING })!;
    const orkney = estimateArrival({ postcode: 'KW15 1AA', from: TUE_MORNING })!;
    expect(orkney.date.getTime()).toBeGreaterThan(london.date.getTime());
    expect(orkney.region).toBe('Orkney');
  });

  it('still dates orders placed under the withdrawn standard and express services', () => {
    const at = (m: string) => estimateArrival({ postcode: 'IV1 1AA', shippingMethod: m, from: TUE_MORNING })!.date.getTime();
    // Old orders keep the service they were sold. Inverness is 3 days
    // standard, so the services actually differ there.
    expect(at('Express Delivery')).toBeLessThan(at('Standard Delivery'));
    // Two working days to the Highlands, as the delivery policy states.
    expect(at('Next Day Delivery')).toBeLessThanOrEqual(at('Express Delivery'));
  });

  it('returns null rather than inventing a date for an unknown postcode', () => {
    // A guessed date is worse than none: the customer will hold you to it, and
    // the caller falls back to the order number as its headline.
    expect(estimateArrival({ postcode: 'ZZ99 9ZZ', from: TUE_MORNING })).toBeNull();
    expect(estimateArrival({ postcode: '', from: TUE_MORNING })).toBeNull();
    expect(estimateArrival({ postcode: undefined, from: TUE_MORNING })).toBeNull();
  });

  it('returns null for an unparseable order date', () => {
    expect(estimateArrival({ postcode: 'SE1 3TX', from: 'not a date' })).toBeNull();
  });

  it('reads the area from a lowercase, unspaced postcode', () => {
    expect(regionFor('se13tx')).toBe('South London');
    expect(regionFor('  bt1 1aa ')).toBe('Belfast');
  });

  it('falls back to a generic region rather than throwing on junk', () => {
    expect(regionFor('!!!')).toBe('UK');
  });
});

describe('the 4pm cut-off is UK time, not the server clock', () => {
  it('reads 4.30pm BST as 16:00-something even when the instant is 15:30 UTC', () => {
    expect(ukClock(new Date('2026-08-25T15:30:00Z')).hour).toBe(16);
    expect(dispatchesSameDay(new Date('2026-08-25T15:30:00Z'))).toBe(false);
  });

  it('reads 3.30pm GMT in winter as before the cut-off', () => {
    expect(dispatchesSameDay(new Date('2026-12-01T15:30:00Z'))).toBe(true);
  });

  it('never dispatches the same day at the weekend', () => {
    expect(dispatchesSameDay(new Date('2026-08-29T09:00:00+01:00'))).toBe(false);
  });
});
