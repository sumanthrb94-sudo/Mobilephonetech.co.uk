import { describe, it, expect } from 'vitest';
import { dispatchDay } from '../../components/pdp/PdpDeliveryUrgency';

// The delivery line said "Dispatch today" at any hour, even after the 4pm
// cut-off, beside a countdown to the next working day's.
describe('dispatch day on the product page', () => {
  it('is today before the cut-off', () => {
    expect(dispatchDay(new Date(2026, 9, 8, 10), new Date(2026, 9, 8, 16))).toBe('today');
  });
  it('is tomorrow after the cut-off on a weekday', () => {
    expect(dispatchDay(new Date(2026, 9, 8, 18), new Date(2026, 9, 9, 16))).toBe('tomorrow');
  });
  it('names the weekday after a weekend', () => {
    // Friday evening -> Monday's cut-off.
    expect(dispatchDay(new Date(2026, 9, 9, 18), new Date(2026, 9, 12, 16))).toBe('Monday');
  });
});
