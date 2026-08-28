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
 * UK-first by design: this is a UK shop, and a bare number with no country
 * code is assumed to be one. A number that already carries a country code is
 * left alone. It is deliberately not a full libphonenumber — that is 150 kB
 * for validation this does not need — so it accepts some numbers that are not
 * dialable. Firebase and the SMS provider both reject those at send time,
 * which is the right place for it: the cost of being wrong is a failed send,
 * not a wrong account.
 */

export const DEFAULT_COUNTRY = '44';

/**
 * Digits only, country code included, no leading plus.
 * The form Brevo's SMS API wants.
 *
 *   "07700 900123"     -> "447700900123"
 *   "+44 7700 900123"  -> "447700900123"
 *   "(07700) 900-123"  -> "447700900123"
 *
 * Returns null for anything not plausibly a number, because a malformed
 * recipient is a silently undelivered message rather than a visible error.
 */
export function normalisePhone(raw: unknown, defaultCountry = DEFAULT_COUNTRY): string | null {
  let digits = String(raw ?? '').replace(/[^\d+]/g, '');
  if (!digits) return null;

  if (digits.startsWith('+')) digits = digits.slice(1);
  // 07700 900123 -> 447700900123
  else if (digits.startsWith('0')) digits = defaultCountry + digits.slice(1);
  // A bare 7700900123 is a UK mobile missing both the trunk 0 and the country
  // code; anything already starting with the country code is left alone.
  else if (!digits.startsWith(defaultCountry)) digits = defaultCountry + digits;

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

/** Whether the value is worth submitting at all. */
export function isValidPhone(raw: unknown): boolean {
  return normalisePhone(raw) !== null;
}
