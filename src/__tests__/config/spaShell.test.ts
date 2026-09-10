import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * The white-page bug, pinned down.
 *
 * index.html is a shell that loads a content-hashed bundle. Every rebuild —
 * including one triggered only by an environment-variable change — moves that
 * hash. A browser holding the previous shell then requests a file that is no
 * longer deployed, and what the server answers decides whether the visitor
 * sees the shop or a blank screen:
 *
 *   - the HTML shell, 200 OK  → Chrome refuses to execute a module served as
 *     text/html, the app never boots, and the page is silently white
 *   - a real 404              → an error event, which boot-check.js turns into
 *     a single reload onto the current shell
 *
 * Both halves are configuration, both are one character from being undone, and
 * neither shows up in any component test. Hence this file.
 */

const root = resolve(__dirname, '../../..');
const vercel = JSON.parse(readFileSync(resolve(root, 'vercel.json'), 'utf8'));
const indexHtml = readFileSync(resolve(root, 'index.html'), 'utf8');
const bootCheck = readFileSync(resolve(root, 'public/boot-check.js'), 'utf8');

describe('SPA shell recovery', () => {
  const rewrite = (vercel.rewrites ?? []).find((r: { destination: string }) => r.destination === '/index.html');

  it('has a catch-all rewrite to the shell', () => {
    expect(rewrite).toBeDefined();
  });

  it('never rewrites a missing asset to the HTML shell', () => {
    const pattern = new RegExp(`^${rewrite.source}$`);

    // These must fall through to a real 404, not the shell.
    expect(pattern.test('/assets/index-DEADBEEF.js')).toBe(false);
    expect(pattern.test('/assets/react-DXoTT26f.js')).toBe(false);
    expect(pattern.test('/boot-check.js')).toBe(false);
    expect(pattern.test('/api/orders')).toBe(false);

    // Real routes must still reach the shell, or every deep link 404s.
    expect(pattern.test('/')).toBe(true);
    expect(pattern.test('/products')).toBe(true);
    expect(pattern.test('/checkout')).toBe(true);
    expect(pattern.test('/products/apple-iphone-13-128gb')).toBe(true);
  });

  it('loads the recovery script before the bundle, and without defer', () => {
    const bootTag = indexHtml.indexOf('src="/boot-check.js"');
    expect(bootTag).toBeGreaterThan(-1);

    // Vite rewrites the dev entry to the hashed bundle at build time; either
    // form has to come after boot-check, or the listener misses the failure.
    const moduleTag = indexHtml.indexOf('<script type="module"');
    expect(moduleTag).toBeGreaterThan(-1);
    expect(bootTag).toBeLessThan(moduleTag);

    // `defer` would push it past the very error it exists to catch.
    const tag = indexHtml.slice(indexHtml.lastIndexOf('<script', bootTag), indexHtml.indexOf('>', bootTag) + 1);
    expect(tag).not.toContain('defer');
    expect(tag).not.toContain('async');
  });

  it('reloads at most once, so a genuine failure cannot become a loop', () => {
    expect(bootCheck).toContain('sessionStorage');
    expect(bootCheck.match(/location\.reload\(\)/g) ?? []).toHaveLength(1);
    // The second failure has to end in a message, not another reload.
    expect(bootCheck).toContain('This page did not load');
  });

  it('only reacts to the module bundle, never to a third-party script', () => {
    // PayPal and the JSON-LD blocks are plain scripts. Reloading the page
    // because PayPal's SDK failed would be its own outage.
    expect(bootCheck).toContain("!== 'module'");
  });
});
