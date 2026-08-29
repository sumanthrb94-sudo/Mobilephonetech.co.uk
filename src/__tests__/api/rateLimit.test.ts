import { describe, it, expect, beforeEach } from 'vitest';
import { allowRequest, clientIp, resetRateLimits } from '../../../api/_rateLimit.js';

describe('allowRequest', () => {
  beforeEach(() => resetRateLimits());

  it('allows up to the limit within a window', () => {
    for (let i = 0; i < 5; i++) {
      expect(allowRequest('k', { limit: 5, windowMs: 60_000 }).allowed).toBe(true);
    }
  });

  it('refuses the request after the limit, with a retry hint', () => {
    for (let i = 0; i < 3; i++) allowRequest('k', { limit: 3, windowMs: 60_000 });
    const refused = allowRequest('k', { limit: 3, windowMs: 60_000 });
    expect(refused.allowed).toBe(false);
    expect(refused.retryAfterSeconds).toBeGreaterThan(0);
    expect(refused.retryAfterSeconds).toBeLessThanOrEqual(60);
  });

  it('keeps windows separate per key', () => {
    for (let i = 0; i < 3; i++) allowRequest('a', { limit: 3, windowMs: 60_000 });
    expect(allowRequest('a', { limit: 3, windowMs: 60_000 }).allowed).toBe(false);
    expect(allowRequest('b', { limit: 3, windowMs: 60_000 }).allowed).toBe(true);
  });

  it('opens a fresh window after the old one expires', () => {
    // A 0ms window is expired by the time of the next call — no fake timers needed.
    allowRequest('k', { limit: 1, windowMs: 0 });
    expect(allowRequest('k', { limit: 1, windowMs: 0 }).allowed).toBe(true);
  });
});

describe('clientIp', () => {
  it('takes the first x-forwarded-for entry', () => {
    expect(clientIp({ headers: { 'x-forwarded-for': '203.0.113.9, 10.0.0.1' } })).toBe('203.0.113.9');
  });

  it('falls back to unknown when nothing identifies the caller', () => {
    expect(clientIp({ headers: {} })).toBe('unknown');
  });
});
