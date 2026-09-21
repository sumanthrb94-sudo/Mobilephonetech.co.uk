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

/**
 * Open the first product the shop lists that can actually be bought.
 *
 * Cards for sold-out stock say so on the card; skipping those keeps the
 * add-to-cart checks below about the control, not about whether the first
 * listing happened to have stock that day.
 */
async function openInStockProduct(page) {
  await page.goto(`${BASE}/products`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  await dismissCookies(page);
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

  // ── The search row closes when you leave the page (phones only) ──
  //
  // The Navbar is the app shell and never unmounts, so the flag that opens
  // the expanding search row survived every in-app navigation. One tap on
  // the magnifier and the row followed the shopper to Shop, Cart and
  // Account; on Home it rendered underneath the inline search bar, putting
  // two search fields on the screen six pixels apart. Nothing failed — search
  // just became permanent chrome nobody had asked to keep.
  //
  // Driven through the tab bar rather than page loads on purpose: a full load
  // remounts the Navbar and resets the flag, so goto() cannot see this bug at
  // all. Only client-side navigation reproduces it, which is what a shopper
  // actually does.
  if (isMobile) {
    try {
      const visibleSearches = () => page.evaluate(() =>
        [...document.querySelectorAll('input')]
          .filter(i => /search/i.test(i.placeholder || '') && i.getBoundingClientRect().width > 0)
          .map(i => i.placeholder));

      await page.goto(`${BASE}/products`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2500);
      await dismissCookies(page);

      const toggle = page.locator('button[aria-label="Search products"]:visible').first();
      await toggle.click();
      await page.waitForTimeout(700);
      const opened = await visibleSearches();
      rec(view, 'The magnifier opens exactly one search field',
        opened.length === 1 ? 'PASS' : 'FAIL', JSON.stringify(opened));

      const carried = [];
      for (const tab of ['Home', 'Cart', 'Account', 'Shop']) {
        await page.locator(`nav[aria-label="Primary"] >> text=${tab}`).first().click();
        await page.waitForTimeout(1200);
        const here = await visibleSearches();
        // Home's app bar IS a search field by design — one is right there,
        // two is the bug. Everywhere else search lives behind the magnifier.
        const allowed = tab === 'Home' ? 1 : 0;
        if (here.length > allowed) carried.push(`${tab}: ${JSON.stringify(here)}`);
      }
      rec(view, 'The search row does not follow the shopper between tabs',
        carried.length === 0 ? 'PASS' : 'FAIL', carried.join(' | '));
    } catch (e) {
      rec(view, 'The search row does not follow the shopper between tabs', 'FAIL', e.message.slice(0, 100));
    }
  }

  // ── The basket count appears once (every viewport) ──
  //
  // The rule above covers two ways into the cart. This covers one control
  // saying the same number twice: the desktop pill rendered the count as a
  // label AND as a corner bubble, so a basket of two read "Cart (2)" with a
  // "2" stuck to its edge. The bubble was meant to be the phone-only half of
  // the pair and was tagged `sm:hidden`, but it carried an inline
  // `display: flex`, and an inline style beats a class — so the class hid
  // nothing and both halves drew at once.
  //
  // Asserted by counting what is actually painted rather than by reading the
  // markup, because that is the part the class was lying about.
  try {
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => localStorage.setItem('mpm_cart', JSON.stringify([
      { id: 'guard-1', productId: 'guard-1', name: 'Guard handset', price: 199, quantity: 2, image: '' },
    ])));
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);
    await dismissCookies(page);

    const counts = await page.evaluate(() => {
      const found = [];
      for (const el of document.querySelectorAll('body *')) {
        if (el.children.length) continue;            // leaf nodes only
        const text = (el.textContent || '').trim();
        if (!/^(2|Cart \(2\))$/.test(text)) continue;
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        if (getComputedStyle(el).visibility === 'hidden') continue;
        found.push(`"${text}"@${Math.round(r.x)},${Math.round(r.y)}`);
      }
      return found;
    });

    rec(view, 'Basket count is shown once, not twice',
      counts.length <= 1 ? 'PASS' : 'FAIL',
      counts.length ? counts.join(' + ') : 'no count rendered');
  } catch (e) {
    rec(view, 'Basket count is shown once, not twice', 'FAIL', e.message.slice(0, 100));
  } finally {
    await page.evaluate(() => localStorage.removeItem('mpm_cart')).catch(() => {});
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
  //
  // The product is found from the shop, not hard-coded. This used to open
  // /product/apple-iphone-17-unlocked, an id that exists only in the mock
  // catalogue — so against the emulator seed every product-page check below
  // failed on a "no longer available" page, and against mock data the suite
  // never exercised the real catalogue at all. Taking the first card the
  // shop lists that is not sold out makes the walk the shopper's walk,
  // whatever the data behind it.
  try {
    await openInStockProduct(page);
    await dismissCookies(page);
    await shot(page, view, 'product-detail');
    const t = await txt(page);
    rec(view, 'Product detail renders', /£\d/.test(t) ? 'PASS' : 'FAIL');
    // WARN, not FAIL: a single-configuration listing has nothing to select.
    rec(view, 'Variant selectors present', /\b(64|128|256|512)\s?GB\b|\b1\s?TB\b/.test(t) ? 'PASS' : 'WARN',
      'no storage variants on this listing');
    rec(view, 'Delivery estimate shown', /delivery|get it by/i.test(t) ? 'PASS' : 'WARN');
  } catch (e) { rec(view, 'Product detail renders', 'FAIL', e.message.slice(0, 100)); }

  // ── The product page answers the buy question without scrolling ──
  //
  // Measured before the redesign, on a 390x664 phone: the page opened on a
  // breadcrumb and a square photograph, showed no price at all, and Add to
  // cart sat 1624px down — two and a half screens. On a 1440x900 desktop the
  // button was at 1126px. Nothing failed: every element rendered, in order,
  // and the shopper simply could not see what they were deciding.
  //
  // Two properties, one per direction of the problem. The price has to be on
  // the first screen, and Add to cart has to be reachable from anywhere on a
  // page that runs to thousands of pixels.
  try {
    const priceOnFirstScreen = await page.evaluate(() => {
      const vh = window.innerHeight;
      return [...document.querySelectorAll('body *')].some((el) => {
        if (el.children.length) return false;
        if (!/^£[\d,]+$/.test((el.textContent || '').trim())) return false;
        const r = el.getBoundingClientRect();
        return r.top >= 0 && r.top < vh && r.width > 0;
      });
    });
    rec(view, 'Product page shows a price without scrolling',
      priceOnFirstScreen ? 'PASS' : 'FAIL');

    // A price with nothing to act on is half a buy box. On a phone the real
    // button sits about 1,200px down, so the sticky bar has to be up on its
    // own — the bar used to arm only after the button had been seen once,
    // which on a phone meant no buy control anywhere on the first screen.
    await page.waitForTimeout(1200);
    const buyOnFirstScreen = await page.evaluate(() => {
      const vh = window.innerHeight;
      const onScreen = (el) => { const r = el?.getBoundingClientRect(); return !!r && r.width > 0 && r.top < vh && r.bottom > 0; };
      const real = [...document.querySelectorAll('button')]
        .find(b => /add to cart|out of stock/i.test(b.textContent || '') && !b.closest('.pdp-stickybuy'));
      return onScreen(real) || onScreen(document.querySelector('.pdp-stickybuy'));
    });
    rec(view, 'Product page shows a buy control without scrolling',
      buyOnFirstScreen ? 'PASS' : 'FAIL');

    // Deep in the page, past the specs and reviews, the bar must take over —
    // on a phone. On desktop the bar was removed on purpose (a deliberate
    // product call: the full-width bottom bar read as clutter under a
    // mouse-driven page, and desktop shoppers have the product grid's own
    // "Buy Now" per card plus the cart-count animation as other ways in),
    // so scrolling past the sticky buy column's own range with nothing to
    // catch the fall is the accepted trade-off there, not a regression.
    await page.evaluate(() => window.scrollTo(0, 2400));
    await page.waitForTimeout(700);
    const reachable = await page.evaluate(() => {
      const btn = [...document.querySelectorAll('button')]
        .find(b => /add to cart|out of stock/i.test(b.textContent || ''));
      const r = btn?.getBoundingClientRect();
      const realOnScreen = r ? r.top < window.innerHeight && r.bottom > 0 : false;
      const bar = document.querySelector('.pdp-stickybuy');
      const barOnScreen = Boolean(bar && bar.getBoundingClientRect().width > 0);
      return { realOnScreen, barOnScreen };
    });
    if (view === 'desktop') {
      rec(view, 'No sticky bottom bar on desktop (removed on purpose)',
        !reachable.barOnScreen ? 'PASS' : 'FAIL', JSON.stringify(reachable));
    } else {
      rec(view, 'Add to cart stays reachable deep in the product page',
        reachable.realOnScreen || reachable.barOnScreen ? 'PASS' : 'FAIL',
        JSON.stringify(reachable));
    }

    // And never two of them at once, which is what a scroll-offset trigger
    // gets wrong: a second Add to cart floating beside the first.
    rec(view, 'Never two Add to cart buttons at once',
      !(reachable.realOnScreen && reachable.barOnScreen) ? 'PASS' : 'FAIL');

    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(400);
  } catch (e) { rec(view, 'Product page buy box', 'FAIL', e.message.slice(0, 100)); }

  // ── Reviews are for customers who bought the thing ──
  //
  // The endpoint behind this took no authentication at all: any caller could
  // post any rating for any product under any name. Two things must hold on
  // the page — no write control is offered to someone who has not bought it,
  // and the page says why rather than going quiet.
  //
  // There were TWO write buttons, one in the ratings sidebar and one in the
  // empty state. Gating the first and not the second left every product with
  // no reviews yet — which is every new product — wide open. So this counts
  // buttons rather than checking a selector.
  //
  // Reviews used to be the third of three tabs, so this clicked the tab
  // first. They are a section on the page now — the tabs hid two thirds of
  // the product's own evidence behind a tap nobody made — so the check
  // scrolls to the section instead of opening it.
  try {
    const section = page.locator('#pdp-reviews');
    if (await section.count()) {
      await section.scrollIntoViewIfNeeded();
      await page.waitForTimeout(2500);

      const state = await page.evaluate(() => ({
        writeButtons: [...document.querySelectorAll('button')]
          .filter(b => /write a review/i.test(b.textContent || '')).length,
        gate: document.querySelector('.rv-gate')?.textContent?.replace(/\s+/g, ' ').trim() ?? null,
        // The section has to be reachable without a click for any of this to
        // be in front of a shopper at all.
        visible: (document.querySelector('#pdp-reviews')?.getBoundingClientRect().height ?? 0) > 0,
      }));

      rec(view, 'Reviews are on the page, not behind a tab',
        state.visible ? 'PASS' : 'FAIL');
      rec(view, 'No review form is offered to a visitor who has not bought it',
        state.writeButtons === 0 ? 'PASS' : 'FAIL', `${state.writeButtons} write buttons`);
      rec(view, 'The page says why it cannot be reviewed',
        state.gate && state.gate.length > 10 ? 'PASS' : 'FAIL', state.gate ?? 'no explanation shown');
    } else {
      rec(view, 'Reviews are on the page, not behind a tab', 'FAIL', '#pdp-reviews not found');
    }
  } catch (e) { rec(view, 'Review gating', 'FAIL', e.message.slice(0, 100)); }

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
