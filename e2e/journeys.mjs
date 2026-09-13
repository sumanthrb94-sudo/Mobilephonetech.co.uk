// End-to-end journey suite: desktop + mobile, run against a built preview.
//
//   npm run build && npx vite preview --port 4173 &
//   npm run e2e
//
// Screenshots land in e2e/screenshots. Exits non-zero on any FAIL.
import { chromium, devices } from 'playwright';
import { resolveChromium } from './chromium-path.mjs';

const BASE = process.env.E2E_BASE_URL || 'http://127.0.0.1:4173';
// Set E2E_CHROMIUM to pin a specific binary; otherwise the preinstalled one is found.
const EXE  = resolveChromium();
const OUT  = process.env.E2E_SHOTS || 'e2e/screenshots';

const results = [];
let shotN = 0;

function rec(view, step, status, detail = '') {
  results.push({ view, step, status, detail });
  console.log(`[${view.padEnd(7)}] ${status.padEnd(4)} ${step}${detail ? ' — ' + detail : ''}`);
}
async function shot(page, view, name) {
  shotN++;
  await page.screenshot({ path: `${OUT}/${String(shotN).padStart(2,'0')}-${view}-${name}.png` });
}
const txt = async page => (await page.locator('body').innerText()).replace(/\s+/g, ' ');

// Dismiss the cookie banner — it overlays controls at the bottom of the viewport.
async function dismissCookies(page) {
  const b = page.getByRole('button', { name: /accept all cookies/i });
  if (await b.count()) { await b.first().click().catch(() => {}); await page.waitForTimeout(400); }
}

