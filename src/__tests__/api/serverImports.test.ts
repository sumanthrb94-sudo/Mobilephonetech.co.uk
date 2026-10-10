import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

/**
 * The serverless functions run the TypeScript as plain Node ESM, which needs
 * the file extension on every relative import. Vite and Vitest resolve an
 * import without it, so a missing ".js" passes every other check and then
 * breaks the live route: an extensionless import in productMapper took
 * /api/catalogue down with ERR_MODULE_NOT_FOUND. This walks everything the
 * API loads and fails on any such import.
 */
const ROOT = resolve(__dirname, '../../..');
const IMPORT = /^\s*(?:import|export)\s+(?!type\b)(?:[^'"]*?\sfrom\s+)?['"](\.{1,2}\/[^'"]+)['"]/gm;

function apiEntries(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? apiEntries(p) : /\.ts$/.test(name) ? [p] : [];
  });
}

function sourceOf(spec: string, from: string): string | null {
  const base = resolve(dirname(from), spec);
  for (const candidate of [base.replace(/\.js$/, '.ts'), base.replace(/\.js$/, '.tsx'), base]) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  return null;
}

describe('every module the API loads imports with a file extension', () => {
  it('has no extensionless relative import', () => {
    const seen = new Set<string>();
    const queue = apiEntries(join(ROOT, 'api'));
    const problems: string[] = [];
    while (queue.length) {
      const file = queue.pop()!;
      if (seen.has(file)) continue;
      seen.add(file);
      const text = readFileSync(file, 'utf8');
      for (const m of text.matchAll(IMPORT)) {
        const spec = m[1];
        if (!/\.(js|json|mjs|cjs)$/.test(spec)) problems.push(`${file.replace(ROOT + '/', '')}: '${spec}'`);
        const next = sourceOf(spec, file);
        if (next) queue.push(next);
      }
    }
    expect(seen.size).toBeGreaterThan(10);
    expect(problems).toEqual([]);
  });
});
