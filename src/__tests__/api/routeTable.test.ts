import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Guards the two things about the catch-all route table that nothing else can
 * see, and that cost a day of a broken checkout when they were wrong.
 *
 * Vercel's edge does not route a nested /api/a/b path to api/[...route]; it
 * answers its own NOT_FOUND before any of this code runs. So a key containing a
 * slash is registered, imports fine, typechecks, passes every handler test —
 * and is unreachable in production. Only the shape of the key betrays it.
 */

const ROOT = join(__dirname, '../../..');

const routeKeys = (): string[] => {
  const src = readFileSync(join(ROOT, 'api/[...route].ts'), 'utf8');
  const table = src.slice(src.indexOf('const ROUTES'), src.indexOf('\n};'));
  return [...table.matchAll(/^\s*'?([\w/-]+)'?:\s*\(\)/gm)].map(m => m[1]);
};

/** Every '/api/...' string literal in shipped app code, with its file. */
const clientCalls = (): Array<{ file: string; path: string }> => {
  const out: Array<{ file: string; path: string }> = [];
  const files = readdirSync(join(ROOT, 'src'), { recursive: true, encoding: 'utf8' });
  for (const rel of files) {
    if (!/\.tsx?$/.test(rel) || rel.includes('__tests__')) continue;
    const text = readFileSync(join(ROOT, 'src', rel), 'utf8');
    for (const m of text.matchAll(/['"`]\/api\/([\w/-]+)/g)) out.push({ file: rel, path: m[1] });
  }
  return out;
};

describe('api/[...route].ts route table', () => {
  it('registers at least the routes the app depends on', () => {
    expect(routeKeys()).toEqual(expect.arrayContaining(['health', 'orders', 'paypal-create-order']));
  });

  it('has no key with a slash — Vercel cannot route a nested /api path', () => {
    expect(routeKeys().filter(k => k.includes('/'))).toEqual([]);
  });

  it('every /api/... the browser fetches is a registered route', () => {
    const keys = new Set(routeKeys());
    const missing = clientCalls().filter(c => !keys.has(c.path));
    expect(missing, `unregistered endpoints: ${missing.map(m => `${m.path} (${m.file})`).join(', ')}`).toEqual([]);
  });
});
