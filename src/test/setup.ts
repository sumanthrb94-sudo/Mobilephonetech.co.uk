import '@testing-library/jest-dom';
import { vi, beforeEach, afterEach } from 'vitest';

// ── Global Supabase mock ──────────────────────────────────────
// Prevents real network calls in any test that imports CheckoutContext,
// ProductDetail, AccountPage etc. Individual tests can override vi.mock().
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({ data: [], error: null, count: 0 }),
      insert: () => ({ select: () => ({ single: () => Promise.resolve({ data: { id: 'mock-id' }, error: null }) }) }),
      upsert: () => Promise.resolve({ error: null }),
      update: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }),
      delete: () => ({ eq: () => Promise.resolve({ error: null }) }),
    }),
    auth: {
      getSession:      () => Promise.resolve({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }),
      signInWithPassword: () => Promise.resolve({ data: {}, error: null }),
      signUp:          () => Promise.resolve({ data: {}, error: null }),
      signOut:         () => Promise.resolve({ error: null }),
      updateUser:      () => Promise.resolve({ data: {}, error: null }),
    },
  },
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
