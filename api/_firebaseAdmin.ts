import type { App } from 'firebase-admin/app';
import type { Auth } from 'firebase-admin/auth';
import type { Firestore } from 'firebase-admin/firestore';

/**
 * Firebase Admin SDK for the serverless functions.
 *
 * Credentials come from FIREBASE_SERVICE_ACCOUNT — the service-account JSON,
 * either raw or base64-encoded (Vercel's env editor mangles multi-line values,
 * so base64 is the safer paste). Never prefix it with VITE_: that would inline
 * the private key into the browser bundle.
 *
 * Underscore-prefixed so Vercel treats it as a helper rather than a route.
 *
 * firebase-admin is imported dynamically rather than at module scope. A
 * top-level import that throws — a Node version below the package's floor is
 * the realistic case — crashes the whole function before any handler runs, and
 * Vercel reports that as an opaque FUNCTION_INVOCATION_FAILED with nothing to
 * diagnose from. Deferring it turns the same failure into a 503 that says what
 * went wrong.
 */

let cachedApp: App | null = null;
let initError: string | null = null;

function loadCredentials(): Record<string, string> | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) return null;

  const text = raw.trim().startsWith('{')
    ? raw
    : Buffer.from(raw, 'base64').toString('utf8');

  const parsed = JSON.parse(text);
  // Escaped newlines survive most env editors literally; the PEM parser needs
  // them real or it fails with an opaque "Invalid PEM formatted message".
  if (typeof parsed.private_key === 'string') {
    parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
  }
  return parsed;
}

export async function getAdminApp(): Promise<App | null> {
  if (cachedApp) return cachedApp;

  try {
    const { cert, getApp, getApps, initializeApp } = await import('firebase-admin/app');

    if (getApps().length) { cachedApp = getApp(); return cachedApp; }

    const creds = loadCredentials();
    if (!creds) {
      initError = 'FIREBASE_SERVICE_ACCOUNT is not set';
      return null;
    }
    cachedApp = initializeApp({
      credential: cert({
        projectId: creds.project_id,
        clientEmail: creds.client_email,
        privateKey: creds.private_key,
      }),
      projectId: creds.project_id,
    });
    return cachedApp;
  } catch (err) {
    const message = (err as Error).message;
    // Name the Node-version case explicitly: firebase-admin v14 requires
    // Node 22, and on an older runtime the import fails with something that
    // reads like a syntax or module error rather than a version mismatch.
    initError = /Unexpected token|SyntaxError|ERR_REQUIRE_ESM|Cannot find module 'firebase-admin/i.test(message)
      ? `${message} — check the deployment is running Node 22 (package.json sets engines.node)`
      : message;
    return null;
  }
}

export function getAdminInitError(): string | null {
  return initError;
}

/** Firestore handle, or null when credentials are missing or malformed. */
export async function adminDb(): Promise<Firestore | null> {
  const a = await getAdminApp();
  if (!a) return null;
  const { getFirestore } = await import('firebase-admin/firestore');
  return getFirestore(a);
}

export async function adminAuth(): Promise<Auth | null> {
  const a = await getAdminApp();
  if (!a) return null;
  const { getAuth } = await import('firebase-admin/auth');
  return getAuth(a);
}

/**
 * Verify the caller's Firebase ID token from the Authorization header.
 * Returns null when absent or invalid — callers decide whether that is fatal.
 */
export async function verifyCaller(req: { headers?: Record<string, unknown> }) {
  const header = String(req.headers?.authorization ?? req.headers?.Authorization ?? '');
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return null;

  const a = await adminAuth();
  if (!a) return null;

  try {
    return await a.verifyIdToken(token);
  } catch {
    return null;
  }
}

/** True only when the verified token carries the admin custom claim. */
export async function callerIsAdmin(req: { headers?: Record<string, unknown> }): Promise<boolean> {
  const decoded = await verifyCaller(req);
  return decoded?.admin === true;
}
