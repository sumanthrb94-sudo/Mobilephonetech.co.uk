/**
 * Transactional email, through Brevo or Resend.
 *
 * Both are supported and the choice is a single environment variable, because
 * the provider turned out to be the least interesting part of this problem.
 * Nothing that has gone wrong with email on this project was Brevo's doing:
 * the messages that never arrived were sent from a gmail.com address that no
 * relay can authenticate, and the ones before that were never sent at all
 * because a key was missing. Swapping provider would have fixed neither.
 *
 * So the abstraction exists to make the decision reversible rather than to
 * recommend one. Every caller passes the same object; only the request shape
 * differs, and it differs a lot — Brevo wants `sender`/`htmlContent` with an
 * `api-key` header, Resend wants a `from` string and a bearer token.
 *
 *   EMAIL_PROVIDER  "brevo" or "resend". Optional: inferred from whichever
 *                   key is present, so adding RESEND_API_KEY is enough.
 *   BREVO_API_KEY   Brevo → SMTP & API → API keys
 *   RESEND_API_KEY  Resend → API Keys (starts "re_")
 *   EMAIL_FROM      the sender address, e.g. info@lehart.co.uk
 *   EMAIL_FROM_NAME optional display name, defaults to "LeHart"
 *   EMAIL_REPLY_TO  where a customer's reply lands, e.g. info@lehart.co.uk
 *
 * **The domain must be authenticated with whichever one you choose.** DKIM and
 * SPF are published per sending domain per provider; moving from Brevo to
 * Resend means publishing Resend's records, not skipping the step. A provider
 * that has not been given DNS records will still accept every message and the
 * recipient will still bin it.
 *
 * With no key set every send becomes a logged no-op rather than an error. That
 * is deliberate: a missing email key must never fail a customer's return or
 * order. The caller is told the mail was skipped and carries on.
 *
 * SMS remains Brevo-only — Resend does not send SMS. See api/_sms.ts.
 */

const BREVO_ENDPOINT = 'https://api.brevo.com/v3/smtp/email';
const RESEND_ENDPOINT = 'https://api.resend.com/emails';

export type EmailProvider = 'brevo' | 'resend';

/**
 * Which provider to use.
 *
 * Inferred rather than required, so a working deployment does not break the
 * moment a second key appears. An explicit EMAIL_PROVIDER always wins; failing
 * that, whichever key exists decides, and Resend is preferred when both do —
 * having deliberately added the newer key is a clearer signal of intent than
 * having never removed the old one.
 */
export function emailProvider(): EmailProvider | null {
  const explicit = String(process.env.EMAIL_PROVIDER ?? '').trim().toLowerCase();
  if (explicit === 'resend' || explicit === 'brevo') return explicit;
  if (process.env.RESEND_API_KEY) return 'resend';
  if (process.env.BREVO_API_KEY) return 'brevo';
  return null;
}

export interface EmailResult {
  sent: boolean;
  skipped?: string;
  error?: string;
  messageId?: string;
}

export function emailConfigured(): boolean {
  const provider = emailProvider();
  if (!provider || !process.env.EMAIL_FROM) return false;
  return Boolean(provider === 'resend' ? process.env.RESEND_API_KEY : process.env.BREVO_API_KEY);
}

/**
 * Mailbox providers whose domains you cannot authenticate as a sender.
 *
 * This is the misconfiguration that produces no error anywhere. Brevo accepts
 * the message and reports success, because the fault is not Brevo's: a From:
 * address at gmail.com sent from Brevo's servers cannot align with gmail.com's
 * DMARC record, so the receiving side — Gmail most of all — treats it as
 * spoofing and files or drops it. Every log in the chain says "sent". Nothing
 * arrives. The only fix is a From: address at a domain you control and have
 * authenticated in Brevo.
 */
const UNAUTHENTICATABLE_SENDER_DOMAINS = [
  'gmail.com', 'googlemail.com', 'yahoo.com', 'yahoo.co.uk', 'outlook.com',
  'hotmail.com', 'hotmail.co.uk', 'live.com', 'aol.com', 'icloud.com', 'me.com',
];

/** Non-null when EMAIL_FROM is set to an address that cannot be authenticated. */
export function senderDomainWarning(): string | null {
  const from = String(process.env.EMAIL_FROM ?? '').toLowerCase();
  const domain = from.split('@')[1];
  if (!domain || !UNAUTHENTICATABLE_SENDER_DOMAINS.includes(domain)) return null;
  return `EMAIL_FROM is at ${domain}, which cannot be DKIM/SPF-aligned for this sender. `
    + 'The provider will accept every message and most will be junked or dropped by '
    + 'the recipient. Use an address at a domain you control and have authenticated '
    + 'with your email provider.';
}

/** Very small allow-list check — enough to refuse obvious rubbish. */
export function looksLikeEmail(value: unknown): value is string {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;
}

