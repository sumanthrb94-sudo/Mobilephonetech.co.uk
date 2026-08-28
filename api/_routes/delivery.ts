/**
 * Delivery options and dates for a postcode.
 *
 * The map and the workday arithmetic live in api/_deliveryEstimate.ts so the
 * order emails quote the same date this quotes. Two copies that drifted apart
 * would show one day at checkout and another in the inbox.
 */
import { UK_DELIVERY_MAP, CUTOFF_HOUR, addWorkdays, formatDate } from '../_deliveryEstimate.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const postcode = (req.query?.postcode ?? '').toString().trim().toUpperCase();
  if (!postcode) {
    return res.status(400).json({ error: 'postcode is required' });
  }

  // Basic UK postcode format check
  const UK_RE = /^[A-Z]{1,2}\d[A-Z\d]?(\s*\d[A-Z]{2})?$/i;
  if (!UK_RE.test(postcode.replace(/\s/g, ''))) {
    return res.status(400).json({ error: 'Invalid UK postcode format' });
  }

  // Extract area code (letters before first digit)
  const areaMatch = postcode.match(/^([A-Z]{1,2})/);
  const area = areaMatch?.[1] ?? '';
  const location = UK_DELIVERY_MAP[area] ?? { region: 'UK', days: 2 };

  const now = new Date();
  const hour = now.getHours();
  const orderBeforeCutoff = hour < CUTOFF_HOUR;

  /**
   * Typed explicitly: an empty literal infers as never[], so every push below
   * was an error the moment api/ was brought under tsc. `available` is only
   * present on next-day, hence optional.
   */
  const options: Array<{
    id: string;
    name: string;
    price: number;
    estimatedDate: string;
    displayDate: string;
    cutoffNote: string | null;
    available?: boolean;
  }> = [];

  // Standard (free)
  const stdDays = location.days;
  const stdDate = addWorkdays(now, stdDays);
  options.push({
    id: 'standard',
    name: 'Standard Delivery',
    price: 0,
    estimatedDate: stdDate.toISOString().split('T')[0],
    displayDate: formatDate(stdDate),
    cutoffNote: null,
  });

  // Express (£9.99) — 1 workday faster, min 1 day
  const expDays = Math.max(1, stdDays - 1);
  const expDate = addWorkdays(now, expDays);
  options.push({
    id: 'express',
    name: 'Express Delivery',
    price: 9.99,
    estimatedDate: expDate.toISOString().split('T')[0],
    displayDate: formatDate(expDate),
    cutoffNote: 'Order before 2 PM for same-day dispatch',
  });

  // Next-day (£19.99) — only if before cutoff and not remote islands
  if (location.days <= 2) {
    const ndDate = addWorkdays(now, 1);
    options.push({
      id: 'next_day',
      name: 'Next Day Delivery',
      price: 19.99,
      estimatedDate: ndDate.toISOString().split('T')[0],
      displayDate: formatDate(ndDate),
      cutoffNote: orderBeforeCutoff
        ? null
        : 'Order after 2 PM — dispatches tomorrow for next-day delivery',
      available: orderBeforeCutoff,
    });
  }

  return res.status(200).json({
    postcode,
    region: location.region,
    options,
  });
}
