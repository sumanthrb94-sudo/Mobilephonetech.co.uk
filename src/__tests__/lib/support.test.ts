import { describe, it, expect, vi } from 'vitest';

vi.mock('../../lib/firebase', () => ({
  db: {},
  COL: { conversations: 'conversations', messages: 'messages' },
}));

vi.mock('firebase/firestore', () => ({
  addDoc: vi.fn(), collection: vi.fn(), doc: vi.fn(), getDoc: vi.fn(),
  increment: vi.fn(), limit: vi.fn(), onSnapshot: vi.fn(), orderBy: vi.fn(),
  query: vi.fn(), serverTimestamp: vi.fn(), setDoc: vi.fn(), updateDoc: vi.fn(),
}));

const { relativeTime, MAX_MESSAGE_LENGTH } = await import('../../lib/support');

describe('relativeTime', () => {
  const now = new Date('2026-08-21T12:00:00Z').getTime();
  const ago = (ms: number) => new Date(now - ms).toISOString();

  it('shows seconds as "just now"', () => {
    expect(relativeTime(ago(20_000), now)).toBe('just now');
  });

  it('shows minutes', () => {
    expect(relativeTime(ago(5 * 60_000), now)).toBe('5 min ago');
  });

  it('singularises one hour', () => {
    expect(relativeTime(ago(60 * 60_000), now)).toBe('1 hr ago');
    expect(relativeTime(ago(3 * 60 * 60_000), now)).toBe('3 hrs ago');
  });

  it('singularises one day', () => {
    expect(relativeTime(ago(86_400_000), now)).toBe('1 day ago');
    expect(relativeTime(ago(3 * 86_400_000), now)).toBe('3 days ago');
  });

  it('falls back to a date beyond a week', () => {
    expect(relativeTime(ago(30 * 86_400_000), now)).toMatch(/\d+ \w+/);
  });

  it('never renders a negative age from a clock skew', () => {
    // Server and browser clocks disagree; "in -3 minutes" is worse than "just now".
    expect(relativeTime(new Date(now + 60_000).toISOString(), now)).toBe('just now');
  });

  it('returns empty string for an unparseable timestamp', () => {
    expect(relativeTime('nonsense', now)).toBe('');
  });
});

describe('message limits', () => {
  it('caps message length', () => {
    expect(MAX_MESSAGE_LENGTH).toBe(2000);
  });
});
