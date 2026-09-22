import { timingSafeEqual } from 'node:crypto';
import { adminAuth, adminDb, getAdminInitError } from '../_firebaseAdmin.js';

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
 * 2. The emails it will promote come from ADMIN_EMAILS and STAFF_EMAILS, not
 *    from the request. So even if the secret leaks, an attacker cannot
 *    promote an address of their choosing — they would also need write access
 *    to the Vercel environment, at which point they own the deployment anyway.
 *
 * Two roles are granted here, matching src/lib/adminRoles.ts:
 *
 *   ADMIN_EMAILS — managers. Everything, including what the shop front says.
 *   STAFF_EMAILS — the daily work: products, orders, returns, support.
 *
 * An address in both lists is made a manager, because the alternative is to
 * silently demote whoever put it there.
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

  const parse = (raw: string | undefined) => (raw ?? '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);

  const adminEmails = parse(process.env.ADMIN_EMAILS);
  // An address in both lists is a manager. Letting the smaller role win would
  // quietly demote whoever added it to ADMIN_EMAILS, and a demotion nobody
  // asked for is worse than a duplicate entry.
  const staffEmails = parse(process.env.STAFF_EMAILS).filter(e => !adminEmails.includes(e));

  const grants: Array<{ email: string; role: 'admin' | 'staff' }> = [
    ...adminEmails.map(email => ({ email, role: 'admin' as const })),
    ...staffEmails.map(email => ({ email, role: 'staff' as const })),
  ];

  if (!grants.length) {
    return res.status(400).json({
      error: 'Neither ADMIN_EMAILS nor STAFF_EMAILS is set.',
      hint: 'Set one to a comma-separated list of addresses. ADMIN_EMAILS grants the manager role, STAFF_EMAILS the staff role.',
    });
  }

  const auth = await adminAuth();
  const db = await adminDb();
  if (!auth || !db) {
    return res.status(503).json({
      error: 'Firebase Admin SDK is not initialised',
      detail: getAdminInitError() ?? 'FIREBASE_SERVICE_ACCOUNT missing',
    });
  }

  const results: Array<Record<string, unknown>> = [];

  for (const { email, role } of grants) {
    try {
      const user = await auth.getUserByEmail(email);

      // setCustomUserClaims replaces the whole claims object, so send the full
      // set rather than only the flag being changed. The two roles are never
      // both set: firestore.rules reads isStaff() as an OR over them, so a
      // manager already has everything staff has.
      const claims = role === 'admin' ? { admin: true } : { staff: true };
      await auth.setCustomUserClaims(user.uid, claims);

      // Mirror into the profile for display. The rules never read this — they
      // read the claim — but the console shows it.
      await db.collection('users').doc(user.uid).set({
        fullName: user.displayName ?? email.split('@')[0],
        email,
        role,
        updatedAt: new Date().toISOString(),
      }, { merge: true });

      // Read the claim back rather than trusting the write: a silent failure
      // would otherwise be indistinguishable from success.
      const after = await auth.getUser(user.uid);
      const landed = role === 'admin'
        ? after.customClaims?.admin === true
        : after.customClaims?.staff === true;
      results.push({
        email,
        role,
        status: landed ? 'promoted' : 'FAILED',
        uid: user.uid,
      });
    } catch (err) {
      const code = (err as { code?: string })?.code ?? '';
      results.push({
        email,
        role,
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
