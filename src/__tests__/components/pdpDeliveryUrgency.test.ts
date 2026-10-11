import { describe, it, expect } from 'vitest';
import { DELIVERY_CUTOFF, DELIVERY_HEADLINE } from '../../lib/deliveryCopy';

// The product page counted down to the next dispatch ("order within 27h 31m
// for dispatch tomorrow"). It now states the promise and the cut-off plainly,
// and must keep matching the delivery policy.
describe('delivery promise copy', () => {
  it('states free next-day delivery and the 4pm weekday cut-off', () => {
    expect(DELIVERY_HEADLINE).toMatch(/free next-day delivery/i);
    expect(DELIVERY_HEADLINE).toMatch(/mainland UK/);
    expect(DELIVERY_CUTOFF).toBe('Order before 4pm (Mon–Fri) for next-day delivery');
  });
  it('has no countdown', () => {
    expect(`${DELIVERY_HEADLINE} ${DELIVERY_CUTOFF}`).not.toMatch(/\d+h \d+m|order within/i);
  });
});
