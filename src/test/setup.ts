import '@testing-library/jest-dom';
import { vi, beforeEach, afterEach } from 'vitest';

// ── Global Firebase mocks ─────────────────────────────────────
// Prevents real network calls in any test that imports AuthContext,
// CheckoutContext, ProductDetail, AccountPage etc. The SDK modules are mocked
// rather than src/lib/firebase.ts, so a test can spy on the individual
// functions (getDocs, signInWithEmailAndPassword, ...) it cares about.

vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({ name: '[DEFAULT]' })),
  getApps: vi.fn(() => []),
  getApp: vi.fn(() => ({ name: '[DEFAULT]' })),
}));

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({ currentUser: null })),
  // Immediately reports "signed out" so providers finish loading instead of
  // hanging every test that renders inside AuthProvider.
  onAuthStateChanged: vi.fn((_auth, next) => {
    if (typeof next === 'function') next(null);
    return vi.fn();
  }),
  // providerData mirrors a real Firebase user — the app reads it to tell a
  // Google account (no password to change) from a password one.
  signInWithEmailAndPassword: vi.fn(() => Promise.resolve({ user: { uid: 'u1', email: 'a@b.c', providerData: [{ providerId: 'password' }] } })),
  createUserWithEmailAndPassword: vi.fn(() => Promise.resolve({ user: { uid: 'u1', email: 'a@b.c', providerData: [{ providerId: 'password' }] } })),
  signInWithPopup: vi.fn(() => Promise.resolve({ user: { uid: 'u1', email: 'a@b.c', providerData: [{ providerId: 'google.com' }] } })),
  signInWithRedirect: vi.fn(() => Promise.resolve()),
  // credentialFromError is a static on the real provider — it is how the
  // Google credential is recovered from an
  // auth/account-exists-with-different-credential failure so it can be linked
  // to the existing password account instead of being thrown away.
  GoogleAuthProvider: class {
    setCustomParameters() {}
    static credentialFromError = vi.fn(() => ({ providerId: 'google.com' }));
  },
  signOut: vi.fn(() => Promise.resolve()),
  sendPasswordResetEmail: vi.fn(() => Promise.resolve()),
  updateProfile: vi.fn(() => Promise.resolve()),
  updatePassword: vi.fn(() => Promise.resolve()),
  fetchSignInMethodsForEmail: vi.fn(() => Promise.resolve([] as string[])),
  // Phone sign-in. confirm() resolves with a user carrying a phoneNumber, so
  // toUser() can fall back to it when there is no email or display name.
  signInWithPhoneNumber: vi.fn(() => Promise.resolve({
    confirm: vi.fn(() => Promise.resolve({ user: { uid: 'p1', email: null, phoneNumber: '+447700900123', providerData: [{ providerId: 'phone' }] } })),
  })),
  linkWithPhoneNumber: vi.fn(() => Promise.resolve({
    confirm: vi.fn(() => Promise.resolve({ user: { uid: 'u1', email: 'a@b.c', phoneNumber: '+447700900123', providerData: [{ providerId: 'password' }, { providerId: 'phone' }] } })),
  })),
  RecaptchaVerifier: class { constructor() {} clear() {} render() { return Promise.resolve(0); } },
  linkWithCredential: vi.fn(() => Promise.resolve({ user: { uid: 'u1', email: 'a@b.c', providerData: [{ providerId: 'password' }, { providerId: 'google.com' }] } })),
}));

vi.mock('firebase/firestore', () => {
  const emptySnap = { empty: true, docs: [], size: 0 };
  return {
    getFirestore: vi.fn(() => ({})),
    collection: vi.fn((_db, ...path: string[]) => ({ path: path.join('/') })),
    doc: vi.fn((_db, ...path: string[]) => ({ path: path.join('/'), id: path[path.length - 1] })),
    getDoc: vi.fn(() => Promise.resolve({ exists: () => false, data: () => undefined, id: 'mock' })),
    getDocs: vi.fn(() => Promise.resolve(emptySnap)),
    setDoc: vi.fn(() => Promise.resolve()),
    addDoc: vi.fn(() => Promise.resolve({ id: 'mock-id' })),
    updateDoc: vi.fn(() => Promise.resolve()),
    deleteDoc: vi.fn(() => Promise.resolve()),
    query: vi.fn((...args: unknown[]) => ({ args })),
    where: vi.fn(() => ({})),
    orderBy: vi.fn(() => ({})),
    limit: vi.fn(() => ({})),
    serverTimestamp: vi.fn(() => new Date().toISOString()),
    writeBatch: vi.fn(() => ({ set: vi.fn(), delete: vi.fn(), commit: vi.fn(() => Promise.resolve()) })),
  };
});

vi.mock('firebase/storage', () => ({
  getStorage: vi.fn(() => ({})),
  ref: vi.fn((_s, path: string) => ({ fullPath: path })),
  uploadBytes: vi.fn(() => Promise.resolve({})),
  getDownloadURL: vi.fn(() => Promise.resolve('https://example.test/image.jpg')),
  deleteObject: vi.fn(() => Promise.resolve()),
  listAll: vi.fn(() => Promise.resolve({ items: [] })),
}));

// ── localStorage mock ─────────────────────────────────────────
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = String(value); },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
    get length() { return Object.keys(store).length; },
    key: (i: number) => Object.keys(store)[i] ?? null,
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock, writable: true });

// ── sessionStorage mock ───────────────────────────────────────
const sessionStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = String(value); },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
    get length() { return Object.keys(store).length; },
    key: (i: number) => Object.keys(store)[i] ?? null,
  };
})();
Object.defineProperty(window, 'sessionStorage', { value: sessionStorageMock, writable: true });

// ── matchMedia mock (many components query this) ──────────────
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// ── scrollTo stub ─────────────────────────────────────────────
Object.defineProperty(window, 'scrollTo', { value: vi.fn(), writable: true });

// ── IntersectionObserver stub ─────────────────────────────────
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
})) as unknown as typeof IntersectionObserver;

// ── ResizeObserver stub ───────────────────────────────────────
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
})) as unknown as typeof ResizeObserver;

// ── Reset storage between tests ───────────────────────────────
beforeEach(() => {
  localStorageMock.clear();
  sessionStorageMock.clear();
});

afterEach(() => {
  vi.clearAllMocks();
});
