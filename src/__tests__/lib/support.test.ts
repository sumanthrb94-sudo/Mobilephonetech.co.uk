import { describe, it, expect, vi, type Mock } from 'vitest';
import { readFileSync } from 'node:fs';

vi.mock('../../lib/firebase', () => ({
  db: {},
  COL: { conversations: 'conversations', messages: 'messages' },
}));

vi.mock('firebase/firestore', () => ({
  addDoc: vi.fn(), collection: vi.fn(), doc: vi.fn(), getDoc: vi.fn(),
  increment: vi.fn(), limit: vi.fn(), onSnapshot: vi.fn(), orderBy: vi.fn(),
  query: vi.fn(), serverTimestamp: vi.fn(), setDoc: vi.fn(), updateDoc: vi.fn(),
}));

const { relativeTime, MAX_MESSAGE_LENGTH, sendMessage } = await import('../../lib/support');
const { updateDoc } = await import('firebase/firestore');

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

describe('sendMessage against the Firestore rules', () => {
  // The conversation update a customer makes when they send a message must
  // only touch keys the rule lets a customer change. An extra key (it was
  // `touchedAt`) is denied by the rules AFTER the message itself has saved,
  // so the customer saw an error, retried, and staff never saw the unread
  // count. Reading the allowed keys from the rules file itself means this
  // fails the moment either side drifts.
  it('writes only keys the conversations rule allows a customer to update', async () => {
    await sendMessage('uid-1', 'Hello, is it unlocked?', 'customer', 'Ann');

    const written = Object.keys((updateDoc as Mock).mock.calls.at(-1)![1] as Record<string, unknown>);
    const rules = readFileSync('firestore.rules', 'utf8');
    const block = rules.slice(rules.indexOf('match /conversations/{convId}'));
    const list = /affectedKeys\(\)\.hasOnly\(\[([^\]]*)\]/.exec(block);
    expect(list, 'conversations update rule lists its allowed keys').not.toBeNull();
    const allowed = [...list![1].matchAll(/'(\w+)'/g)].map(m => m[1]);

    expect(written.filter(key => !allowed.includes(key))).toEqual([]);
    expect(written).toEqual(expect.arrayContaining(['lastMessage', 'lastMessageAt', 'lastSender', 'status', 'unreadForAdmin']));
  });
});
