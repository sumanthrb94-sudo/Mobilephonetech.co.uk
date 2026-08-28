// UK postcode prefix → { region, baseDeliveryDays }
const UK_DELIVERY_MAP: Record<string, { region: string; days: number }> = {
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

const CUTOFF_HOUR = 14; // 2 PM

function addWorkdays(from: Date, days: number): Date {
  const d = new Date(from);
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) added++; // skip weekends
  }
  return d;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' });
}

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
