import { useState, useEffect } from 'react';
import { Truck } from 'lucide-react';

/** Next dispatch cut-off: 16:00 on a working day. */
function nextCutoff(now: Date): Date {
  const cutoff = new Date(now);
  cutoff.setHours(16, 0, 0, 0);
  if (now > cutoff) cutoff.setDate(cutoff.getDate() + 1);
  if (cutoff.getDay() === 6) cutoff.setDate(cutoff.getDate() + 2);
  if (cutoff.getDay() === 0) cutoff.setDate(cutoff.getDate() + 1);
  return cutoff;
}

/** "today", "tomorrow" or the weekday the next cut-off falls on. */
export function dispatchDay(now: Date, cutoff: Date): string {
  const days = Math.round((new Date(cutoff).setHours(0, 0, 0, 0) - new Date(now).setHours(0, 0, 0, 0)) / 86_400_000);
  if (days <= 0) return 'today';
  if (days === 1) return 'tomorrow';
  return cutoff.toLocaleDateString('en-GB', { weekday: 'long' });
}

/**
 * One line: when it ships and how long is left to make that dispatch. It used
 * to say "Dispatch today" at any hour, beside a countdown to tomorrow's
 * cut-off, and sat above a second, larger delivery card saying it again.
 */
export default function PdpDeliveryUrgency() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const cutoff = nextCutoff(now);
  const diff = Math.max(0, cutoff.getTime() - now.getTime());
  const hours = Math.floor(diff / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  const day = dispatchDay(now, cutoff);

  return (
    <p className="pdp-delivery-urgency">
      <Truck size={16} aria-hidden="true" />
      <span>
        <strong>Free next-day delivery</strong>
        {' · '}order within <strong>{hours}h {minutes}m</strong> for dispatch {day}
      </span>
    </p>
  );
}
