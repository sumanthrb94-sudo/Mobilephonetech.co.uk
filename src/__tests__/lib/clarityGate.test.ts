import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Clarity records sessions and sets cookies, so it must not touch the page
 * before the visitor accepts — the same rule GA4 lives under. The guarantee
 * that matters is "no script tag is injected", checked directly, because a
 * Clarity tag that loads early is a consent violation that looks like nothing.
 *
 * It is also dormant without a project id, so the site is unaffected until the
 * id is in the environment.
 */

const CONSENT_KEY = 'cookie_consent';

async function freshModule() {
  vi.resetModules();
  return import('../../lib/clarity');
}

function clarityTags(): HTMLScriptElement[] {
  return Array.from(document.querySelectorAll('script[src*="clarity.ms"]'));
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  document.querySelectorAll('script').forEach(s => s.remove());
  vi.stubEnv('VITE_CLARITY_PROJECT_ID', 'test1234');
});
afterEach(() => vi.unstubAllEnvs());

describe('Microsoft Clarity consent gate', () => {
  it('injects no tag before consent', async () => {
    const { startClarity } = await freshModule();
    startClarity();
    expect(clarityTags()).toHaveLength(0);
  });

  it('injects no tag when the visitor has declined', async () => {
    localStorage.setItem(CONSENT_KEY, 'declined');
    const { startClarity } = await freshModule();
    startClarity();
    expect(clarityTags()).toHaveLength(0);
  });

  it('injects the tag once the visitor has accepted', async () => {
    localStorage.setItem(CONSENT_KEY, 'accepted');
    const { startClarity } = await freshModule();
    startClarity();
    const tags = clarityTags();
    expect(tags).toHaveLength(1);
    expect(tags[0].src).toContain('/tag/test1234');
  });

  it('injects only one tag however many times it is called', async () => {
    localStorage.setItem(CONSENT_KEY, 'accepted');
    const { startClarity } = await freshModule();
    startClarity();
    startClarity();
    startClarity();
    expect(clarityTags()).toHaveLength(1);
  });

  it('does nothing when no project id is configured, even with consent', async () => {
    vi.stubEnv('VITE_CLARITY_PROJECT_ID', '');
    localStorage.setItem(CONSENT_KEY, 'accepted');
    const { startClarity } = await freshModule();
    startClarity();
    expect(clarityTags()).toHaveLength(0);
  });
});
