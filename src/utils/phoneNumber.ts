/**
 * Phone number normalisation, shared by the browser and the serverless
 * functions.
 *
 * One canonical form matters more than it sounds. A number is about to be used
 * as an *identity* — Firebase keys a phone account on the exact string it is
 * given — so `07700 900123` and `+44 7700 900123` normalising differently
 * would hand one person two accounts. That is the duplicate problem the whole
 * of docs/AUTH.md is about, arriving through the back door.
 *
 * It used to assume every bare number was British. That was wrong in a way
 * that failed silently and cost a real test: an Indian mobile typed as
 * `9700144003` became `+449700144003`, which is not a number anywhere, and
 * Firebase answered with `auth/internal-error` — no mention of the country, no
 * hint that the app had rewritten what was typed. The country is now an
 * explicit input rather than a guess, and the caller passes the one the
 * customer picked.
 *
 * It is still deliberately not libphonenumber — that is ~150 kB for validation
 * this does not need. It is a length-and-prefix sanity check for the countries
 * actually served, so it accepts some numbers that are not dialable. Firebase
 * and the SMS provider both reject those at send time, which is the right
 * place for it: the cost of being wrong is a failed send, not a wrong account.
 */

export interface Country {
  /** ISO 3166-1 alpha-2, the value stored in the picker. */
  iso: string;
  /** Country calling code, digits only. */
  dial: string;
  name: string;
  /** Shown as the field's placeholder, in the local trunk format. */
  example: string;
  /** Valid national-significant-number lengths, trunk 0 removed. */
  nsnLengths: number[];
  /** First digit(s) a mobile can start with, once the trunk 0 is removed. */
  mobilePrefix: RegExp;
}

/**
 * The countries the picker offers. UK first because it is a UK shop; India
 * second because that is where the business actually operates from and every
 * test SMS goes. Anything else is reachable by typing a leading `+`.
 */
export const COUNTRIES: Country[] = [
  { iso: 'GB', dial: '44',  name: 'United Kingdom', example: '07700 900123',  nsnLengths: [10],     mobilePrefix: /^7/ },
  { iso: 'IN', dial: '91',  name: 'India',          example: '97001 44003',   nsnLengths: [10],     mobilePrefix: /^[6-9]/ },
  { iso: 'IE', dial: '353', name: 'Ireland',        example: '085 012 3456',  nsnLengths: [9],      mobilePrefix: /^8/ },
  { iso: 'US', dial: '1',   name: 'United States',  example: '555 123 4567',  nsnLengths: [10],     mobilePrefix: /^[2-9]/ },
  { iso: 'AE', dial: '971', name: 'UAE',            example: '050 123 4567',  nsnLengths: [9],      mobilePrefix: /^5/ },
  { iso: 'AU', dial: '61',  name: 'Australia',      example: '0412 345 678',  nsnLengths: [9],      mobilePrefix: /^4/ },
];

export const DEFAULT_COUNTRY_ISO = 'GB';
/** Kept as a dial code so the serverless SMS helper can pass one directly. */
export const DEFAULT_COUNTRY = '44';

export function countryForIso(iso: unknown): Country {
  return COUNTRIES.find((c) => c.iso === String(iso ?? '').toUpperCase())
    ?? COUNTRIES.find((c) => c.iso === DEFAULT_COUNTRY_ISO)!;
}

function countryForDial(dial: string): Country | undefined {
  // Longest dial code first, so "1" never shadows "353".
  return [...COUNTRIES].sort((a, b) => b.dial.length - a.dial.length).find((c) => c.dial === dial);
}

/** The country a fully-normalised number belongs to, if it is one we know. */
function countryOf(digits: string): Country | undefined {
  return [...COUNTRIES]
    .sort((a, b) => b.dial.length - a.dial.length)
    .find((c) => digits.startsWith(c.dial));
}

