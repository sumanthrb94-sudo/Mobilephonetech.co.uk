/**
 * Delivery options and dates for a postcode.
 *
 * The map and the workday arithmetic live in api/_deliveryEstimate.ts so the
 * order emails quote the same date this quotes. Two copies that drifted apart
 * would show one day at checkout and another in the inbox.
 */
import { UK_DELIVERY_MAP, CUTOFF_HOUR, addWorkdays, formatDate, estimateArrival, dispatchesSameDay } from '../_deliveryEstimate.js';

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

  /**
   * One service, as the checkout and api/_orderCore.ts sell it: free next-day.
   * This used to quote free standard, £9.99 express and £19.99 next-day with a
   * 2pm cut-off while every page promised free next-day before 4pm. The date
   * comes from estimateArrival, the same estimator the order emails use, so
   * the cut-off, weekends and the two-day areas (Northern Ireland, Highlands,
   * islands) are handled once.
   */
  const arrival = estimateArrival({ postcode, shippingMethod: 'next_day', from: now });
  const date = arrival?.date ?? addWorkdays(now, dispatchesSameDay(now) ? 1 : 2);
  const options: Array<{
    id: string;
    name: string;
    price: number;
    estimatedDate: string;
    displayDate: string;
    cutoffNote: string | null;
  }> = [{
    id: 'next_day',
    name: 'Free Next-Day Delivery',
    price: 0,
    estimatedDate: date.toISOString().split('T')[0],
    displayDate: formatDate(date),
    cutoffNote: dispatchesSameDay(now)
      ? `Order before ${CUTOFF_HOUR - 12}pm for dispatch today`
      : 'Dispatched next working day',
  }];

  return res.status(200).json({
    postcode,
    region: location.region,
    options,
  });
}
