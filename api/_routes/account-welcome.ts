import { adminDb, verifyCaller } from '../_firebaseAdmin.js';
import { enforceRateLimit } from '../_rateLimit.js';
import { sendEmail, emailConfigured } from '../_email.js';
import { accountWelcomeEmail } from '../_templates.js';

/**
 * Send the branded welcome after an account is created.
 *
 * Account signup happens entirely in the browser — createUserWithEmailAndPassword
 * never touches this server — so without this route the only mail a new
 * customer gets is Firebase's own verification link, in Firebase's own
 * styling. This is the LeHart one.
 *
 * Two properties matter more than anything else here:
 *
 * 1. **The recipient comes from the verified ID token, never the body.**
 *    A route that emailed whatever address it was handed would be an open
 *    relay on a warmed sending domain — anyone could have us mail anyone.
 *    The token proves the caller owns the address being written to.
 *
 * 2. **It sends once per account, ever.** welcomeEmailSentAt is stamped
 *    before the send is attempted, so a retry, a double-invoked effect, or a
 *    customer refreshing mid-signup cannot produce a second copy. Losing a
 *    welcome is a much cheaper mistake than sending two.
 *
 *    The stamp is released again when nothing was handed to Brevo at all —
 *    the key is unset, or the address is unusable. That case is not "already
 *    sent", it is "never attempted", and leaving the stamp on made the first
 *    signup after a misconfiguration permanently unwelcomeable: configure
 *    Brevo an hour later and that customer still gets nothing, forever, with
 *    no error anywhere to explain it. A send that Brevo *refused* keeps its
 *    stamp, because a failure after handoff cannot be told apart from a
 *    delivery, and that is exactly the ambiguity the stamp exists for.
 *
 * Marketing consent is deliberately NOT implied. Creating an account is not
 * subscribing to a newsletter, so nothing here adds the address to Brevo's
 * contact list or Listmonk — the signup box on the site is where that consent
 * is given and recorded. Treating registration as opt-in is precisely the
 * assumption PECR exists to prohibit.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!enforceRateLimit(req, res, 'account-welcome', { limit: 10, windowMs: 60_000 })) return;

  const caller = await verifyCaller(req);
  if (!caller) return res.status(401).json({ error: 'Sign in required' });

  // From the token, not the request. See the module comment.
  const to = String(caller.email ?? '').trim().toLowerCase();
  if (!to) {
    // A phone-only account has no address to write to. Not an error — there is
    // simply nothing to send, and the caller should not treat it as a failure.
    return res.status(200).json({ sent: false, skipped: 'account has no email address' });
  }

  const db = await adminDb();
  if (!db) return res.status(503).json({ error: 'Database unavailable' });

  const ref = db.collection('users').doc(caller.uid);

  try {
    const snap = await ref.get();
    if (snap.exists && snap.data()?.welcomeEmailSentAt) {
      return res.status(200).json({ sent: false, skipped: 'already sent' });
    }
    // Stamped BEFORE sending. If the function dies between here and Brevo the
    // customer gets no welcome, which is the failure worth having.
    await ref.set({ welcomeEmailSentAt: new Date().toISOString() }, { merge: true });
  } catch (err) {
    return res.status(500).json({ error: 'Could not record the send', detail: (err as Error).message });
  }

  const name = String(req.body?.name ?? caller.name ?? '').trim().slice(0, 120);
  const mail = accountWelcomeEmail({ name: name || null, email: to });

  const result = await sendEmail({
    to,
    toName: name || undefined,
    subject: mail.subject,
    html: mail.html,
    text: mail.text,
    tag: 'account-welcome',
  });

  if (result.error) console.error(`[api/account-welcome] ${caller.uid}:`, result.error);

  // Nothing reached Brevo, so this account has not had its welcome. Release
  // the stamp rather than recording a send that did not happen.
  if (result.skipped) {
    console.warn(`[api/account-welcome] ${caller.uid}: ${result.skipped}`);
    await ref.set({ welcomeEmailSentAt: null }, { merge: true }).catch(() => {});
  }

  // 200 even on a failed send: the account exists and works, and the caller
  // must never surface this as a signup problem.
  return res.status(200).json({ ...result, configured: emailConfigured() });
}
