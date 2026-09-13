import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * The boot splash covers the gap between first paint and React mounting.
 * Its failure mode is not a cosmetic one: a splash that never leaves sits
 * over a working shop for ever, and it cannot be styled or clicked away.
 *
 * These assert the two structural facts it depends on, both of which live
 * in index.html and public/boot-check.js rather than in the bundle — so
 * nothing else in the test suite would notice them breaking.
 */

// import.meta.url is not a file: URL under the jsdom environment, so these
// resolve from the project root that vitest already runs in.
const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');

const html = read('index.html');
const bootCheck = read('public/boot-check.js');
const main = read('src/main.tsx');

describe('boot splash', () => {
  it('is a sibling of #root, never a child', () => {
    // boot-check.js decides whether the app booted by asking whether #root is
    // empty. Splash markup inside it would make a failed boot look like a
    // successful one, and the recovery reload would never fire.
    const root = html.indexOf('<div id="root">');
    const splash = html.indexOf('<div id="app-splash"');

    expect(splash).toBeGreaterThan(-1);
    expect(root).toBeGreaterThan(-1);
    expect(splash).toBeLessThan(root);
    expect(html.slice(splash, root)).toContain('</div>');
  });

  it('is taken down by the app once React has painted', () => {
    expect(main).toContain("getElementById('app-splash')");
    // A transitionend alone is not enough: it never fires when the transition
    // is off (reduced motion, hidden tab), which would strand the splash.
    expect(main).toContain('transitionend');
    expect(main).toMatch(/setTimeout/);
  });

  it('is taken down by the boot recovery when the bundle never arrives', () => {
    const explain = bootCheck.slice(bootCheck.indexOf('function explain()'));
    expect(explain).toContain("getElementById('app-splash')");
    expect(explain).toContain('removeChild');
  });

  it('holds still for a visitor who asked for reduced motion', () => {
    const reduced = html.slice(html.indexOf('prefers-reduced-motion'));
    expect(reduced).toContain('animation: none');
  });
});
