import { sendEmail, esc, layout } from './_email.js';
import { orderAlertRecipients } from './_orderCore.js';

/**
 * Money problems: write them down AND tell a person.
 *
 * Both payment routes recorded these in `payment_incidents` and logged them,
 * and nothing ever read the collection: no screen, no email, no sweep. A
 * refund that failed, or a capture that may have taken money without an
 * order, sat unseen until the customer complained. The row is still the
 * record; the email is what makes a human look at it.
 *
 * Alerting is best-effort and bounded: it can never be what FAILS a payment
 * (nothing here throws), and it has a short deadline of its own so a hung mail
 * provider cannot hold a request for long. It does not promise to fit inside
 * the platform's ceiling: after PayPal's own 8 second deadline there may be
 * no time left, which is why the row is written first and the email is the
 * best-effort half.
 */

/** Shorter than the default: these run on paths that have already failed. */
const ALERT_TIMEOUT_MS = 3_000;

const HEADLINES: Record<string, string> = {
  'refund-failed': 'A customer was charged and the refund FAILED',
  'admin-refund-failed': 'A refund you started FAILED at PayPal',
  'refund-restock-failed': 'The refund went through but the stock was not put back',
  'capture-failed': 'A PayPal capture may have taken money without an order',
};

const NEXT_STEP: Record<string, string> = {
  'refund-failed': 'Open PayPal > Activity, find the payment (PayPal order / capture id below) and refund it by hand. The customer has not been told they are refunded.',
  'admin-refund-failed': 'Open PayPal > Activity and check whether the refund is there. If not, refund it from PayPal directly; the order is still marked as paid.',
  'refund-restock-failed': 'The customer is refunded. Put the units back on sale by hand in Admin > Products, then mark the order refunded.',
  'capture-failed': 'PayPal did not give a clear answer, so we cannot tell whether the money was taken. Open PayPal > Activity and look for this PayPal order id. If a payment is there with no order, refund it.',
};

/** Fields worth putting in front of staff, in reading order. Nothing here is a secret. */
const FIELDS: Array<[string, string]> = [
  ['reference', 'Our reference'], ['orderId', 'Order'], ['paypalOrderId', 'PayPal order id'],
  ['captureId', 'PayPal capture id'], ['reason', 'Reason'], ['total', 'Order total'],
  ['amount', 'Amount'], ['capturedTotal', 'Amount captured'], ['customerEmail', 'Customer'],
  ['paypalError', 'PayPal said'], ['commitError', 'Order write said'], ['restockError', 'Restock said'],
];

/**
 * A capture that failed with no verdict from PayPal (a timeout, a dropped
 * connection, or PayPal itself answering 5xx) may still have taken the money.
 * A plain decline did not, and is the shopper's problem, not an incident worth
 * an email. api/_paypal.ts reports a non-2xx capture as "PayPal capture failed
 * (<status>)" or with PayPal's own message, so 5xx and its wording are matched.
 */
export function isAmbiguousFailure(error: unknown): boolean {
  return /abort|timeout|timed out|fetch failed|network|econn|socket|enotfound|terminated|\(5\d\d\)|\(408\)|internal server error|service unavailable|bad gateway|gateway time/i
    .test(String(error ?? ''));
}

export function incidentNeedsAlert(kind: string, detail: Record<string, unknown>): boolean {
  if (kind === 'capture-failed') return isAmbiguousFailure(detail.paypalError);
  return kind in HEADLINES;
}

export function incidentEmail(source: string, kind: string, detail: Record<string, unknown>): { subject: string; html: string; text: string } {
  const headline = HEADLINES[kind] ?? `Payment incident: ${kind}`;
  const next = NEXT_STEP[kind] ?? 'Open the payment_incidents collection in the Firebase console for the full record.';
  const rows = FIELDS
    .filter(([key]) => detail[key] != null && detail[key] !== '')
    .map(([key, label]) => [label, String(detail[key])] as const);

  const html = layout(headline, `
    <p style="margin:0 0 14px;font-size:15px;line-height:1.5;"><strong>What to do:</strong> ${esc(next)}</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;font-size:14px;border-collapse:collapse;">
      ${rows.map(([label, value]) => `<tr><td style="padding:6px 12px 6px 0;color:#57534e;vertical-align:top;white-space:nowrap;">${esc(label)}</td><td style="padding:6px 0;word-break:break-word;">${esc(value)}</td></tr>`).join('')}
    </table>
    <p style="margin:16px 0 0;font-size:12px;color:#78716c;">Recorded in payment_incidents (${esc(kind)}, from ${esc(source)}). Mark the row resolved in the Firebase console once it is dealt with.</p>`);

  const text = [headline, '', `What to do: ${next}`, '', ...rows.map(([label, value]) => `${label}: ${value}`), '',
    `Recorded in payment_incidents (${kind}, from ${source}). Mark the row resolved in the Firebase console once it is dealt with.`].join('\n');

  return { subject: `ACTION NEEDED: ${headline}`, html, text };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function recordPaymentIncident(db: any, source: string, kind: string, detail: Record<string, unknown>): Promise<void> {
  console.error(`[${source}] ${kind}`, JSON.stringify(detail));
  try {
    await db.collection('payment_incidents').add({
      kind, resolved: false, createdAt: new Date().toISOString(), ...detail,
    });
  } catch (err) {
    // Nothing left to do but shout. Losing the row too is why this is loud.
    console.error(`[${source}] COULD NOT RECORD ${kind}:`, (err as Error).message);
  }

  if (!incidentNeedsAlert(kind, detail)) return;
  try {
    const mail = incidentEmail(source, kind, detail);
    const results = await Promise.all(orderAlertRecipients().map(to => sendEmail({
      to, subject: mail.subject, html: mail.html, text: mail.text,
      tag: 'payment-incident', timeoutMs: ALERT_TIMEOUT_MS,
    })));
    for (const r of results) if (r.error) console.error(`[${source}] incident alert for ${kind}:`, r.error);
  } catch (err) {
    console.error(`[${source}] incident alert for ${kind} threw:`, (err as Error).message);
  }
}
