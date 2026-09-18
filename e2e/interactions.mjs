// Interaction suite: click a specific control, assert the specific thing it opens.
// Complements journeys.mjs, which walks whole flows. This one answers
// "what does clicking X actually do".
//
//   npm run build && npx vite preview --port 4173 &
//   npm run e2e:interactions
//
// Exits non-zero on any FAIL.
import { chromium, devices } from 'playwright';
import { resolveChromium } from './chromium-path.mjs';

const BASE = process.env.E2E_BASE_URL || 'http://127.0.0.1:4173';
const EXE  = resolveChromium();
const OUT  = process.env.E2E_SHOTS || 'e2e/screenshots';

const results = [];
let shotN = 0;

function rec(view, control, expected, ok, detail = '') {
  const status = ok ? 'PASS' : 'FAIL';
  results.push({ view, control, expected, status, detail });
  console.log(`[${view.padEnd(7)}] ${status}  click "${control}" -> ${expected}${detail ? ' — ' + detail : ''}`);
}
async function shot(page, view, name) {
  shotN++;
  await page.screenshot({ path: `${OUT}/ix-${String(shotN).padStart(2,'0')}-${view}-${name}.png` });
}
const body = async page => (await page.locator('body').innerText()).replace(/\s+/g, ' ');

async function dismissCookies(page) {
  const b = page.getByRole('button', { name: /accept all cookies/i });
  if (await b.count()) { await b.first().click().catch(() => {}); await page.waitForTimeout(400); }
}

/** The first shop card that is not sold out, opened to its product page. */
async function openInStockProduct(page) {
  await gotoProducts(page);
  const cards = page.locator('article[id^="product-card-"]');
  const n = await cards.count();
  for (let i = 0; i < n; i++) {
    const card = cards.nth(i);
    const text = (await card.innerText().catch(() => '')).toLowerCase();
    if (/out of stock|sold out/.test(text)) continue;
    await card.locator('[aria-label^="View "]').first().click();
    await page.getByRole('button', { name: /add to cart/i }).first().waitFor({ timeout: 25000 });
    return;
  }
  throw new Error(`no in-stock product among ${n} cards on /products`);
}

async function gotoProducts(page) {
  await page.goto(`${BASE}/products`, { waitUntil: 'domcontentloaded' });
  await page.getByText(/items? available/i).first().waitFor({ timeout: 25000 });
  await dismissCookies(page);
  await page.waitForTimeout(600);
}

