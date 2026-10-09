/**
 * address — the one place that knows how a delivery address is shaped.
 *
 * WHY THIS EXISTS
 *
 * The same address lived in three shapes that never met. Checkout wrote
 * `{ addressLine1, city, postalCode }` into the order and into localStorage;
 * My Account read `users/{uid}.address` as `{ line1, city, postcode }`; and
 * nothing ever wrote the second from the first. So a customer who had
 * checked out ten times opened Addresses and found four boxes saying
 * "Not set". Every conversion between the two shapes now goes through here,
 * where it can be tested, instead of being retyped inline in each screen.
 *
 * Pure functions only — no Firestore, no React — so the mapping is proved
 * by unit tests rather than by squinting at a form.
 */

/**
 * Where the customer put the pin. `pinned` is false while it is still the
 * postcode's own centre point and true once they have dragged or tapped it,
 * so staff can tell "this is the door" from "this is roughly the street".
 */
export interface GeoPin {
  lat: number;
  lng: number;
  pinned: boolean;
}

/** The address part of a shipping address, in checkout's field names. */
export interface AddressDraft {
  addressLine1: string;
  addressLine2: string;
  city: string;
  postalCode: string;
  country: string;
  location: GeoPin | null;
}

/** As stored on the profile, `users/{uid}.address`. Keys match firestore.rules. */
export interface ProfileAddress {
  line1: string;
  line2: string;
  city: string;
  postcode: string;
  country: string;
  location?: GeoPin | null;
}

export const DEFAULT_COUNTRY = 'United Kingdom';

/** Field limits, shared with firestore.rules and api/_orderCore.ts. */
export const ADDRESS_LIMITS = { line: 200, city: 100, postcode: 20, country: 100 } as const;

export const EMPTY_ADDRESS: AddressDraft = {
  addressLine1: '', addressLine2: '', city: '', postalCode: '', country: DEFAULT_COUNTRY, location: null,
};

const str = (v: unknown, max: number): string =>
  (typeof v === 'string' ? v.trim() : '').slice(0, max);

/**
 * A postcode as Royal Mail writes it. Kept here rather than imported from
 * postcodeLookup so this module stays free of anything that fetches.
 */
function tidyPostcode(raw: string): string {
  const compact = raw.replace(/\s+/g, '').toUpperCase();
  if (compact.length < 5) return compact;
  return `${compact.slice(0, -3)} ${compact.slice(-3)}`;
}

/**
 * A pin, or null — never a half-valid one.
 *
 * Rounded to six decimal places (about 10cm), which is finer than any door
 * and stops float noise from Leaflet making two identical saves look
 * different. Out-of-range or non-numeric coordinates are dropped rather than
 * clamped: a clamped pin is a confident wrong place.
 */
export function sanitiseLocation(raw: unknown): GeoPin | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const lat = typeof r.lat === 'number' ? r.lat : NaN;
  const lng = typeof r.lng === 'number' ? r.lng : NaN;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  const round = (n: number) => Math.round(n * 1e6) / 1e6;
  return { lat: round(lat), lng: round(lng), pinned: r.pinned === true };
}

/** Checkout's address → the profile's shape, trimmed and capped. */
export function toProfileAddress(a: Partial<AddressDraft>): ProfileAddress {
  return {
    line1: str(a.addressLine1, ADDRESS_LIMITS.line),
    line2: str(a.addressLine2, ADDRESS_LIMITS.line),
    city: str(a.city, ADDRESS_LIMITS.city),
    postcode: tidyPostcode(str(a.postalCode, ADDRESS_LIMITS.postcode)),
    country: str(a.country, ADDRESS_LIMITS.country) || DEFAULT_COUNTRY,
    location: sanitiseLocation(a.location),
  };
}

/**
 * Anything that might be a stored address → checkout's shape, or null when
 * there is no street to deliver to.
 *
 * Accepts both shapes on purpose: the profile's `{ line1, postcode }` and an
 * order's `{ addressLine1, postalCode }`. An order is where every address a
 * customer ever actually used still lives, so it is the fallback for anyone
 * who checked out before the profile was being written.
 */
export function fromStoredAddress(raw: unknown): AddressDraft | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const draft: AddressDraft = {
    addressLine1: str(r.line1 ?? r.addressLine1, ADDRESS_LIMITS.line),
    addressLine2: str(r.line2 ?? r.addressLine2, ADDRESS_LIMITS.line),
    city: str(r.city, ADDRESS_LIMITS.city),
    postalCode: tidyPostcode(str(r.postcode ?? r.postalCode, ADDRESS_LIMITS.postcode)),
    country: str(r.country, ADDRESS_LIMITS.country) || DEFAULT_COUNTRY,
    location: sanitiseLocation(r.location),
  };
  return isAddressEmpty(draft) ? null : draft;
}

/** No street and no postcode means nothing worth showing or saving. */
export function isAddressEmpty(a: Partial<AddressDraft> | null | undefined): boolean {
  return !a || (!str(a.addressLine1, 1) && !str(a.postalCode, 1));
}

/**
 * Whether saving `next` over `prev` would change anything a person can see
 * or a courier can use. Lets checkout skip a profile write on every repeat
 * order to the same door.
 */
export function sameAddress(prev: Partial<AddressDraft> | null | undefined, next: Partial<AddressDraft> | null | undefined): boolean {
  if (!prev || !next) return !prev && !next;
  const a = toProfileAddress(prev);
  const b = toProfileAddress(next);
  const pin = (p?: GeoPin | null) => (p ? `${p.lat},${p.lng},${p.pinned}` : '');
  return a.line1.toLowerCase() === b.line1.toLowerCase()
    && a.line2.toLowerCase() === b.line2.toLowerCase()
    && a.city.toLowerCase() === b.city.toLowerCase()
    && a.postcode === b.postcode
    && a.country === b.country
    && pin(a.location) === pin(b.location);
}

/**
 * The address as the lines of an envelope: street, flat, then
 * "Town POSTCODE" on one line, as Royal Mail prefers. The country is left
 * off for UK addresses — every one of them is.
 */
export function formatAddressLines(a: Partial<AddressDraft> | null | undefined): string[] {
  if (!a) return [];
  const p = toProfileAddress(a);
  const lastLine = [p.city, p.postcode].filter(Boolean).join(' ');
  return [
    p.line1,
    p.line2,
    lastLine,
    p.country && p.country !== DEFAULT_COUNTRY ? p.country : '',
  ].filter(Boolean);
}

/**
 * A link to the pin on openstreetmap.org, for staff and for emails. A link,
 * not an embed: it opens on their device and asks nothing of this site's CSP.
 */
export function pinMapUrl(pin: Pick<GeoPin, 'lat' | 'lng'>): string {
  const lat = pin.lat.toFixed(6);
  const lng = pin.lng.toFixed(6);
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=19/${lat}/${lng}`;
}
