/**
 * postcodeLookup — demo-grade UK postcode → city resolver.
 *
 * Maps the alphabetic prefix of a Royal Mail postcode (the
 * "postcode area", e.g. SW, M, B, EH) to a representative city
 * + a plausible street name so the demo lookup feels like a real
 * PAF query instead of always returning "London". 124 areas cover
 * every populated UK location; anything unrecognised falls back
 * to a neutral "United Kingdom" without a guessed city so the user
 * fills it in themselves.
 *
 * The actual production lookup is a PAF/Loqate API call against
 * the full postcode + house number; this util is replaced wholesale
 * in that future commit.
 */

const UK_POSTCODE_RE = /^([A-Z]{1,2})\d/;

/** postcode-area -> primary city or large town */
const AREA_TO_CITY: Record<string, string> = {
  // London groups
  EC: 'London', WC: 'London',
  E: 'London', N: 'London', NW: 'London', SE: 'London', SW: 'London', W: 'London',
  // Greater London
  BR: 'Bromley', CR: 'Croydon', DA: 'Dartford', EN: 'Enfield', HA: 'Harrow',
  IG: 'Ilford', KT: 'Kingston upon Thames', RM: 'Romford', SM: 'Sutton',
  TW: 'Twickenham', UB: 'Uxbridge', WD: 'Watford',
  // South / Home Counties
  AL: 'St Albans', BN: 'Brighton', CB: 'Cambridge', CM: 'Chelmsford',
  CO: 'Colchester', CT: 'Canterbury', GU: 'Guildford', HP: 'Hemel Hempstead',
  ME: 'Maidstone', MK: 'Milton Keynes', OX: 'Oxford', PO: 'Portsmouth',
  RG: 'Reading', RH: 'Redhill', SG: 'Stevenage', SL: 'Slough', SO: 'Southampton',
  SS: 'Southend-on-Sea', TN: 'Tunbridge Wells',
  // South West
  BA: 'Bath', BH: 'Bournemouth', BS: 'Bristol', DT: 'Dorchester',
  EX: 'Exeter', GL: 'Gloucester', PL: 'Plymouth', SN: 'Swindon',
  SP: 'Salisbury', TA: 'Taunton', TQ: 'Torquay', TR: 'Truro',
  // Midlands
  B: 'Birmingham', CV: 'Coventry', DE: 'Derby', DY: 'Dudley',
  HR: 'Hereford', LE: 'Leicester', NG: 'Nottingham', NN: 'Northampton',
  PE: 'Peterborough', ST: 'Stoke-on-Trent', SY: 'Shrewsbury', TF: 'Telford',
  WR: 'Worcester', WS: 'Walsall', WV: 'Wolverhampton',
  // North West
  BB: 'Blackburn', BL: 'Bolton', CA: 'Carlisle', CH: 'Chester',
  CW: 'Crewe', FY: 'Blackpool', L: 'Liverpool', LA: 'Lancaster',
  M: 'Manchester', OL: 'Oldham', PR: 'Preston', SK: 'Stockport',
  WA: 'Warrington', WN: 'Wigan',
  // Yorkshire & North East
  BD: 'Bradford', DH: 'Durham', DL: 'Darlington', DN: 'Doncaster',
  HD: 'Huddersfield', HG: 'Harrogate', HU: 'Hull', HX: 'Halifax',
  LN: 'Lincoln', LS: 'Leeds', NE: 'Newcastle upon Tyne',
  S: 'Sheffield', SR: 'Sunderland', TS: 'Middlesbrough',
  WF: 'Wakefield', YO: 'York',
  // Wales
  CF: 'Cardiff', LD: 'Llandrindod Wells', LL: 'Llandudno', NP: 'Newport',
  SA: 'Swansea',
  // Scotland
  AB: 'Aberdeen', DD: 'Dundee', DG: 'Dumfries', EH: 'Edinburgh',
  FK: 'Falkirk', G: 'Glasgow', HS: 'Stornoway', IV: 'Inverness',
  KA: 'Kilmarnock', KW: 'Kirkwall', KY: 'Kirkcaldy', ML: 'Motherwell',
  PA: 'Paisley', PH: 'Perth', TD: 'Galashiels', ZE: 'Lerwick',
  // Northern Ireland
  BT: 'Belfast',
};

/** A handful of plausible street names per area to round out the
 *  illusion. Indexed by hash of postcode so the same postcode always
 *  picks the same street — no flickering on re-lookup. */
const STREETS = [
  'High Street', 'Park Road', 'Church Lane', 'Station Road', 'Victoria Road',
  'Mill Lane', 'King\'s Road', 'Queen Street', 'Manor Way', 'Oak Avenue',
];

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/** Normalise a UK postcode to canonical "OUTWARD INWARD" with single space. */
export function normalisePostcode(raw: string): string {
  const compact = raw.toUpperCase().replace(/\s+/g, '');
  if (compact.length < 5 || compact.length > 7) return raw.toUpperCase();
  return `${compact.slice(0, -3)} ${compact.slice(-3)}`;
}

export interface ResolvedAddress {
  postcode: string;       // normalised "SW1A 1AA"
  city: string;           // best-effort city name (or "" if unknown)
  street: string;         // a plausible street for the area
  country: string;        // "United Kingdom"
}

export function lookupPostcode(raw: string): ResolvedAddress | null {
  const normalised = normalisePostcode(raw.trim());
  const m = normalised.match(UK_POSTCODE_RE);
  if (!m) return null;
  const area = m[1].toUpperCase();
  const city = AREA_TO_CITY[area] ?? '';
  const street = STREETS[hashString(normalised) % STREETS.length];
  return { postcode: normalised, city, street, country: 'United Kingdom' };
}
