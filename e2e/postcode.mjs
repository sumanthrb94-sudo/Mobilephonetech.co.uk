// Postcode-lookup suite: the checkout's one dependency on somebody else's
// server, exercised through every way that server can let it down.
//
//   npm run build && npx vite preview --port 4173 &
//   npm run e2e:postcode
//
// Exits non-zero on any FAIL.
//
// WHY THE API IS STUBBED
//
// Not to avoid the network — to reach the cases the network will not give
// you on demand. "What does checkout do when postcodes.io returns a 500" is
// the question worth answering, and you cannot ask the real service to fail.
// Stubbing also keeps the suite honest on a machine with no egress, and
// keeps a CI run from leaning on a free public API.
//
// WHAT IT PROTECTS
//
//  1. THE OLD LOOKUP INVENTED ADDRESSES. It mapped a postcode prefix to a
//     representative city and a plausible street and filled them in, so
//     SW1A 1AA produced a street nobody lives on. A filled-in wrong address
//     is worse than an empty one: an empty form is obviously yours to
//     complete, a filled one invites you to skim it and move on. So this
//     asserts that Address Line 1 is NOT written for the shopper.
//
//  2. A CHECKOUT MUST SURVIVE ITS DEPENDENCIES. Every failure has to leave
//     the form exactly as usable as it was, with a message saying so.
//
//  3. NOBODY PAYS FOR THE MAP UNLESS THEY ASK. Leaflet is ~148KB and must
//     only be fetched once a lookup has actually succeeded.
import { chromium } from 'playwright';
import { resolveChromium } from './chromium-path.mjs';

const BASE = process.env.E2E_BASE_URL || 'http://127.0.0.1:4173';
const EXE = resolveChromium();

