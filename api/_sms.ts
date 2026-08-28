/**
 * Transactional SMS via Brevo.
 *
 * Used for the one message where SMS genuinely beats email for a phone
 * retailer: "out for delivery, arriving today". Nobody checks email on the
 * doorstep.
 *
 * Unlike email, SMS is NOT free — Brevo bills per message from a prepaid
 * credit balance, and prices vary by destination country. So this is opt-in
 * per send rather than automatic, and with no credits it fails softly rather
 * than taking the calling request down.
 *
 *   BREVO_API_KEY   the same key the email uses
 *   SMS_SENDER      alphanumeric sender id, max 11 chars, e.g. "LeHart"
 *
 * With SMS_SENDER unset every send is a logged no-op. That is the default:
 * a shop that has not deliberately turned SMS on should never be silently
 * spending credits.
 */

const ENDPOINT = 'https://api.brevo.com/v3/transactionalSMS/sms';

export interface SmsResult {
  sent: boolean;
  skipped?: string;
  error?: string;
  messageId?: string;
  /** Brevo reports the credits this message consumed. */
  creditsUsed?: number;
}

export function smsConfigured(): boolean {
  return Boolean(process.env.BREVO_API_KEY && process.env.SMS_SENDER);
}

/**
 * Normalise a UK number to the international form Brevo expects: digits only,
 * no plus, country code included.
 *
 * Returns null for anything that does not look like a real number, because a
 * malformed recipient is a wasted credit and a silent non-delivery rather
 * than an error you would notice.
 */
export function toInternational(raw: unknown, defaultCountry = '44'): string | null {
  let digits = String(raw ?? '').replace(/[^\d+]/g, '');
  if (!digits) return null;

  if (digits.startsWith('+')) digits = digits.slice(1);
  // 07700 900123 → 447700900123
  else if (digits.startsWith('0')) digits = defaultCountry + digits.slice(1);
  // A bare 7700900123 is a UK mobile missing both the trunk 0 and the country
  // code; anything already starting with the country code is left alone.
  else if (!digits.startsWith(defaultCountry)) digits = defaultCountry + digits;

  // Shortest plausible international number is 8 digits, longest is 15 (E.164).
  return digits.length >= 8 && digits.length <= 15 ? digits : null;
}

export async function sendSms(params: { to: unknown; content: string; tag?: string }): Promise<SmsResult> {
  if (!smsConfigured()) {
    return { sent: false, skipped: 'BREVO_API_KEY or SMS_SENDER is not set' };
  }

  const recipient = toInternational(params.to);
  if (!recipient) return { sent: false, error: 'Recipient is not a usable phone number' };

  // One GSM-7 segment is 160 characters; past that each message costs another
  // credit. Truncating keeps a runaway template from quietly costing five
  // times what it should.
  const content = params.content.trim().slice(0, 160);
  if (!content) return { sent: false, error: 'Message body is empty' };

  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'api-key': String(process.env.BREVO_API_KEY),
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        sender: String(process.env.SMS_SENDER).slice(0, 11),
        recipient,
        content,
        type: 'transactional',
        ...(params.tag ? { tag: params.tag } : {}),
      }),
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      return { sent: false, error: `Brevo responded ${res.status}: ${detail.slice(0, 200)}` };
    }

    const body = (await res.json().catch(() => ({}))) as { messageId?: string | number; usedCredits?: number };
    return {
      sent: true,
      messageId: body.messageId === undefined ? undefined : String(body.messageId),
      creditsUsed: body.usedCredits,
    };
  } catch (err) {
    // A failed SMS must never take the order update down with it.
    return { sent: false, error: (err as Error).message };
  }
}
