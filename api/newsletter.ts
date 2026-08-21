import { adminDb } from './_firebaseAdmin.js';
import { enforceRateLimit, clientIp } from './_rateLimit.js';

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

    return res.status(200).json({ success: true, message: 'Subscribed successfully' });
  } catch (err) {
    console.error('[api/newsletter]', err);
    return res.status(500).json({ error: 'Failed to subscribe' });
  }
}
