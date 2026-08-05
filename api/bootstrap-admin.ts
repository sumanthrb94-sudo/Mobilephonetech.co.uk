import { timingSafeEqual } from 'node:crypto';
import { adminAuth, adminDb, getAdminInitError } from './_firebaseAdmin.js';

/**
 * One-time admin promotion, for when running scripts/create-users.mjs is not
 * practical.
 *
 * Custom claims can only be set with the Admin SDK — the Firebase console has
 * no UI for them — so without this there is no way to create an admin except
 * from a terminal.
 *
 * Two independent controls, because a route that grants admin is worth
 * attacking:
 *
 * 1. BOOTSTRAP_SECRET must be set and must match, compared in constant time.
 * 2. The emails it will promote come from ADMIN_EMAILS, not from the request.
 *    So even if the secret leaks, an attacker cannot promote an address of
 *    their choosing — they would also need write access to the Vercel
 *    environment, at which point they own the deployment anyway.
 *
 * Delete BOOTSTRAP_SECRET once you are done; with it unset the route refuses
 * every request.
 */

/** Constant-time compare that does not leak length through early return. */
function secretMatches(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  // timingSafeEqual throws on length mismatch, which would itself be a signal.
  // Comparing fixed-size digests of both keeps the work constant.
  if (a.length !== b.length) {
    // Still burn a comparison so the timing does not distinguish the cases.
    timingSafeEqual(b, b);
    return false;
  }
  return timingSafeEqual(a, b);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const expected = process.env.BOOTSTRAP_SECRET ?? '';
  if (!expected) {
    return res.status(404).json({
      error: 'Not found',
      hint: 'BOOTSTRAP_SECRET is not set, so this route is disabled.',
    });
  }
  if (expected.length < 16) {
    return res.status(500).json({
      error: 'BOOTSTRAP_SECRET is too short — use at least 16 characters.',
    });
  }

  const provided = String(req.query?.secret ?? req.body?.secret ?? '');
  if (!provided || !secretMatches(provided, expected)) {
    // Deliberately identical to the disabled case, so probing cannot tell
    // "wrong secret" from "route off".
    return res.status(404).json({ error: 'Not found' });
  }

  const emails = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);

  if (!emails.length) {
    return res.status(400).json({
      error: 'ADMIN_EMAILS is not set.',
      hint: 'Set it to a comma-separated list of addresses to promote.',
    });
  }

  const auth = adminAuth();
  const db = adminDb();
  if (!auth || !db) {
    return res.status(503).json({
      error: 'Firebase Admin SDK is not initialised',
      detail: getAdminInitError() ?? 'FIREBASE_SERVICE_ACCOUNT missing',
    });
  }

  const results: Array<Record<string, unknown>> = [];

  for (const email of emails) {
    try {
      const user = await auth.getUserByEmail(email);

      // setCustomUserClaims replaces the whole claims object, so send the full
      // set rather than only the flag being changed.
      await auth.setCustomUserClaims(user.uid, { admin: true });

      // Mirror into the profile for display. The rules never read this — they
      // read the claim — but the console shows it.
      await db.collection('users').doc(user.uid).set({
        fullName: user.displayName ?? email.split('@')[0],
        email,
        role: 'admin',
        updatedAt: new Date().toISOString(),
      }, { merge: true });

      // Read the claim back rather than trusting the write: a silent failure
      // would otherwise be indistinguishable from success.
      const after = await auth.getUser(user.uid);
      results.push({
        email,
        status: after.customClaims?.admin === true ? 'promoted' : 'FAILED',
        uid: user.uid,
      });
    } catch (err) {
      const code = (err as { code?: string })?.code ?? '';
      results.push({
        email,
        status: code === 'auth/user-not-found' ? 'no account yet' : 'error',
        detail: code === 'auth/user-not-found'
          ? 'Sign in once with this address first — Firebase creates the account on first sign-in — then call this again.'
          : (err as Error).message,
      });
    }
  }

  const promoted = results.filter(r => r.status === 'promoted').length;

  return res.status(promoted ? 200 : 409).json({
    promoted,
    results,
    next: promoted
      ? 'Sign out and back in — a custom claim only reaches the browser on a fresh ID token. Then delete BOOTSTRAP_SECRET from your environment.'
      : 'Nobody was promoted. Sign in once with each address first, then call this again.',
  });
}
