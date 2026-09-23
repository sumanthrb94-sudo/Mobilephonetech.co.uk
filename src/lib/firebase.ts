import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, type Auth } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, type Firestore } from 'firebase/firestore';
import { getStorage, connectStorageEmulator, type FirebaseStorage } from 'firebase/storage';

const config = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY as string,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID as string,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID as string,
  // Optional. Present only when Google Analytics for Firebase is enabled on
  // the project. Nothing loads it here — see src/lib/firebaseAnalytics.ts,
  // which waits for consent first.
  measurementId:     import.meta.env.VITE_FIREBASE_MEASUREMENT_ID as string | undefined,
};

export const isFirebaseConfigured = Boolean(config.apiKey && config.projectId && config.authDomain);

if (!isFirebaseConfigured) {
  console.warn('[firebase] Missing VITE_FIREBASE_* env vars — auth and data features will be unavailable.');
}

/**
 * `initializeApp` throws on an empty apiKey, and this module is imported by
 * AuthContext, which wraps every route — so that throw would take the whole app
 * down at import time and render a blank page, before any per-query fallback
 * got a chance to run. Hand it syntactically valid placeholders instead: the
 * app boots, requests fail normally, and the existing fallbacks handle it.
 *
 * getApps() guards against Vite HMR re-running this module and tripping the
 * "Firebase App named '[DEFAULT]' already exists" error.
 */
const PLACEHOLDER = {
  apiKey: 'unconfigured',
  authDomain: 'unconfigured.firebaseapp.com',
  projectId: 'unconfigured',
  storageBucket: 'unconfigured.appspot.com',
  messagingSenderId: '0',
  appId: '1:0:web:0',
};

export const app: FirebaseApp = getApps().length
  ? getApp()
  : initializeApp(isFirebaseConfigured ? config : PLACEHOLDER);

export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);
export const storage: FirebaseStorage = getStorage(app);

/**
 * Point the SDK at the local emulator suite when VITE_FIREBASE_EMULATOR=true.
 *
 * This is what lets the E2E suite exercise the real security rules instead of
 * a hand-written stub of them — a stub can only ever encode what I already
 * believe the rules do, which is precisely the thing worth testing.
 *
 * Guarded so it can never fire against a production build: the flag has to be
 * set at build time, and connecting twice throws.
 */
export const usingEmulators = import.meta.env.VITE_FIREBASE_EMULATOR === 'true';

if (usingEmulators) {
  const host = (import.meta.env.VITE_FIREBASE_EMULATOR_HOST as string) || '127.0.0.1';
  connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true });
  connectFirestoreEmulator(db, host, 8080);
  connectStorageEmulator(storage, host, 9199);
  console.info('[firebase] using local emulators');
}

/**
 * Run an admin write, and if it is refused for looking unauthorised, force a
 * genuinely fresh ID token and try exactly once more before giving up.
 *
 * WHY THIS EXISTS
 *
 * AdminRoute already forces a fresh token before it lets someone into
 * /admin at all, which closes the common case: a claim granted while a tab
 * was already open. But a mobile connection can drop that very refresh —
 * weak signal, a battery saver throttling background requests — and
 * AdminRoute has no way to know its own refresh silently failed; it just
 * falls back to whatever token was already cached, which is exactly the
 * stale one the refresh was supposed to replace. The person then sees the
 * console (the UI is reading the same stale-but-still-decodable cached
 * claims) and gets refused the instant they try to change anything,
 * because Firestore checks the token actually attached to the write, not
 * what the UI believes. Retrying the write itself, immediately after its
 * own forced refresh, catches that case regardless of why the earlier one
 * didn't stick — and costs nothing extra for the overwhelmingly common
 * case where the first attempt just works.
 */
export async function withAdminRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    const code = (err as { code?: string })?.code ?? '';
    const message = (err as { message?: string })?.message ?? '';
    const looksUnauthorised = code === 'permission-denied' || code === 'storage/unauthorized'
      || /insufficient permissions/i.test(message);
    if (!looksUnauthorised || !auth.currentUser) throw err;

    try {
      await auth.currentUser.getIdToken(true);
    } catch {
      // The refresh itself failed (offline, etc.) — the original error is
      // the more useful one to surface, not a network error about the retry.
      throw err;
    }
    return await fn();
  }
}

/** Collection names, in one place so a rename cannot drift between callers. */
export const COL = {
  products: 'products',
  users: 'users',
  orders: 'orders',
  reviews: 'reviews',
  tradeInQuotes: 'tradeInQuotes',
  newsletter: 'newsletterSubscribers',
  returns: 'returns',
  banners: 'banners',
  siteLayout: 'siteLayout',
  seriesPanels: 'seriesPanels',
  // The managed list of models a listing may be for, and staff requests for
  // ones it lacks — see src/lib/catalogue.ts.
  catalogueModels: 'catalogueModels',
  modelRequests: 'modelRequests',
  conversations: 'conversations',
  // Per-user subcollections under users/{uid}
  cart: 'cart',
  wishlist: 'wishlist',
  // Subcollection under conversations/{uid}
  messages: 'messages',
} as const;