async function run(view, contextOpts) {
  const browser = await chromium.launch({ ...(EXE ? { executablePath: EXE } : {}), args: ['--no-sandbox'] });
  const ctx = await browser.newContext(contextOpts);
  const page = await ctx.newPage();
  const isMobile = view === 'mobile';

  // ── Cart icon -> cart drawer ────────────────────────────────
  try {
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);
    await dismissCookies(page);
    // On a phone the cart lives in the tab bar, not the app bar: the header
    // pill is hidden below 1024px so a destination never appears twice.
    // :visible matters: the header pill is still in the DOM on a phone, only
    // hidden, and it comes first — so without the filter this clicked a
    // hidden element and timed out.
    const cart = page.locator('[aria-label="Cart"]:visible, a[href="/cart"]:visible, nav[aria-label="Primary"] button[aria-label^="Cart"]:visible').first();
    await cart.click();
    await page.waitForTimeout(1200);
    await shot(page, view, 'cart-drawer');
    const t = await body(page);
    rec(view, 'Cart', 'cart drawer or cart page opens', /cart|bag|empty|subtotal/i.test(t));
  } catch (e) { rec(view, 'Cart', 'cart drawer opens', false, e.message.slice(0, 80)); }

  // ── Wishlist heart on a card -> saved state ─────────────────
  try {
    await gotoProducts(page);
    const heart = page.locator('[aria-label="Save"]').first();
    const had = await heart.count();
    if (had) {
      await heart.click();
      await page.waitForTimeout(1200);
      await shot(page, view, 'wishlist-toggled');
      await page.goto(`${BASE}/wishlist`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2500);
      const t = await body(page);
      rec(view, 'Save (heart)', 'item appears on the wishlist page', /iphone|samsung|galaxy|pixel/i.test(t));
    } else rec(view, 'Save (heart)', 'wishlist toggle exists', false, 'no [aria-label="Save"] found');
  } catch (e) { rec(view, 'Save (heart)', 'wishlist updates', false, e.message.slice(0, 80)); }

  // ── Card -> product detail route ────────────────────────────
  try {
    await gotoProducts(page);
    const view1 = page.locator('[aria-label^="View "]').first();
    const label = await view1.getAttribute('aria-label');
    await view1.click();
    await page.waitForTimeout(2500);
    const onPdp = /\/product\//.test(page.url());
    await shot(page, view, 'card-to-detail');
    rec(view, label || 'View <product>', 'navigates to /product/:id', onPdp, page.url().split('/').pop());
  } catch (e) { rec(view, 'View <product>', 'navigates to detail', false, e.message.slice(0, 80)); }

  // ── Variant chip -> price changes ───────────────────────────
  try {
    // Found from the shop rather than hard-coded: the old id existed only in
    // the mock catalogue, so against real data this whole block was testing a
    // "no longer available" page.
    await openInStockProduct(page);
    await dismissCookies(page);
    const priceBefore = ((await body(page)).match(/£[\d,]+/) || [])[0];
    const chip = page.getByRole('button', { name: '512GB', exact: true }).first();
    if (await chip.count()) {
      await chip.click();
      await page.waitForTimeout(1500);
      const priceAfter = ((await body(page)).match(/£[\d,]+/) || [])[0];
      await shot(page, view, 'variant-selected');
      rec(view, '512GB storage chip', 'price updates', priceBefore !== priceAfter,
          `${priceBefore} -> ${priceAfter}`);
    } else {
      // A listing with one configuration has no chip to click. Say so rather
      // than fail: the check is that a chip changes the price, when there is one.
      console.log(`[${view.padEnd(7)}] SKIP  "512GB storage chip" — this listing has no storage variants`);
    }
  } catch (e) { rec(view, 'variant chip', 'price updates', false, e.message.slice(0, 80)); }

  // ── Quantity stepper -> quantity changes ────────────────────
  try {
    const inc = page.locator('[aria-label="Increase quantity"]').first();
    if (await inc.count()) {
      await inc.click();
      await page.waitForTimeout(600);
      rec(view, 'Increase quantity', 'quantity increments', /\b2\b/.test(await body(page)));
    } else {
      // The product page has no stepper by design — quantity is set in the
      // cart, where the control is exercised by the cart-page check instead.
      console.log(`[${view.padEnd(7)}] SKIP  "Increase quantity" — no stepper on the product page by design`);
    }
  } catch (e) { rec(view, 'Increase quantity', 'quantity increments', false, e.message.slice(0, 80)); }

  // ── Add to cart -> confirmation surface ─────────────────────
  try {
    await page.getByRole('button', { name: /add to cart/i }).first().click();
    await page.waitForTimeout(2000);
    await shot(page, view, 'added-modal');
    rec(view, 'Add to cart', 'confirmation appears', /added|view cart|checkout|continue shopping/i.test(await body(page)));
    await page.keyboard.press('Escape');
    await page.waitForTimeout(700);
  } catch (e) { rec(view, 'Add to cart', 'confirmation appears', false, e.message.slice(0, 80)); }

  // ── Auth modal -> Google button present ─────────────────────
  try {
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);
    await dismissCookies(page);
    const more = page.locator('[aria-label="More options"], [aria-label="Open menu"]').first();
    if (await more.count()) { await more.click(); await page.waitForTimeout(1000); }
    const signIn = page.getByRole('button', { name: /sign in|log in|account/i }).first();
    if (await signIn.count()) {
      await signIn.click();
      await page.waitForTimeout(1500);
      await shot(page, view, 'auth-google');
      const google = await page.getByRole('button', { name: /continue with google/i }).count();
      rec(view, 'Sign in', 'auth modal shows Google button', google > 0);
    } else rec(view, 'Sign in', 'auth modal opens', false, 'no sign-in control');
  } catch (e) { rec(view, 'Sign in', 'auth modal opens', false, e.message.slice(0, 80)); }

  // ── Desktop mega-menu / mobile filter sheet ─────────────────
  try {
    if (isMobile) {
      await gotoProducts(page);
      await page.locator('#products-filter-toggle').first().click();
      await page.waitForTimeout(1200);
      await shot(page, view, 'filter-sheet');
      rec(view, 'Filters', 'bottom sheet opens with facets', /brand|grade|price/i.test(await body(page)));
    } else {
      await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2500);
      await dismissCookies(page);
      const apple = page.getByRole('button', { name: /^Apple$/ }).first();
      if (await apple.count()) {
        await apple.click();
        await page.waitForTimeout(1200);
        await shot(page, view, 'mega-menu');
        rec(view, 'Apple (nav)', 'mega-menu lists models', /iphone/i.test(await body(page)));
      } else rec(view, 'Apple (nav)', 'mega-menu opens', false, 'nav button not found');
    }
  } catch (e) { rec(view, 'nav/filters', 'panel opens', false, e.message.slice(0, 80)); }

  // ── Mobile search toggle -> search field ────────────────────
  if (isMobile) {
    try {
      await gotoProducts(page);
      await page.locator('button[aria-label="Search products"]').first().click();
      await page.waitForTimeout(900);
      await shot(page, view, 'mobile-search-open');
      rec(view, 'Search (header)', 'search field becomes usable',
          await page.locator('#mobile-search-bar input').isVisible());
    } catch (e) { rec(view, 'Search (header)', 'search opens', false, e.message.slice(0, 80)); }
  }

  await browser.close();
}

await run('desktop', { viewport: { width: 1440, height: 900 } });
await run('mobile', { ...devices['iPhone 13'] });

console.log('\n============ INTERACTION SUMMARY ============');
const fails = results.filter(r => r.status === 'FAIL');
console.log(`PASS ${results.length - fails.length}  FAIL ${fails.length}`);
if (fails.length) {
  console.log('\n--- FAILURES ---');
  fails.forEach(f => console.log(`  [${f.view}] "${f.control}" -> ${f.expected} — ${f.detail}`));
}

process.exit(fails.length ? 1 : 0);
