import { useEffect, useState } from 'react';
import { Truck } from 'lucide-react';
import { CUTOFF_HOUR, addWorkdays, dispatchesSameDay } from '../../api/_deliveryEstimate';

/**
 * Delivery, as one line: there is one service, so there is nothing to pick.
 *
 * Checkout used to offer Standard (free, 3-5 days), Express (£9.99) and Next
 * Day (£19.99) while the product page, the announcement bar and the delivery
 * policy all promised free next-day delivery. The shop now sells only that,
 * and this says so in the same words — with the dispatch day worked out from
 * the same 4pm UK cut-off the order emails date arrival from.
 */

/** "today", "tomorrow" or the weekday an order placed now is dispatched. */
export function dispatchLabel(now: Date): string {
  if (dispatchesSameDay(now)) return 'today';
  // Not today: the next working day (addWorkdays skips the weekend).
  const next = addWorkdays(now, 1);
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return next.toDateString() === tomorrow.toDateString()
    ? 'tomorrow'
    : next.toLocaleDateString('en-GB', { weekday: 'long' });
}

export default function DeliveryNote() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const day = dispatchLabel(now);
  const cutoff = `${CUTOFF_HOUR - 12}pm`;

  return (
    <div
      role="note"
      aria-label="Delivery"
      style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        minHeight: '48px', padding: '10px 14px', boxSizing: 'border-box',
        border: '1px solid var(--grey-20)', borderRadius: 'var(--radius-md)',
        background: 'var(--grey-5)',
      }}
    >
      <Truck size={18} aria-hidden="true" style={{ color: 'var(--color-trust-text)', flexShrink: 0 }} />
      <span style={{ flex: 1, minWidth: 0, fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--grey-60)', lineHeight: 1.4 }}>
        <strong style={{ color: 'var(--black)', fontWeight: 700 }}>Free next-day delivery</strong>
        {' — '}
        {day === 'today'
          ? <>order by {cutoff} for dispatch today</>
          : <>dispatched {day}</>}
      </span>
      <span style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', fontWeight: 800, color: 'var(--color-trust-text)', whiteSpace: 'nowrap' }}>FREE</span>
    </div>
  );
}