const results = [];
function rec(what, expected, got, detail = '') {
  const ok = JSON.stringify(expected) === JSON.stringify(got);
  results.push({ what, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${what}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(got)}${detail ? ` — ${detail}` : ''}`);
}

/** A real postcodes.io body, nulls included — ONS leaves them. */
const HIT = {
  status: 200,
  result: {
    postcode: 'NW1 6XE',
    latitude: 51.5237,
    longitude: -0.1585,
    post_town: null,
    admin_district: 'Westminster',
    admin_county: null,
    region: 'London',
    country: 'England',
  },
};

/** A browser sitting on the checkout's shipping step, with the API stubbed. */
async function checkoutWith(browser, mode) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const calls = [];
  const leafletFetched = [];

  page.on('request', (r) => { if (/leaflet/i.test(r.url())) leafletFetched.push(r.url()); });

  await page.route('**api.postcodes.io/**', (route) => {
    calls.push(route.request().url());
    if (mode === 'hit') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(HIT) });
    if (mode === 'notfound') return route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ status: 404, error: 'Postcode not found' }) });
    if (mode === 'error') return route.fulfill({ status: 500, contentType: 'application/json', body: '{}' });
    if (mode === 'down') return route.abort('failed');
    return route.continue();
  });

  await page.goto(`${BASE}/products`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  const accept = page.getByRole('button', { name: /accept all cookies/i });
  if (await accept.count()) await accept.first().click().catch(() => {});

  const cards = page.locator('article[id^="product-card-"]');
  for (let i = 0, n = await cards.count(); i < n; i++) {
    const card = cards.nth(i);
    if (/out of stock|sold out/i.test(await card.innerText().catch(() => ''))) continue;
    await card.click();
    break;
  }
  await page.getByRole('button', { name: /^add to cart$/i }).first().waitFor({ timeout: 25000 });
  await page.getByRole('button', { name: /^add to cart$/i }).first().click();
  await page.waitForTimeout(1200);
  const keep = page.getByRole('button', { name: /continue shopping|close/i }).first();
  if (await keep.count()) await keep.click().catch(() => {});

  await page.goto(`${BASE}/checkout`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  const guest = page.locator('input[name="guestEmail"]');
  if (await guest.count()) {
    await guest.fill('e2e-postcode@example.com');
    await page.getByRole('button', { name: /continue as guest/i }).first().click().catch(() => {});
    await page.waitForTimeout(1500);
  }

  // The form is seeded with a demo address; empty it so a fill is visible
  // rather than indistinguishable from what was already there.
  await page.evaluate(() => {
    for (const n of ['city', 'postalCode', 'addressLine1', 'addressLine2']) {
      const el = document.querySelector(`input[name="${n}"]`);
      if (el) el.value = '';
    }
  });

  return { page, ctx, calls, leafletFetched };
}

const readForm = (page) => page.evaluate(() => ({
  city: document.querySelector('input[name="city"]')?.value ?? '',
  postal: document.querySelector('input[name="postalCode"]')?.value ?? '',
  line1: document.querySelector('input[name="addressLine1"]')?.value ?? '',
  line2: document.querySelector('input[name="addressLine2"]')?.value ?? '',
  hasMap: !!document.querySelector('[data-testid="address-map"]'),
  alert: document.querySelector('[role="alert"]')?.textContent?.trim() ?? null,
}));

async function lookup(page, value) {
  await page.locator('#postcode-lookup').fill(value);
  await page.getByRole('button', { name: /find address/i }).click();
  await page.waitForTimeout(2200);
}

async function run() {
  const browser = await chromium.launch({ executablePath: EXE });

  // ── A postcode the service knows ──────────────────────────────────
  {
    const { page, ctx, calls, leafletFetched } = await checkoutWith(browser, 'hit');
    await lookup(page, 'NW1 6XE');
    const f = await readForm(page);
    rec('a known postcode fills the town', 'Westminster', f.city, 'post_town was null; admin_district used');
    rec('and the postcode itself', 'NW1 6XE', f.postal);
    rec('and puts the county on line 2', 'London', f.line2);
    rec('but never invents a street', '', f.line1);
    rec('and shows the map', true, f.hasMap);
    rec('having called the service once', 1, calls.length);
    rec('and only now fetched Leaflet', true, leafletFetched.length > 0, `${leafletFetched.length} request(s)`);
    await ctx.close();
  }

  // ── A postcode that is not real ───────────────────────────────────
  {
    const { page, ctx } = await checkoutWith(browser, 'notfound');
    await lookup(page, 'ZZ1 1ZZ');
    const f = await readForm(page);
    rec('an unknown postcode says so', true, /could not find/i.test(f.alert ?? ''), f.alert ?? 'no alert');
    rec('and fills nothing', ['', '', ''], [f.city, f.postal, f.line1]);
    rec('and draws no map', false, f.hasMap);
    await ctx.close();
  }

  // ── The service is broken ─────────────────────────────────────────
  {
    const { page, ctx } = await checkoutWith(browser, 'error');
    await lookup(page, 'NW1 6XE');
    const f = await readForm(page);
    rec('a 500 tells the shopper to type it instead', true, /enter your address/i.test(f.alert ?? ''), f.alert ?? 'no alert');
    await ctx.close();
  }

  // ── The service is unreachable ────────────────────────────────────
  {
    const { page, ctx } = await checkoutWith(browser, 'down');
    await lookup(page, 'NW1 6XE');
    const f = await readForm(page);
    rec('an unreachable service does the same', true, /enter your address/i.test(f.alert ?? ''), f.alert ?? 'no alert');

    // The whole point of failing softly: the form still works.
    await page.locator('input[name="addressLine1"]').fill('221B Baker Street');
    await page.locator('input[name="city"]').fill('London');
    await page.locator('input[name="postalCode"]').fill('NW1 6XE');
    const typed = await readForm(page);
    rec('and the form is still fillable by hand',
      ['221B Baker Street', 'London', 'NW1 6XE'],
      [typed.line1, typed.city, typed.postal]);
    await ctx.close();
  }

  // ── Not a postcode at all ─────────────────────────────────────────
  {
    const { page, ctx, calls, leafletFetched } = await checkoutWith(browser, 'hit');
    await lookup(page, 'banana');
    const f = await readForm(page);
    rec('nonsense is rejected without calling anyone', 0, calls.length, f.alert ?? '');
    rec('and no map is fetched for it', 0, leafletFetched.length);
    await ctx.close();
  }

  await browser.close();
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} passed`);
  process.exit(failed === 0 ? 0 : 1);
}

run().catch((err) => { console.error(err); process.exit(1); });