export async function sendEmail(params: {
  to: string;
  toName?: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  /** Filter tag, so sends can be found in the provider's dashboard. */
  tag?: string;
}): Promise<EmailResult> {
  if (!emailConfigured()) {
    return { sent: false, skipped: 'No email provider key, or EMAIL_FROM is not set' };
  }
  if (!looksLikeEmail(params.to)) {
    return { sent: false, error: 'Recipient address is not valid' };
  }

  /**
   * Where a reply goes, applied here rather than at each call site.
   *
   * Customers reply to receipts — to ask where the parcel is, to report a
   * fault, to cancel. Without this the reply goes to EMAIL_FROM, which is a
   * send-only address on most setups, so the message bounces or lands in a
   * mailbox nobody opens. Either way the customer believes they contacted you
   * and you have no idea they tried, which is how a fixable complaint becomes
   * a chargeback.
   *
   * Set on every send so no future template can forget it.
   */
  const replyTo = params.replyTo ?? process.env.EMAIL_REPLY_TO ?? undefined;
  const provider = emailProvider()!;
  const fromName = process.env.EMAIL_FROM_NAME || 'LeHart';
  const from = String(process.env.EMAIL_FROM);

  const request: { url: string; headers: Record<string, string>; body: Record<string, unknown> } =
    provider === 'resend'
    ? {
        url: RESEND_ENDPOINT,
        headers: {
          authorization: `Bearer ${String(process.env.RESEND_API_KEY)}`,
          'content-type': 'application/json',
        },
        body: {
          // Resend takes one RFC 5322 string rather than a name/email pair.
          from: `${fromName} <${from}>`,
          to: [params.to],
          subject: params.subject,
          html: params.html,
          // Always send a plain-text part: HTML-only mail scores worse with
          // spam filters and is unreadable in text-only clients.
          text: params.text,
          ...(replyTo ? { reply_to: replyTo } : {}),
          // Resend tags are name/value pairs and reject anything outside
          // letters, digits, underscore and dash — which every tag here is.
          ...(params.tag ? { tags: [{ name: 'category', value: params.tag }] } : {}),
        },
      }
    : {
        url: BREVO_ENDPOINT,
        headers: {
          'api-key': String(process.env.BREVO_API_KEY),
          'content-type': 'application/json',
          accept: 'application/json',
        },
        body: {
          sender: { email: from, name: fromName },
          to: [{ email: params.to, ...(params.toName ? { name: params.toName } : {}) }],
          subject: params.subject,
          htmlContent: params.html,
          textContent: params.text,
          ...(replyTo ? { replyTo: { email: replyTo } } : {}),
          ...(params.tag ? { tags: [params.tag] } : {}),
        },
      };

  try {
    const res = await fetch(request.url, {
      method: 'POST',
      headers: request.headers,
      body: JSON.stringify(request.body),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      return { sent: false, error: `${provider} responded ${res.status}: ${detail.slice(0, 200)}` };
    }

    // Brevo returns messageId, Resend returns id. Read the field the provider
    // in use actually sets rather than falling back between them: a fallback
    // silently picks whichever happens to be present, so the day a response
    // carries both the id logged is not necessarily the one in their console.
    const body = (await res.json().catch(() => ({}))) as { messageId?: string; id?: string };
    const messageId = provider === 'resend' ? body.id : body.messageId;

    // Log the id, never the recipient. A provider accepting a message is not
    // the same as a mailbox receiving it, and without this there is no way to
    // join "the route ran" to the row in the provider's own log, where the
    // delivered / soft-bounced / blocked verdict actually lives.
    console.log(`[email] ${params.tag ?? 'untagged'} accepted by ${provider} as ${messageId ?? 'unknown'}`);
    return { sent: true, messageId };
  } catch (err) {
    // A failed send must not take the calling request down with it.
    return { sent: false, error: (err as Error).message };
  }
}

/** Escape before interpolating anything customer-supplied into HTML. */
export function esc(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const SHOP_URL = process.env.PUBLIC_SITE_URL || 'https://lehart.co.uk';

/** One shell for every message, so branding lives in a single place. */
export function layout(headline: string, bodyHtml: string): string {
  return `<!doctype html>
<html lang="en-GB"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:24px;background:#fafaf9;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,sans-serif;color:#0c0a09;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #ededeb;border-radius:14px;">
    <tr><td style="padding:22px 26px;border-bottom:1px solid #ededeb;">
      <span style="font-size:19px;font-weight:800;letter-spacing:-0.02em;">Le<span style="color:#a16207;">Hart</span></span>
    </td></tr>
    <tr><td style="padding:26px;">
      <h1 style="margin:0 0 14px;font-size:20px;line-height:1.3;font-weight:800;">${esc(headline)}</h1>
      ${bodyHtml}
    </td></tr>
    <tr><td style="padding:18px 26px;border-top:1px solid #ededeb;font-size:12px;color:#78716c;line-height:1.6;">
      Questions? Reply to this email and a person will answer.<br>
      <a href="${SHOP_URL}" style="color:#854d0e;">${esc(SHOP_URL.replace(/^https?:\/\//, ''))}</a>
    </td></tr>
  </table>
</body></html>`;
}
