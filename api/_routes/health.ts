import { adminAuth, adminDb, getAdminInitError } from '../_firebaseAdmin.js';
import { emailConfigured, senderDomainWarning } from '../_email.js';

/**
 * Deployment health check.
 *
 * Reports whether the serverless functions can actually reach Firestore, how
 * long it took, and how many products are visible. Reachable-but-empty is
 * reported as degraded rather than ok: the storefront's MOCK_PHONES fallback
 * would otherwise disguise an unseeded database as a working shop.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Never cache: a stale "ok" is worse than no health check at all.
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  const checks: Record<string, unknown> = {
    projectId: process.env.VITE_FIREBASE_PROJECT_ID ?? null,
    webConfigured: Boolean(process.env.VITE_FIREBASE_API_KEY && process.env.VITE_FIREBASE_PROJECT_ID),
    serviceAccountConfigured: Boolean(process.env.FIREBASE_SERVICE_ACCOUNT),
    // Whether transactional mail can actually go out. Without this the only
    // symptom of an unset BREVO_API_KEY is a welcome email that never arrives,
    // and sendEmail turns a missing key into a silent no-op by design — so
    // there is nothing anywhere to distinguish "not configured" from "Brevo
    // rejected it". The sender address is in the header of every email we
    // send, so naming it here reveals nothing; the key itself is never shown.
    emailConfigured: emailConfigured(),
    emailFrom: process.env.EMAIL_FROM ?? null,
    smsConfigured: Boolean(process.env.BREVO_API_KEY && process.env.SMS_SENDER),
  };

  // Configuration that is present, accepted everywhere, and still wrong. These
  // are the failures with no error to find: every log says the mail was sent.
  const warnings = [senderDomainWarning()].filter(Boolean);
  if (warnings.length) checks.warnings = warnings;

  const db = await adminDb();
  if (!db) {
    checks.database = 'unconfigured';
    checks.detail = getAdminInitError() ?? 'FIREBASE_SERVICE_ACCOUNT missing from the environment';
    return res.status(503).json({ status: 'degraded', checks });
  }

  const started = Date.now();

  try {
    // count() is an aggregation query — billed as roughly one read rather than
    // one per document, so this stays cheap however large the catalogue grows.
    const snapshot = await db.collection('products').count().get();
    const products = snapshot.data().count;

    checks.database    = 'connected';
    checks.productRows = products;
    checks.latencyMs   = Date.now() - started;

    // Confirm the sign-in providers are actually usable, not just ticked in the
    // console: listing users exercises the same credential path auth does.
    try {
      const auth = await adminAuth();
      if (auth) {
        const list = await auth.listUsers(1);
        checks.authReachable = true;
        checks.hasUsers = list.users.length > 0;
      }
    } catch (err) {
      checks.authReachable = false;
      checks.authDetail = (err as Error).message;
    }

    if (!products) {
      checks.detail = 'products collection is empty — run scripts/seed-firestore.mjs';
      return res.status(503).json({ status: 'degraded', checks });
    }

    return res.status(200).json({ status: 'ok', checks });
  } catch (err) {
    checks.database  = 'unreachable';
    checks.latencyMs = Date.now() - started;
    checks.detail    = err instanceof Error ? err.message : String(err);
    return res.status(503).json({ status: 'degraded', checks });
  }
}