async function run(view, contextOpts) {
  const browser = await chromium.launch({ ...(EXE ? { executablePath: EXE } : {}), args: ['--no-sandbox'] });
  const ctx = await browser.newContext(contextOpts);
  const page = await ctx.newPage();
  const isMobile = view === 'mobile';

  const errors = [];
  page.on('pageerror', e => errors.push(String(e.message).slice(0, 160)));

  // ── Home ──
  try {
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    await dismissCookies(page);
    await shot(page, view, 'home');
    const t = await txt(page);
    rec(view, 'Home renders', t.length > 2000 ? 'PASS' : 'FAIL', `${t.length} chars`);
    const homeCards = await page.locator('[aria-label^="View "]').count();
    rec(view, 'Home shows catalogue-driven products', homeCards > 0 ? 'PASS' : 'FAIL', `${homeCards} cards`);
  } catch (e) { rec(view, 'Home renders', 'FAIL', e.message.slice(0, 100)); }

  // ── One entry point per destination (phones only) ──
  //
  // The phone showed a heart in the app bar AND a Wishlist tab, and a cart
  // pill AND a Cart tab — two ways into each of two lists, which reads as two
  // different features until you tap one. Nothing catches that: every control
  // works, and the screen is simply asking the visitor a question.
  //
  // The rule below is what the app shell settled on: on a phone the tab bar
  // owns navigation, so no destination in it may also sit in the app bar.
  if (isMobile) {
    try {
      await page.goto(`${BASE}/products`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2500);
      await dismissCookies(page);

      const dupes = await page.evaluate(() => {
        const shown = (sel) => [...document.querySelectorAll(sel)]
          .some(el => el.getBoundingClientRect().width > 0);
        const tabs = [...document.querySelectorAll('nav[aria-label="Primary"] a, nav[aria-label="Primary"] button')]
          .map(el => el.textContent.replace(/\s+/g, ' ').trim().toLowerCase());
        const has = (word) => tabs.some(t => t.includes(word));

        const both = [];
        if (has('cart') && shown('#navbar-cart-btn')) both.push('cart');
        if (has('wishlist') && shown('#navbar-wishlist-btn')) both.push('wishlist');
        return { both, tabs };
      });

      rec(view, 'No destination sits in both the app bar and the tab bar',
        dupes.both.length === 0 ? 'PASS' : 'FAIL',
        dupes.both.length ? `duplicated: ${dupes.both.join(', ')}` : `tabs: ${dupes.tabs.join(' / ')}`);
    } catch (e) {
      rec(view, 'No destination sits in both the app bar and the tab bar', 'FAIL', e.message.slice(0, 100));
    }
  }

  // ── Hero scrim (phones only) ──
  //
  // The full-bleed banners put white copy straight onto a photograph, and the
  // only thing making it readable is the scrim behind it. That shipped broken:
  // the gradient stayed fully transparent until 55% of the banner while the
  // copy began at 40%, so the eyebrow and the top of the headline sat on the
  // highlight coming off the phones. Nothing failed — the page rendered, the
  // text was present, and the words were simply unreadable.
  //
  // Two independent numbers have to agree for that not to happen: where the
  // copy starts, and where the gradient has darkened enough to carry white
  // text. This asserts they agree, so either one moving on its own is caught —
  // a headline wrapping to a third line as much as a retuned gradient.
  if (isMobile) {
    try {
      await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(3000);
      await dismissCookies(page);

      // Stop the auto-advance first: which slide is showing three seconds
      // after load is otherwise luck, and the check would silently land on a
      // slide that has no scrim to test.
      const pause = page.getByRole('button', { name: /pause/i }).first();
      if (await pause.count()) await pause.click().catch(() => {});
      await page.waitForTimeout(500);

      const measure = () => page.evaluate(() => {
        const sec = document.querySelector('section[aria-label="Hero carousel"]');
        if (!sec) return { error: 'no hero' };

        // The scrim is the layer holding a vertical gradient over the photo.
        // A slide without one is not full-bleed and has nothing to check.
        //
        // Matched as the BROWSER serialises it, not as it is authored: Chromium
        // drops `180deg` because down is the default direction, so the value
        // read back begins with the first colour stop. That is also what
        // distinguishes it from the section's own 135deg wash and from the
        // desktop scrim, both of which keep an explicit direction.
        const scrim = [...sec.querySelectorAll('div')]
          .find(d => /^linear-gradient\(rgba/.test(d.style.background || ''));
        if (!scrim) return { plain: true };

        // Alpha at a given % down the banner, read off the gradient's own
        // stops and interpolated between them — the same value the compositor
        // paints, rather than a number copied into the test by hand.
        const stops = [...scrim.style.background.matchAll(
          /rgba\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*,\s*([\d.]+)\s*\)\s+([\d.]+)%/g,
        )].map(m => ({ a: parseFloat(m[1]), at: parseFloat(m[2]) }));
        if (stops.length < 2) return { error: 'could not read gradient stops' };

        const alphaAt = (pct) => {
          if (pct <= stops[0].at) return stops[0].a;
          for (let i = 1; i < stops.length; i++) {
            if (pct > stops[i].at) continue;
            const a = stops[i - 1], b = stops[i];
            const t = b.at === a.at ? 1 : (pct - a.at) / (b.at - a.at);
            return a.a + (b.a - a.a) * t;
          }
          return stops[stops.length - 1].a;
        };

        // Topmost piece of copy on the slide: the eyebrow pill, else the
        // headline. Whatever is highest is what the scrim has to reach.
        const box = sec.getBoundingClientRect();
        const copy = sec.querySelector('div[style*="999px"]') || sec.querySelector('h1, h2');
        if (!copy) return { error: 'no copy found' };
        const top = ((copy.getBoundingClientRect().top - box.top) / box.height) * 100;
        const head = (sec.querySelector('h1, h2')?.textContent || '').replace(/\s+/g, ' ').slice(0, 24);

        return { copyTopPct: Math.round(top), alpha: +alphaAt(top).toFixed(2), head };
      });

      const MIN_ALPHA = 0.3;
      const worst = [];
      let fullBleed = 0;

      // Walk every slide rather than trusting whichever one happens to show.
      for (let i = 0; i < 8; i++) {
        const m = await measure();
        if (m.error) { worst.push({ alpha: -1, detail: m.error }); break; }
        if (!m.plain) {
          fullBleed += 1;
          worst.push({
            alpha: m.alpha,
            detail: `"${m.head}" copy at ${m.copyTopPct}%, alpha ${m.alpha}`,
          });
        }
        const next = page.getByRole('button', { name: /next/i }).first();
        if (!(await next.count())) break;
        await next.click().catch(() => {});
        await page.waitForTimeout(900);
      }

      const failing = worst.filter(w => w.alpha < MIN_ALPHA);
      rec(view, 'Hero scrim covers the copy on every banner slide',
        fullBleed > 0 && failing.length === 0 ? 'PASS' : 'FAIL',
        failing.length
          ? failing.map(f => f.detail).join(' | ') + ` (need >= ${MIN_ALPHA})`
          : `${fullBleed} banner slides, weakest alpha ${Math.min(...worst.map(w => w.alpha)).toFixed(2)}`);
    } catch (e) { rec(view, 'Hero scrim covers the copy on every banner slide', 'FAIL', e.message.slice(0, 100)); }
  }

  // ── Products grid ──
  try {
    await page.goto(`${BASE}/products`, { waitUntil: 'domcontentloaded' });
    await page.getByText(/items? available/i).first().waitFor({ timeout: 25000 });
    await page.waitForTimeout(1200);
    await dismissCookies(page);
    await shot(page, view, 'products');
    const t = await txt(page);
    const n = Number((t.match(/(\d+) items? available/) || [])[1] || 0);
    rec(view, 'Products grid renders', n > 0 ? 'PASS' : 'FAIL', `${n} items`);
    const cards = await page.locator('[aria-label^="View "]').count();
    rec(view, 'Product cards present', cards > 0 ? 'PASS' : 'FAIL', `${cards} cards`);
  } catch (e) { rec(view, 'Products grid renders', 'FAIL', e.message.slice(0, 100)); }

  // ── Filter logic: brand filter must reduce the count ──
  try {
    if (isMobile) {
      await page.locator('#products-filter-toggle').first().click();
      await page.waitForTimeout(1000);
    }
    const before = await page.locator('[aria-label^="View "]').count();
    const cbs = page.locator('input[type=checkbox]');
    let applied = false;
    for (let i = 0; i < await cbs.count(); i++) {
      const lbl = await cbs.nth(i).evaluate(el => (el.closest('label')?.innerText || el.parentElement?.innerText || '').trim());
      if (/samsung/i.test(lbl)) { await cbs.nth(i).click({ force: true }); applied = true; break; }
    }
    await page.waitForTimeout(1500);
    await shot(page, view, 'filter-applied');
    const after = await page.locator('[aria-label^="View "]').count();
    if (!applied) rec(view, 'Brand filter narrows results', 'WARN', 'no brand control found');
    else rec(view, 'Brand filter narrows results', after > 0 && after < before ? 'PASS' : 'FAIL',
             `${before} -> ${after} cards`);
  } catch (e) { rec(view, 'Brand filter narrows results', 'FAIL', e.message.slice(0, 100)); }

  // ── Search ──
  try {
    await page.goto(`${BASE}/products`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);
    await dismissCookies(page);
    if (isMobile) {
      // The desktop autocomplete input shares this label, so match the button.
      const toggle = page.locator('button[aria-label="Search products"]').first();
      await toggle.click();
      await page.waitForTimeout(900);
    }
    const input = page.locator('input:visible').filter({ has: undefined })
      .and(page.getByPlaceholder(/search/i)).first();
    await input.waitFor({ timeout: 10000 });
    await input.fill('galaxy');
    await page.waitForTimeout(1800);
    await shot(page, view, 'search');
    const t = await txt(page);
    rec(view, 'Search returns Samsung matches', /galaxy/i.test(t) ? 'PASS' : 'FAIL');
  } catch (e) { rec(view, 'Search returns Samsung matches', 'FAIL', e.message.slice(0, 100)); }

  // ── Product detail (wait for price, not a fixed delay) ──
  try {
    await page.goto(`${BASE}/product/apple-iphone-17-unlocked`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: /add to cart/i }).first().waitFor({ timeout: 25000 });
    await dismissCookies(page);
    await shot(page, view, 'product-detail');
    const t = await txt(page);
    rec(view, 'Product detail renders', /£\d/.test(t) ? 'PASS' : 'FAIL');
    rec(view, 'Variant selectors present', /256GB|512GB/.test(t) ? 'PASS' : 'FAIL');
    rec(view, 'Delivery estimate shown', /delivery|get it by/i.test(t) ? 'PASS' : 'WARN');
  } catch (e) { rec(view, 'Product detail renders', 'FAIL', e.message.slice(0, 100)); }

  // ── Quantity stepper ──
  try {
    const plus = page.locator('button').filter({ hasText: /^\+$/ }).first();
    if (await plus.count()) {
      await plus.click(); await page.waitForTimeout(600);
      const t = await txt(page);
      rec(view, 'Quantity stepper increments', /−\s*2\s*\+|\b2\b/.test(t) ? 'PASS' : 'WARN');
    } else rec(view, 'Quantity stepper increments', 'WARN', 'no + button');
  } catch (e) { rec(view, 'Quantity stepper increments', 'FAIL', e.message.slice(0, 100)); }

  // ── Add to cart ──
  try {
    await page.getByRole('button', { name: /add to cart/i }).first().click();
    await page.waitForTimeout(2000);
    await shot(page, view, 'added-to-cart');
    rec(view, 'Add to cart responds', /added|cart|checkout/i.test(await txt(page)) ? 'PASS' : 'FAIL');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(800);
  } catch (e) { rec(view, 'Add to cart responds', 'FAIL', e.message.slice(0, 100)); }

  // ── Cart holds the item ──
  try {
    await page.goto(`${BASE}/cart`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);
    await dismissCookies(page);
    await shot(page, view, 'cart');
    const t = await txt(page);
    rec(view, 'Cart contains added item', /iphone/i.test(t) ? 'PASS' : 'FAIL');
    rec(view, 'Cart shows a total', /total|subtotal/i.test(t) && /£\d/.test(t) ? 'PASS' : 'FAIL');
  } catch (e) { rec(view, 'Cart contains added item', 'FAIL', e.message.slice(0, 100)); }

  // ── Checkout ──
  try {
    await page.goto(`${BASE}/checkout`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    await dismissCookies(page);
    await shot(page, view, 'checkout');
    const t = await txt(page);
    rec(view, 'Checkout renders a form', /email|address|postcode|delivery|payment/i.test(t) ? 'PASS' : 'FAIL');
  } catch (e) { rec(view, 'Checkout renders a form', 'FAIL', e.message.slice(0, 100)); }

  // ── Auth modal ──
  try {
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);
    await dismissCookies(page);
    const more = page.locator('[aria-label="More options"], [aria-label="Open menu"]').first();
    if (await more.count()) { await more.click(); await page.waitForTimeout(1000); }
    const signIn = page.getByRole('button', { name: /sign in|log in|account/i }).first();
    if (await signIn.count()) {
      await signIn.click(); await page.waitForTimeout(1500);
      await shot(page, view, 'auth-modal');
      rec(view, 'Auth modal opens', /password|email/i.test(await txt(page)) ? 'PASS' : 'WARN');
    } else rec(view, 'Auth modal opens', 'WARN', 'no sign-in control found');
  } catch (e) { rec(view, 'Auth modal opens', 'FAIL', e.message.slice(0, 100)); }

  // ── Compare ──
  try {
    await page.goto(`${BASE}/compare`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    await dismissCookies(page);
    await shot(page, view, 'compare');
    const t = await txt(page);
    // Was a >300 character count, which the sitemap footer satisfied on its
    // own — so it passed on a page rendering nothing of its own, and failed
    // the moment the app shell dropped the footer on phones. Assert the
    // page's own content instead.
    rec(view, 'Compare page renders',
      /side-by-side|comparison/i.test(t) && /add phone|compare/i.test(t) ? 'PASS' : 'FAIL',
      t.slice(0, 120));
  } catch (e) { rec(view, 'Compare page renders', 'FAIL', e.message.slice(0, 100)); }

  // ── Wishlist + 404 ──
  try {
    await page.goto(`${BASE}/wishlist`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    await shot(page, view, 'wishlist');
    const w = await txt(page);
    rec(view, 'Wishlist renders',
      /your wishlist/i.test(w) && /(nothing saved|no items|heart any product|£)/i.test(w) ? 'PASS' : 'FAIL',
      w.slice(0, 120));
    await page.goto(`${BASE}/nope-not-real`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    await shot(page, view, '404');
    rec(view, '404 renders', /not found|404|sorry/i.test(await txt(page)) ? 'PASS' : 'FAIL');
  } catch (e) { rec(view, 'Wishlist/404', 'FAIL', e.message.slice(0, 100)); }

  // ── Layout: horizontal overflow + tap target size ──
  try {
    for (const path of ['/', '/products', '/cart', '/checkout']) {
      await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2500);
      const over = await page.evaluate(() =>
        document.documentElement.scrollWidth - document.documentElement.clientWidth);
      rec(view, `No horizontal overflow ${path}`, over <= 1 ? 'PASS' : 'FAIL', `${over}px`);
    }
    if (isMobile) {
      await page.goto(`${BASE}/products`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(3000);
      const small = await page.evaluate(() => {
        const bad = [];
        document.querySelectorAll('button, a[href], [role="button"]').forEach(el => {
          const r = el.getBoundingClientRect();
          if (el.closest('[class*="cookie"]') || /privacy policy/i.test(el.textContent || '') && !el.closest('footer')) return;
          if (r.width > 0 && r.height > 0 && (r.height < 24 || r.width < 24)) {
            bad.push(`${el.tagName}.${(el.className || '').toString().slice(0, 20)} ${Math.round(r.width)}x${Math.round(r.height)}`);
          }
        });
        return bad.slice(0, 6);
      });
      rec(view, 'Tap targets >= 24px', small.length === 0 ? 'PASS' : 'WARN',
          small.length ? `${small.length} small: ${small.join(', ')}` : '');
    }
  } catch (e) { rec(view, 'Layout checks', 'FAIL', e.message.slice(0, 100)); }

  rec(view, 'No uncaught JS errors', errors.length === 0 ? 'PASS' : 'FAIL',
      errors.slice(0, 2).join(' | '));

  await browser.close();
}

await run('desktop', { viewport: { width: 1440, height: 900 } });
await run('mobile', { ...devices['iPhone 13'] });

console.log('\n================ SUMMARY ================');
const f = results.filter(r => r.status === 'FAIL');
const w = results.filter(r => r.status === 'WARN');
console.log(`PASS ${results.filter(r => r.status === 'PASS').length}  WARN ${w.length}  FAIL ${f.length}`);
if (f.length) { console.log('\n--- FAILURES ---'); f.forEach(x => console.log(`  [${x.view}] ${x.step} — ${x.detail}`)); }
if (w.length) { console.log('\n--- WARNINGS ---'); w.forEach(x => console.log(`  [${x.view}] ${x.step} — ${x.detail}`)); }

process.exit(results.some(r => r.status === 'FAIL') ? 1 : 0);
