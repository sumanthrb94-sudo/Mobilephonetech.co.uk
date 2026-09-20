/**
 * postcodeLookup — a real UK postcode lookup, against postcodes.io.
 *
 * WHAT THIS REPLACED, AND WHY
 *
 * The old version was a table mapping the alphabetic prefix of a postcode to
 * a representative city and a plausible-sounding street, so the demo "felt
 * like a real PAF query". It invented an address. Type SW1A 1AA and it
 * confidently filled in a street nobody lives on, which is worse than an
 * empty form: an empty form is obviously yours to fill, and a filled one
 * invites you to trust it and move on.
 *
 * WHAT THIS CAN AND CANNOT DO — read before promising a customer anything
 *
 * postcodes.io (MIT, no key, no quota) is built on ONS open data. Give it a
 * postcode and it returns where that postcode IS: town, district, county,
 * region, and coordinates. That is real and worth having — it validates what
 * was typed, fills the town and county, and gives a map a place to point.
 *
 * It does NOT return a list of the houses at that postcode, because that
 * list is the Royal Mail Postcode Address File and PAF is licensed. Loqate,
 * getAddress.io and Ideal Postcodes all resell it; none of them is free and
 * none of them is open. So there is no "pick your address from the dropdown"
 * here, and there cannot be one without paying for PAF. The shopper types
 * their house number and street; everything else is filled for them and
 * checked against the real postcode database.
 *
 * FAILURE IS ORDINARY HERE
 *
 * A checkout must not depend on someone else's API being up. Every failure —
 * a bad postcode, a 500, a dropped connection, a blocked request — resolves
 * to a typed result the caller can act on, never a throw, and the form stays
 * exactly as usable as it was before anyone pressed the button.
 */

const ENDPOINT = 'https://api.postcodes.io/postcodes/';

/** Loose enough to catch typing, strict enough to skip a pointless request. */
const UK_POSTCODE_RE = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i;

/**
 * A postcode in the shape Royal Mail writes it: upper case, exactly one
 * space before the final three characters.
 *
 * The inward code is always three characters, so the split is counted from
 * the END — "SW1A1AA" and "M11AE" have different outward lengths and a
 * rule counted from the front gets one of them wrong.
 */
export function normalisePostcode(raw: string): string {
  const compact = (raw ?? '').replace(/\s+/g, '').toUpperCase();
  if (compact.length < 5) return compact;
  return `${compact.slice(0, -3)} ${compact.slice(-3)}`;
}

export interface PostcodePlace {
  /** Normalised as the database holds it, e.g. "NW1 6XE". */
  postcode: string;
  /** Best available town/city name. */
  town: string;
  /** County where one exists — many urban postcodes have none. */
  county: string;
  latitude: number;
  longitude: number;
}

export type PostcodeLookupResult =
  | { ok: true; place: PostcodePlace }
  | { ok: false; reason: 'malformed' | 'not-found' | 'unavailable'; message: string };

/**
 * ONS gives several names for where somewhere is and leaves the ones that do
 * not apply null — a London postcode has no admin_county, a rural one may
 * have no parish. Take the first that is actually populated rather than
 * printing "null" at a customer.
 */
function firstPresent(...values: Array<string | null | undefined>): string {
  for (const v of values) {
    if (typeof v === 'string' && v.trim() && v.trim().toLowerCase() !== 'null') return v.trim();
  }
  return '';
}

export async function lookupPostcode(raw: string): Promise<PostcodeLookupResult> {
  const trimmed = (raw ?? '').trim();
  if (!trimmed) {
    return { ok: false, reason: 'malformed', message: 'Enter a postcode to look up.' };
  }
  if (!UK_POSTCODE_RE.test(trimmed)) {
    return { ok: false, reason: 'malformed', message: `"${trimmed}" is not a UK postcode.` };
  }

  let res: Response;
  try {
    res = await fetch(ENDPOINT + encodeURIComponent(trimmed), {
      headers: { accept: 'application/json' },
    });
  } catch {
    // Offline, blocked, CSP, DNS — all the same to the shopper, and all
    // recoverable by typing the address out.
    return {
      ok: false,
      reason: 'unavailable',
      message: 'Could not reach the postcode service. Please enter your address below.',
    };
  }

  if (res.status === 404) {
    return { ok: false, reason: 'not-found', message: `We could not find ${normalisePostcode(trimmed)}.` };
  }
  if (!res.ok) {
    return {
      ok: false,
      reason: 'unavailable',
      message: 'The postcode service is not responding. Please enter your address below.',
    };
  }

  let body: unknown;
  try {
    body = await res.json();
  } catch {
    return {
      ok: false,
      reason: 'unavailable',
      message: 'The postcode service returned something unreadable. Please enter your address below.',
    };
  }

  const result = (body as { result?: Record<string, unknown> })?.result;
  if (!result || typeof result !== 'object') {
    return { ok: false, reason: 'not-found', message: `We could not find ${normalisePostcode(trimmed)}.` };
  }

  /* Number(null) is 0, and 0 is finite — so coercing straight from the
     response turns "this postcode has no centroid" into the Gulf of Guinea
     and draws a map of the Atlantic under a London address. Anything that is
     not already a number is no coordinate at all. */
  const asCoord = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : NaN);
  const lat = asCoord(result.latitude);
  const lon = asCoord(result.longitude);

  return {
    ok: true,
    place: {
      postcode: firstPresent(result.postcode as string) || normalisePostcode(trimmed),
      town: firstPresent(
        result.post_town as string,
        result.admin_district as string,
        result.parish as string,
        result.admin_ward as string,
      ),
      county: firstPresent(
        result.admin_county as string,
        result.region as string,
        result.country as string,
      ),
      // A postcode with no coordinates is rare but real (some are centroid-less).
      // NaN here means "do not draw a map", not "the lookup failed".
      latitude: lat,
      longitude: lon,
    },
  };
}

/** Whether a place has coordinates worth pointing a map at. */
export function hasCoordinates(place: PostcodePlace): boolean {
  return Number.isFinite(place.latitude) && Number.isFinite(place.longitude);
}