/**
 * Digits only, country code included, no leading plus.
 * The form Brevo's SMS API wants.
 *
 *   "07700 900123"   , GB -> "447700900123"
 *   "9700144003"     , IN -> "919700144003"
 *   "+44 7700 900123", ** -> "447700900123"
 *
 * A leading `+` always wins: it means the customer stated the country
 * themselves, and overriding that with the picker would be the same silent
 * rewrite this function exists to stop.
 *
 * Returns null for anything not plausibly a number, because a malformed
 * recipient is a silently undelivered message rather than a visible error.
 */
export function normalisePhone(raw: unknown, defaultCountry = DEFAULT_COUNTRY): string | null {
  let digits = String(raw ?? '').replace(/[^\d+]/g, '');
  if (!digits) return null;

  const dial = String(defaultCountry).replace(/\D/g, '') || DEFAULT_COUNTRY;
  const country = countryForDial(dial);

  if (digits.startsWith('+')) {
    digits = digits.slice(1);
  } else if (digits.startsWith('0')) {
    // Trunk prefix: national format, so the picker's country is the right one.
    digits = dial + digits.slice(1);
  } else if (country?.nsnLengths.includes(digits.length)) {
    // Exactly the length of a national number for the chosen country. Checked
    // BEFORE the starts-with test on purpose: an Indian 91xxxxxxxx is a real
    // subscriber number, and reading its first two digits as a country code
    // would send the code to the wrong handset.
    digits = dial + digits;
  } else if (!digits.startsWith(dial)) {
    digits = dial + digits;
  }

  // Shortest plausible international number is 8 digits, longest is 15 (E.164).
  return digits.length >= 8 && digits.length <= 15 ? digits : null;
}

/**
 * E.164 with the leading plus — the form Firebase Auth requires.
 * signInWithPhoneNumber rejects anything else outright.
 */
export function toE164(raw: unknown, defaultCountry = DEFAULT_COUNTRY): string | null {
  const digits = normalisePhone(raw, defaultCountry);
  return digits ? `+${digits}` : null;
}

/**
 * Back to something a person recognises on screen. UK mobiles are shown in
 * the familiar 07… grouping rather than +44, because that is how a customer
 * would read their own number back.
 */
export function formatPhoneForDisplay(raw: unknown): string {
  const digits = normalisePhone(raw);
  if (!digits) return String(raw ?? '');

  if (digits.startsWith('447') && digits.length === 12) {
    // 447700900123 -> 07700 900123
    return `0${digits.slice(2, 6)} ${digits.slice(6)}`;
  }
  return `+${digits}`;
}

/**
 * Masked for confirmation screens — enough to recognise, not enough to be
 * useful to someone reading over a shoulder.
 *
 *   "+447700900123" -> "•••• ••• 123"
 */
export function maskPhone(raw: unknown): string {
  const digits = normalisePhone(raw);
  if (!digits) return '••••';
  return `•••• ••• ${digits.slice(-3)}`;
}

/**
 * Why this number cannot be sent to, in words a customer can act on — or null
 * when it looks fine.
 *
 * Worth having as its own function rather than a boolean. "That does not look
 * like a valid mobile number" tells someone who typed a UK landline, or an
 * Indian number with the country left on United Kingdom, absolutely nothing
 * about what to change.
 */
export function describePhoneProblem(raw: unknown, defaultCountry = DEFAULT_COUNTRY): string | null {
  const text = String(raw ?? '').trim();
  if (!text) return 'Enter your mobile number.';

  const digits = normalisePhone(text, defaultCountry);
  if (!digits) return 'That does not look like a mobile number.';

  const country = countryOf(digits);
  // A country we do not model — accept it and let the network decide.
  if (!country) return null;

  const nsn = digits.slice(country.dial.length);

  if (!country.nsnLengths.includes(nsn.length)) {
    const want = country.nsnLengths.join(' or ');
    return `A ${country.name} mobile has ${want} digits after the country code. Yours has ${nsn.length}.`;
  }
  if (!country.mobilePrefix.test(nsn)) {
    return `That is not a ${country.name} mobile number. Check the country next to the field, for example ${country.example}.`;
  }
  return null;
}

/** Whether the value is worth submitting at all. */
export function isValidPhone(raw: unknown, defaultCountry = DEFAULT_COUNTRY): boolean {
  return describePhoneProblem(raw, defaultCountry) === null;
}
