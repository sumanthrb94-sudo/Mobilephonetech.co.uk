import { timingSafeEqual } from 'node:crypto';
import { adminDb } from '../_firebaseAdmin.js';
import { suppressContact } from '../_brevoContacts.js';
import { blocklistSubscriber } from '../_listmonk.js';

/**
 * Brevo delivery events — bounces, complaints, unsubscribes, opens, clicks.
 *
 * This is list hygiene, and it is the difference between a sending domain
 * that keeps reaching inboxes and one that stops. Mail a hard-bounced address
 * repeatedly and providers read it as a list you do not maintain; collect
 * spam complaints and they stop trusting the domain for everything, order
 * confirmations included. Nothing in the shop noticed either event before
 * this route existed.
 *
 * Configure in Brevo → Transactional → Settings → Webhooks (and again under
 * Contacts → Settings for marketing events), pointing at:
 *
 *   https://lehart.co.uk/api/brevo-webhook?secret=<BREVO_WEBHOOK_SECRET>
 *
 * Brevo does not sign its webhooks — there is no HMAC to verify — so the
 * shared secret in the query string is the whole of the authentication. It is
 * compared in constant time, and with BREVO_WEBHOOK_SECRET unset the route
 * refuses every request rather than defaulting open. Anyone who learns the
 * secret can suppress arbitrary addresses, so treat it like a password and
 * rotate it if the URL leaks.
 */

/** Events that mean: stop mailing this address. */
const SUPPRESSING: Record<string, string> = {
  hard_bounce: 'hard bounce',
  blocked: 'blocked by provider',
  spam: 'marked as spam',
  complaint: 'complaint',
  unsubscribed: 'unsubscribed',
  invalid_email: 'invalid address',
  // Brevo's marketing webhooks use these spellings for the same things.
  unsubscribe: 'unsubscribed',
  list_addition: '',
};

/** Events worth recording but which must never suppress an address. */
const INFORMATIONAL = new Set([
  'request',
  'delivered',
  'opened',
  'unique_opened',
  'click',
  'soft_bounce',
  'deferred',
  'error',
]);

function secretMatches(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) {
    // Burn an equivalent comparison so timing does not distinguish a
    // wrong-length secret from a wrong-value one.
    timingSafeEqual(b, b);
    return false;
  }
  return timingSafeEqual(a, b);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const expected = process.env.BREVO_WEBHOOK_SECRET;
  if (!expected) {
    // Closed by default. An open webhook that suppresses addresses is a
    // denial-of-service against your own customers.
    return res.status(404).json({ error: 'Not found' });
  }
  if (!secretMatches(String(req.query?.secret ?? ''), expected)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const payload = req.body ?? {};
  const event = String(payload.event ?? '').toLowerCase();
  const email = String(payload.email ?? '').trim().toLowerCase();

  if (!event) return res.status(400).json({ error: 'event is required' });
  if (!email.includes('@')) return res.status(400).json({ error: 'email is required' });

  const db = await adminDb();
  if (!db) return res.status(503).json({ error: 'Database unavailable' });

  // Every event is logged, including the informational ones — open and click
  // rates are the only read on whether the templates are working, and a
  // rising soft_bounce count is the early warning before hard bounces start.
  //
  // Brevo retries on a non-2xx, so the document id is derived from the event
  // rather than random: a retry overwrites its own row instead of inflating
  // the counts.
  const messageId = String(payload['message-id'] ?? payload.messageId ?? payload.id ?? 'unknown');
  const eventKey = `${email}_${event}_${messageId}`.replace(/[^a-zA-Z0-9_.@-]/g, '_').slice(0, 400);

  try {
    await db.collection('emailEvents').doc(eventKey).set(
      {
        event,
        email,
        messageId,
        tag: payload.tag ?? null,
        reason: payload.reason ?? null,
        subject: payload.subject ?? null,
        // Brevo's own timestamp, kept beside ours so clock skew is visible.
        occurredAt: payload.date ?? payload.ts ?? null,
        receivedAt: new Date().toISOString(),
      },
      { merge: true },
    );
  } catch (err) {
    // Logging is not worth failing the webhook over — Brevo would retry, and
    // the suppression below matters far more than the audit row.
    console.error('[api/brevo-webhook] log failed:', (err as Error).message);
  }

  const reason = SUPPRESSING[event];
  if (!reason) {
    return res.status(200).json({
      ok: true,
      event,
      action: INFORMATIONAL.has(event) ? 'logged' : 'ignored',
    });
  }

  // ── Suppress everywhere ──
  // Firestore first, because it is the source of truth the signup path reads.
  // The other two are projections and are allowed to fail.
  const outcome: Record<string, unknown> = { firestore: 'skipped' };

  try {
    const ref = db.collection('newsletterSubscribers').doc(email);
    if ((await ref.get()).exists) {
      await ref.set(
        {
          isActive: false,
          unsubscribedAt: new Date().toISOString(),
          suppression: { reason, event, at: new Date().toISOString() },
        },
        { merge: true },
      );
      outcome.firestore = 'suppressed';
    } else {
      // A bouncing order-confirmation address was never on the newsletter, so
      // there is nothing to deactivate — the event is still logged above.
      outcome.firestore = 'not-a-subscriber';
    }
  } catch (err) {
    outcome.firestore = `failed: ${(err as Error).message}`;
  }

  const [brevo, listmonk] = await Promise.all([
    suppressContact(email, reason),
    blocklistSubscriber(email),
  ]);
  outcome.brevo = brevo.synced ? 'suppressed' : (brevo.skipped ?? brevo.error);
  outcome.listmonk = listmonk.synced ? 'blocklisted' : (listmonk.skipped ?? listmonk.error);

  if (brevo.error) console.error('[api/brevo-webhook] brevo suppress:', brevo.error);
  if (listmonk.error) console.error('[api/brevo-webhook] listmonk blocklist:', listmonk.error);

  // Always 200 once the event is understood. A non-2xx makes Brevo retry, and
  // retrying a suppression that already landed achieves nothing.
  return res.status(200).json({ ok: true, event, action: 'suppressed', reason, outcome });
}
