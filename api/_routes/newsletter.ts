import { adminDb } from '../_firebaseAdmin.js';
import { enforceRateLimit, clientIp } from '../_rateLimit.js';
import { sendEmail } from '../_email.js';
import { upsertSubscriber } from '../_listmonk.js';
import { upsertContact } from '../_brevoContacts.js';
import { welcomeEmail } from '../_templates.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Bumped whenever the privacy policy materially changes, so each consent
 * record names the wording it was given against.
 */
const PRIVACY_POLICY_VERSION = '2026-08-21';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Unauthenticated write route — cap it. Nobody subscribes 10 times a minute.
  if (!enforceRateLimit(req, res, 'newsletter', { limit: 10, windowMs: 60_000 })) return;

  const { email, name, source } = req.body ?? {};

  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'email is required' });
  }
  const normalised = email.trim().toLowerCase();
  if (!EMAIL_RE.test(normalised)) {
    return res.status(400).json({ error: 'Invalid email address' });
  }
  if (normalised.length > 254) {
    return res.status(400).json({ error: 'Email address too long' });
  }
  if (name && (typeof name !== 'string' || name.trim().length > 100)) {
    return res.status(400).json({ error: 'name must be a string under 100 characters' });
  }

  try {
    const db = await adminDb();
    if (!db) return res.status(503).json({ error: 'Newsletter signup is unavailable' });

    // The normalised address is the document id, so re-subscribing overwrites
    // instead of creating a duplicate — the old unique index, by another name.
    //
    // The consent block is what makes this list lawfully mailable: an email
    // platform import needs evidence of when consent was given, from where,
    // and against which policy wording. An address with none of that attached
    // cannot be defended, which is why the pre-existing rows must be
    // re-permissioned rather than imported.
    await db.collection('newsletterSubscribers').doc(normalised).set({
      email: normalised,
      name: name?.trim() ?? null,
      isActive: true,
      subscribedAt: new Date().toISOString(),
      consent: {
        at: new Date().toISOString(),
        source: typeof source === 'string' && source.trim() ? source.trim().slice(0, 60) : 'website-signup',
        policyVersion: PRIVACY_POLICY_VERSION,
        method: 'single-opt-in',
        // Truncated, not full: enough to evidence the signup happened from a
        // real distinct client without retaining a precise identifier forever.
        ipHint: clientIp(req).split('.').slice(0, 3).join('.') || 'unknown',
      },
      // Set true by the confirmation link once double opt-in ships; single
      // opt-in records stay explicitly marked as such.
      doubleOptInConfirmed: false,
    }, { merge: true });

    // Firestore now holds the consent record, so the signup has succeeded no
    // matter what the next three calls do. All are deliberately best-effort:
    // both list systems are projections that can be rebuilt from Firestore, and
    // a welcome email nobody receives is not worth failing a subscription over.
    const consentSource =
      typeof source === 'string' && source.trim() ? source.trim().slice(0, 60) : 'website-signup';

    const [listed, contacted, welcomed] = await Promise.all([
      upsertSubscriber({
        email: normalised,
        name: name?.trim() ?? null,
        // Mirrored so a campaign can segment on them without reading Firestore.
        attribs: {
          source: consentSource,
          policy_version: PRIVACY_POLICY_VERSION,
          consent_method: 'single-opt-in',
          subscribed_at: new Date().toISOString(),
        },
      }),
      // Brevo contacts are what an automation built there can target, so the
      // subscriber lands in both list systems. Which one campaigns actually go
      // out from stays a decision for later.
      upsertContact({
        email: normalised,
        firstName: name?.trim().split(/\s+/)[0] ?? null,
        attributes: { SIGNUP_SOURCE: consentSource, POLICY_VERSION: PRIVACY_POLICY_VERSION },
      }),
      (async () => {
        const mail = welcomeEmail({ name: name?.trim() ?? null });
        return sendEmail({
          to: normalised,
          toName: name?.trim(),
          subject: mail.subject,
          html: mail.html,
          text: mail.text,
          tag: 'newsletter-welcome',
        });
      })(),
    ]);

    if (listed.error) console.error('[api/newsletter] listmonk:', listed.error);
    if (contacted.error) console.error('[api/newsletter] brevo contact:', contacted.error);
    if (welcomed.error) console.error('[api/newsletter] welcome email:', welcomed.error);

    return res.status(200).json({
      success: true,
      message: 'Subscribed successfully',
      listmonk: listed.synced ? listed.action : (listed.skipped ?? 'failed'),
      brevoContact: contacted.synced ? 'synced' : (contacted.skipped ?? 'failed'),
      welcomeEmail: welcomed.sent ? 'sent' : (welcomed.skipped ?? 'failed'),
    });
  } catch (err) {
    console.error('[api/newsletter]', err);
    return res.status(500).json({ error: 'Failed to subscribe' });
  }
}
