// Minimal API host for end-to-end runs.
//
//   node e2e/api-server.mjs        (listens on :4174)
//
// `vite preview` serves static files only, so the /api routes that Vercel runs
// as serverless functions simply do not exist under it. That was tolerable
// while orders were written straight from the browser — and precisely the
// reason the price-tampering hole went unnoticed by the suites.
//
// Now that pricing is server-side, the E2E run has to exercise the real
// handler. This bundles each api/*.ts route with esbuild and mounts it at its
// own path, so the code under test is the code that ships. vite.config proxies
// /api here during preview.
import { createServer } from 'node:http';
import { readdirSync, mkdirSync, rmSync } from 'node:fs';
import { join, basename } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = new URL('..', import.meta.url).pathname;
const API_DIR = join(ROOT, 'api');
const PORT = Number(process.env.E2E_API_PORT || 4174);

// Collect top-level and nested route files, skipping shared _helpers.
function routeFiles(dir, prefix = '') {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('_')) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...routeFiles(full, `${prefix}${entry.name}/`));
    } else if (entry.name.endsWith('.ts')) {
      out.push({ file: full, route: `/api/${prefix}${basename(entry.name, '.ts')}` });
    }
  }
  return out;
}

// Inside the project, not /tmp: the bundles import firebase-admin and friends
// as bare specifiers, and Node resolves those by walking up from the file — so
// a bundle in /tmp finds no node_modules at all.
const outDir = join(ROOT, 'node_modules', '.lehart-api');
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
const routes = routeFiles(API_DIR);

// Bundle only our own files: `packages: 'external'` leaves every bare import
// in node_modules alone. Bundling them in converts CJS to ESM and breaks any
// dynamic require() inside — google-auth-library, reached through
// firebase-admin, does exactly that.
await Promise.all(routes.map(({ file, route }) => build({
  entryPoints: [file],
  outfile: join(outDir, `${route.replace(/\//g, '_')}.mjs`),
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  packages: 'external',
  logLevel: 'silent',
})));

// Imported on first request, not at boot: a route that cannot even load (a
// missing optional dependency, say) should 500 on itself rather than stop
// every other route from being testable.
const bundles = new Map(routes.map(({ route }) => [route, join(outDir, `${route.replace(/\//g, '_')}.mjs`)]));
const handlers = new Map();

async function handlerFor(route) {
  if (handlers.has(route)) return handlers.get(route);
  const mod = await import(pathToFileURL(bundles.get(route)).href);
  handlers.set(route, mod.default);
  return mod.default;
}

console.log(`[api] ${bundles.size} routes on :${PORT} — ${[...bundles.keys()].join(', ')}`);

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://127.0.0.1:${PORT}`);
  if (!bundles.has(url.pathname)) {
    res.writeHead(404, { 'content-type': 'application/json' });
    return res.end(JSON.stringify({ error: 'No such route' }));
  }

  let handler;
  try {
    handler = await handlerFor(url.pathname);
  } catch (err) {
    res.writeHead(500, { 'content-type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Route failed to load', detail: String(err?.message ?? err) }));
  }

  // Body
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  let body = {};
  try { body = raw ? JSON.parse(raw) : {}; } catch { body = {}; }

  // Shim the bits of the Vercel request/response objects the handlers use.
  const query = Object.fromEntries(url.searchParams.entries());
  const shimReq = { ...req, method: req.method, headers: req.headers, query, body, socket: req.socket };

  let statusCode = 200;
  const shimRes = {
    setHeader: (k, v) => { res.setHeader(k, v); return shimRes; },
    status: (code) => { statusCode = code; return shimRes; },
    json: (data) => {
      res.writeHead(statusCode, { 'content-type': 'application/json' });
      res.end(JSON.stringify(data));
      return shimRes;
    },
    end: (data) => { res.writeHead(statusCode); res.end(data); return shimRes; },
  };

  try {
    await handler(shimReq, shimRes);
  } catch (err) {
    if (!res.headersSent) {
      res.writeHead(500, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: 'Handler threw', detail: String(err?.message ?? err) }));
    }
  }
});

server.listen(PORT, '127.0.0.1', () => console.log(`[api] ready`));
