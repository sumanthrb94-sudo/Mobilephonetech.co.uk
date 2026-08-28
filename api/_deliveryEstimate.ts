/**
 * When a parcel will arrive, shared by the delivery quote and the order emails.
 *
 * One estimator, used in both places, on purpose. The date a customer is shown
 * at checkout and the date the confirmation email leads with have to be the
 * same date — two estimators that drifted apart would produce "Thursday" on
 * screen and "Friday" in the inbox, which reads as a broken promise and
 * arrives at support as one.
 */

/** UK postcode prefix → { region, baseDeliveryDays } */
export const UK_DELIVERY_MAP: Record<string, { region: string; days: number }> = {
  // London — next-day guaranteed
  EC: { region: 'Central London', days: 1 }, WC: { region: 'Central London', days: 1 },
  E:  { region: 'East London',    days: 1 }, N:  { region: 'North London',   days: 1 },
  NW: { region: 'North London',   days: 1 }, SE: { region: 'South London',   days: 1 },
  SW: { region: 'South London',   days: 1 }, W:  { region: 'West London',    days: 1 },
  // Greater London & South East
  BR: { region: 'Bromley',     days: 1 }, CR: { region: 'Croydon',    days: 1 },
  DA: { region: 'Dartford',    days: 1 }, EN: { region: 'Enfield',    days: 1 },
  HA: { region: 'Harrow',      days: 1 }, IG: { region: 'Ilford',     days: 1 },
  KT: { region: 'Kingston',    days: 1 }, RM: { region: 'Romford',    days: 1 },
  SM: { region: 'Sutton',      days: 1 }, TW: { region: 'Twickenham', days: 1 },
  UB: { region: 'Uxbridge',    days: 1 }, WD: { region: 'Watford',    days: 1 },
  // Major English cities
  M:  { region: 'Manchester',  days: 1 }, B:  { region: 'Birmingham', days: 1 },
  LS: { region: 'Leeds',       days: 1 }, S:  { region: 'Sheffield',  days: 1 },
  L:  { region: 'Liverpool',   days: 1 }, BS: { region: 'Bristol',    days: 1 },
  NG: { region: 'Nottingham',  days: 1 }, LE: { region: 'Leicester',  days: 1 },
  NE: { region: 'Newcastle',   days: 1 }, CV: { region: 'Coventry',   days: 2 },
  // Scotland
  G:  { region: 'Glasgow',     days: 2 }, EH: { region: 'Edinburgh',  days: 2 },
  AB: { region: 'Aberdeen',    days: 2 }, DD: { region: 'Dundee',     days: 2 },
  IV: { region: 'Inverness',   days: 3 }, HS: { region: 'Hebrides',   days: 3 },
  ZE: { region: 'Shetland',    days: 4 }, KW: { region: 'Orkney',     days: 4 },
  // Wales
  CF: { region: 'Cardiff',     days: 1 }, SA: { region: 'Swansea',    days: 2 },
  LL: { region: 'Llandudno',   days: 2 }, NP: { region: 'Newport',    days: 2 },
  // Northern Ireland
  BT: { region: 'Belfast',     days: 3 },
};

export const CUTOFF_HOUR = 14; // 2 PM

/** Weekends are not delivery days, so they do not count toward the estimate. */
export function addWorkdays(from: Date, days: number): Date {
  const d = new Date(from);
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) added++;
  }
  return d;
}

/** "Thursday 4 Sep" — the form the emails lead with. */
export function formatDate(d: Date): string {
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' });
}

/** The letters before the first digit: "SE1 3TX" → "SE". */
export function areaOf(postcode: unknown): string {
  return String(postcode ?? '').trim().toUpperCase().match(/^([A-Z]{1,2})/)?.[1] ?? '';
}

export function regionFor(postcode: unknown): string {
  return (UK_DELIVERY_MAP[areaOf(postcode)] ?? { region: 'UK', days: 2 }).region;
}

/** Working days added by the chosen service, over and above the base transit. */
const SERVICE_ADJUSTMENT: Record<string, (base: number) => number> = {
  nextday: () => 1,
  next_day: () => 1,
  express: (base) => Math.max(1, base - 1),
  standard: (base) => base,
};

/**
 * The arrival date to put at the top of an order email.
 *
 * Returns null rather than guessing when there is no usable postcode — an
 * invented date is worse than none, because the customer will hold you to it.
 * The caller falls back to the order number as the headline in that case.
 */
export function estimateArrival(opts: {
  postcode?: unknown;
  /** The stored shippingMethod, e.g. "Express Delivery" or "standard". */
  shippingMethod?: unknown;
  /** Defaults to now; pass the order's createdAt to date it from the order. */
  from?: Date | string;
}): { date: Date; label: string; region: string } | null {
  const area = areaOf(opts.postcode);
  if (!area || !UK_DELIVERY_MAP[area]) return null;

  const { region, days: base } = UK_DELIVERY_MAP[area];

  // Strip everything but letters before matching. Removing only the word
  // "delivery" left "Next Day Delivery" as "next day", which matched no key at
  // all and silently fell through to standard — a next-day order quoted, and
  // then delivered, a day late.
  const method = String(opts.shippingMethod ?? '').toLowerCase().replace(/[^a-z]/g, '');
  const key = Object.keys(SERVICE_ADJUSTMENT).find((k) => method.includes(k.replace('_', ''))) ?? 'standard';
  let days = SERVICE_ADJUSTMENT[key](base);

  const from = opts.from ? new Date(opts.from) : new Date();
  if (Number.isNaN(from.getTime())) return null;

  // Ordered after the 2pm cut-off, so picking and packing starts the next
  // working day. Quoting today's cut-off to someone who missed it is the
  // single easiest way to be a day late on your own promise.
  if (from.getHours() >= CUTOFF_HOUR) days += 1;

  const date = addWorkdays(from, days);
  return { date, label: formatDate(date), region };
}
