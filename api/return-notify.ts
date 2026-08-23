import { adminDb, verifyCaller, callerIsAdmin } from './_firebaseAdmin.js';
import { sendEmail, emailConfigured, layout, esc } from './_email.js';
import { enforceRateLimit } from './_rateLimit.js';

/**
 * Emails the customer about one return.
 *
 * The address is read from the stored return document, never from the request
 * body. That is the whole security design: a caller can only ever cause an
 * email to be sent to the person the return already belongs to, so this route
 * cannot be turned into an open relay even by someone holding a valid token.
 *
 * Callers must be the return's owner or an admin.
 */

type Kind = 'received' | 'approved' | 'rejected' | 'resolved';

const SUBJECTS: Record<Kind, (rma: string) => string> = {
  received: rma => `We've got your return request ${rma}`,
  approved: rma => `Return ${rma} approved — here's what happens next`,
  rejected: rma => `About your return ${rma}`,
  resolved: rma => `Return ${rma} is sorted`,
};

const OUTCOME_WORD: Record<string, string> = {
  refund: 'refund',
  replacement: 'replacement',
  repair: 'repair',
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function bodyFor(kind: Kind, r: any): { html: string; text: string } {
  const items = (r.items ?? [])
    .map((i: any) => `${i.brand} ${i.model} ×${i.quantity}`)
    .join(', ');
  const outcome = OUTCOME_WORD[r.outcome] ?? 'refund';
  const amount = `£${Number(r.refundAmount ?? 0).toFixed(2)}`;

  const parts: Record<Kind, { lead: string; detail: string }> = {
    received: {
      lead: `Thanks — we have your request for a ${outcome} and will review it within one working day.`,
      detail: 'Please hold on to the device until we send your prepaid tracked label. Posting it before then means we cannot track it.',
    },
    approved: {
      lead: `Your ${outcome} is approved.`,
      detail: 'Your prepaid tracked label is attached to this thread or on its way separately. Pack the device securely, ideally in its original box, and remove any iCloud or Google account lock before sending.',
    },
    rejected: {
      lead: 'We are not able to accept this return.',
      detail: r.staffNote ? esc(r.staffNote) : 'Reply to this email and we will explain and look at it again.',
    },
    resolved: {
      lead: r.outcome === 'refund'
        ? `Your refund of ${amount} has been issued.`
        : r.outcome === 'replacement'
          ? 'Your replacement is on its way.'
          : 'Your repaired device is on its way back to you.',
      detail: r.outcome === 'refund'
        ? 'Refunds reach most cards within 3–5 working days, depending on your bank.'
        : 'You will get tracking details as soon as it leaves us.',
    },
  };

  const p = parts[kind];
  const html = layout(SUBJECTS[kind](String(r.id)), `
    <p style="margin:0 0 12px;font-size:15px;line-height:1.6;">${p.lead}</p>
    <p style="margin:0 0 18px;font-size:14px;line-height:1.6;color:#57534e;">${p.detail}</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;font-size:14px;border-collapse:collapse;">
      <tr><td style="padding:6px 0;color:#78716c;">Reference</td><td style="padding:6px 0;font-weight:700;">${esc(r.id)}</td></tr>
      <tr><td style="padding:6px 0;color:#78716c;">Order</td><td style="padding:6px 0;">${esc(r.orderId)}</td></tr>
      <tr><td style="padding:6px 0;color:#78716c;">Items</td><td style="padding:6px 0;">${esc(items)}</td></tr>
      <tr><td style="padding:6px 0;color:#78716c;">Requested</td><td style="padding:6px 0;text-transform:capitalize;">${esc(outcome)}</td></tr>
    </table>
    <p style="margin:18px 0 0;font-size:12.5px;color:#78716c;line-height:1.6;">
      This does not affect your statutory rights.
    </p>`);

  const text = [
    SUBJECTS[kind](String(r.id)),
    '',
    p.lead,
    p.detail.replace(/<[^>]+>/g, ''),
    '',
    `Reference: ${r.id}`,
    `Order: ${r.orderId}`,
    `Items: ${items}`,
    `Requested: ${outcome}`,
    '',
    'This does not affect your statutory rights.',
  ].join('\n');

  return { html, text };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!enforceRateLimit(req, res, 'return-notify', { limit: 30, windowMs: 60_000 })) return;

  const caller = await verifyCaller(req);
  if (!caller) return res.status(401).json({ error: 'Sign in required' });

  const rmaId = String(req.body?.rmaId ?? '').trim();
  const kind = String(req.body?.kind ?? '') as Kind;
  if (!rmaId) return res.status(400).json({ error: 'rmaId is required' });
  if (!SUBJECTS[kind]) return res.status(400).json({ error: 'Unknown notification kind' });

  const db = await adminDb();
  if (!db) return res.status(503).json({ error: 'Database unavailable' });

  const snap = await db.collection('returns').doc(rmaId).get();
  if (!snap.exists) return res.status(404).json({ error: 'Return not found' });

  const record = snap.data() as Record<string, unknown>;
  const isAdmin = await callerIsAdmin(req);
  if (!isAdmin && record.userId !== caller.uid) {
    return res.status(403).json({ error: 'Not your return' });
  }

  // Recipient comes from the stored document, never the request.
  const to = String(record.customerEmail ?? '');
  if (!to) return res.status(422).json({ error: 'Return has no contact address' });

  const { html, text } = bodyFor(kind, record);
  const result = await sendEmail({
    to,
    toName: String(record.customerName ?? ''),
    subject: SUBJECTS[kind](rmaId),
    html,
    text,
    tag: `return-${kind}`,
  });

  // A skipped send is a 200 with `sent: false`. The return itself succeeded;
  // only the courtesy email did not, and the caller should not treat that as
  // a failure of the operation the customer actually performed.
  return res.status(result.error ? 502 : 200).json({
    ...result,
    configured: emailConfigured(),
  });
}
