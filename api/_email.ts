/**
 * Transactional email via Brevo.
 *
 * Brevo is the pick because it is the cheapest credible option for a UK shop
 * at this stage — 300 emails/day on the free tier, indefinitely — and it is
 * EU-based, which keeps the data-processing paperwork simpler than a US
 * provider.
 *
 * Configure with two environment variables (server-side only, never VITE_):
 *
 *   BREVO_API_KEY   from Brevo → SMTP & API → API keys
 *   EMAIL_FROM      the verified sender address, e.g. orders@lehart.co.uk
 *   EMAIL_FROM_NAME optional display name, defaults to "LeHart"
 *
 * With the key unset every send becomes a logged no-op rather than an error.
 * That is deliberate: a missing email key must never fail a customer's return
 * or order. The caller is told the mail was skipped and carries on.
 */

const BREVO_ENDPOINT = 'https://api.brevo.com/v3/smtp/email';

export interface EmailResult {
  sent: boolean;
  skipped?: string;
  error?: string;
  messageId?: string;
}

export function emailConfigured(): boolean {
  return Boolean(process.env.BREVO_API_KEY && process.env.EMAIL_FROM);
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
    + 'Brevo will accept every message and most will be junked or dropped by the '
    + 'recipient. Use an address at a domain you control and have authenticated in Brevo.';
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
  /** Brevo tag, so sends can be filtered in their dashboard. */
  tag?: string;
}): Promise<EmailResult> {
  if (!emailConfigured()) {
    return { sent: false, skipped: 'BREVO_API_KEY or EMAIL_FROM is not set' };
  }
  if (!looksLikeEmail(params.to)) {
    return { sent: false, error: 'Recipient address is not valid' };
  }

  try {
    const res = await fetch(BREVO_ENDPOINT, {
      method: 'POST',
      headers: {
        'api-key': String(process.env.BREVO_API_KEY),
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        sender: {
          email: process.env.EMAIL_FROM,
          name: process.env.EMAIL_FROM_NAME || 'LeHart',
        },
        to: [{ email: params.to, ...(params.toName ? { name: params.toName } : {}) }],
        subject: params.subject,
        htmlContent: params.html,
        // Always send a plain-text part: HTML-only mail scores worse with
        // spam filters and is unreadable in text-only clients.
        textContent: params.text,
        ...(params.replyTo ? { replyTo: { email: params.replyTo } } : {}),
        ...(params.tag ? { tags: [params.tag] } : {}),
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      return { sent: false, error: `Brevo responded ${res.status}: ${detail.slice(0, 200)}` };
    }

    const body = (await res.json().catch(() => ({}))) as { messageId?: string };
    // Log the id, never the recipient. Brevo accepting a message is not the
    // same as a mailbox receiving it, and without this there is no way to join
    // "the route ran" to a row in Brevo → Transactional → Logs, where the
    // delivered / soft-bounced / blocked verdict actually lives.
    console.log(`[email] ${params.tag ?? 'untagged'} accepted by Brevo as ${body.messageId ?? 'unknown'}`);
    return { sent: true, messageId: body.messageId };
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
