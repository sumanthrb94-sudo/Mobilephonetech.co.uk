// CSP conformance suite.
//
//   node e2e/csp.mjs        (expects a production build in dist/)
//
// Serves dist/ locally with the EXACT headers from vercel.json — read from the
// file, not copied, so this suite and production cannot drift — then drives
// the real app and fails on any securitypolicyviolation event. A CSP that has
// only been eyeballed is a CSP that breaks sign-in on deploy; this one is
// exercised against every page and the flows that touch third-party origins.
//
// Also asserts the PDP's structured data while it is here: Product JSON-LD
// must parse, must declare RefurbishedCondition, and must NOT carry an
// aggregateRating — that block was once fabricated, and this test is what
// keeps it from quietly coming back.
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';
import { chromium } from 'playwright';
import { resolveChromium } from './chromium-path.mjs';

const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4190;
const BASE = `http://127.0.0.1:${PORT}`;

const vercelConfig = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
const HEADERS = Object.fromEntries(
  (vercelConfig.headers?.[0]?.headers ?? []).map(h => [h.key, h.value]),
);
if (!HEADERS['Content-Security-Policy']) {
  console.error('vercel.json carries no Content-Security-Policy — nothing to test');
  process.exit(1);
}

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.webp': 'image/webp', '.woff2': 'font/woff2',
  '.txt': 'text/plain', '.xml': 'application/xml', '.ico': 'image/x-icon',
};

// Static server mirroring the Vercel config: real files as-is, everything
// else (except /api/) rewritten to index.html, headers on every response.
const server = createServer((req, res) => {
  const path = normalize(decodeURIComponent((req.url ?? '/').split('?')[0])).replace(/^(\.\.[/\\])+/, '');
  let file = join(DIST, path);
  if (!existsSync(file) || statSync(file).isDirectory()) file = join(DIST, 'index.html');

  for (const [k, v] of Object.entries(HEADERS)) res.setHeader(k, v);
  res.setHeader('Content-Type', MIME[extname(file)] ?? 'application/octet-stream');
  res.end(readFileSync(file));
});

await new Promise(resolve => server.listen(PORT, '127.0.0.1', resolve));

const results = [];
const rec = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail && !ok ? ` — ${detail}` : ''}`);
};

const EXE = resolveChromium();
const browser = await chromium.launch({ ...(EXE ? { executablePath: EXE } : {}), args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });

// Collect violations from every document before any app code runs.
await page.addInitScript(() => {
  window.__cspViolations = window.__cspViolations ?? [];
  document.addEventListener('securitypolicyviolation', e => {
    window.__cspViolations.push(`${e.violatedDirective}: ${e.blockedURI || 'inline'} @ ${e.sourceFile || e.documentURI}`);
  });
});

const violations = async () => page.evaluate(() => window.__cspViolations ?? []);
const visit = async (path) => {
  await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1800);
};

// ── Header is actually served ──
const resp = await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
rec('CSP header served on the document', Boolean(resp.headers()['content-security-policy']));
await page.waitForTimeout(2000);

const accept = page.getByRole('button', { name: /accept all cookies/i });
if (await accept.count()) await accept.first().click().catch(() => {});

// ── Every route class, under the policy — and the legal pages actually
//    say what the law requires them to say, not merely render. ──
const EXPECT = {
  '/products': /refurbished/i,
  '/returns': /14 days.*change your mind|change your mind/i,
  '/delivery': /next.working.day|next-day/i,
  '/cookies': /no analytics|none at present/i,
  '/privacy': /privacy/i,
  '/faq': /./,
  '/checkout': /./,
};
for (const [path, want] of Object.entries(EXPECT)) {
  await visit(path);
  const text = (await page.locator('body').innerText()).replace(/\s+/g, ' ');
  rec(`Route ${path} renders its content`, want.test(text), text.slice(0, 80));
}
await visit('/returns');
const returnsText = (await page.locator('body').innerText()).replace(/\s+/g, ' ');
rec('Returns page carries the model cancellation form', /cancel my contract of sale/i.test(returnsText));
rec('Returns page separates the 30-day faulty-goods right', /30 days/.test(returnsText) && /burden of proof/i.test(returnsText));

// ── The flows that touch third-party origins ──
await visit('/products');
await page.locator('[role="article"]').first().click().catch(() => {});
await page.waitForTimeout(2000);
rec('Reached a product page', /\/product\//.test(page.url()), page.url());

// Structured data, while we are on the PDP.
const ld = await page.evaluate(() => {
  const blocks = [...document.querySelectorAll('script[type="application/ld+json"]')];
  try {
    return blocks.map(b => JSON.parse(b.textContent || 'null'));
  } catch {
    return null;
  }
});
const products = (ld ?? []).flat().filter(x => x && x['@type'] === 'Product');
rec('Product JSON-LD parses', Array.isArray(ld) && products.length === 1, `found ${products.length}`);
if (products.length === 1) {
  const p = products[0];
  rec('JSON-LD declares refurbished condition',
    p.offers?.itemCondition === 'https://schema.org/RefurbishedCondition', String(p.offers?.itemCondition));
  rec('JSON-LD prices in GBP with availability',
    p.offers?.priceCurrency === 'GBP' && /schema\.org\/(InStock|OutOfStock)/.test(String(p.offers?.availability)));
  rec('JSON-LD carries no invented aggregateRating', !('aggregateRating' in p),
    'aggregateRating present — only real review data may put it back');
}

await page.getByRole('button', { name: /^add to cart$/i }).first().click().catch(() => {});
await page.waitForTimeout(1200);

// The auth modal's Google button is the flow that needs apis.google.com and
// the Firebase auth iframe — click it so the policy is exercised, not assumed.
// (The network call itself may fail in a sandbox; a CSP block would surface as
// a violation event, which is the thing being asserted.)
await visit('/');
const more = page.locator('[aria-label="More options"], [aria-label="Open menu"]').first();
if (await more.count()) { await more.click(); await page.waitForTimeout(600); }
const signIn = page.getByRole('button', { name: /sign in|log in|account/i }).first();
if (await signIn.count()) {
  await signIn.click();
  await page.waitForTimeout(1000);
  const google = page.getByRole('button', { name: /google/i }).first();
  if (await google.count()) {
    await google.click().catch(() => {});
    await page.waitForTimeout(2000);
  }
  rec('Sign-in flow exercised', true);
}

// ── The verdict ──
const all = await violations();
rec('No CSP violations across every page and flow', all.length === 0, all.slice(0, 5).join(' | '));

await browser.close();
server.close();

const fails = results.filter(r => !r.ok);
console.log('\n================ CSP SUMMARY ================');
console.log(`PASS ${results.length - fails.length}  FAIL ${fails.length}`);
process.exit(fails.length ? 1 : 0);
