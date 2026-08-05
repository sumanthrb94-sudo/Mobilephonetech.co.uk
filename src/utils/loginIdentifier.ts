/**
 * Supabase Auth identifies users by email address — there is no separate
 * username field. Staff still want to sign in as plain `admin`, so a value
 * with no "@" is treated as the local part of a staff address.
 *
 *   admin            -> admin@lehart.co.uk
 *   admin@lehart.co.uk -> admin@lehart.co.uk
 *   someone@gmail.com  -> someone@gmail.com
 *
 * Applied on sign-in only. Sign-up keeps requiring a real address, because
 * inventing one for a customer would send their confirmation mail into a
 * domain they do not own.
 */
export const STAFF_EMAIL_DOMAIN = 'lehart.co.uk';

export function resolveLoginIdentifier(input: string): string {
  const value = input.trim().toLowerCase();
  if (!value) return '';
  if (value.includes('@')) return value;
  return `${value}@${STAFF_EMAIL_DOMAIN}`;
}

/**
 * Whether the value can be submitted. `type="email"` cannot be used on the
 * field any more (it would reject a bare username before submit), so the
 * check lives here instead of relying on the browser.
 */
export function isValidLoginIdentifier(input: string): boolean {
  const value = input.trim();
  if (!value) return false;
  if (!value.includes('@')) return /^[a-z0-9._-]+$/i.test(value);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
