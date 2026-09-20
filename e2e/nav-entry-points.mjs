// Navigation entry-point suite: count how many ways one destination can be
// reached from a single screen, and assert it is one.
//
//   npm run build && npx vite preview --port 4173 &
//   npm run e2e:nav
//
// Exits non-zero on any FAIL.
//
// WHY THIS IS A BROWSER TEST AND NOT A UNIT TEST
//
// The failure this guards against is a computed-style failure, and jsdom does
// not apply the Tailwind stylesheet, so an RTL test would render every control
// as "present" and pass no matter what. Worse, the specific bug that put three
// account doors on one phone screen is a class being silently beaten by an
// inline style — `className="lg:hidden"` on an element that also sets
// `display:'flex'` inline. Only a real engine resolving a real cascade can see
// that. So this suite asks the browser what is actually visible at a width,
// and never asks the markup what it intended.
//
// WHY ONE DOOR
//
// Settled twice already in Navbar.tsx, for the wishlist heart and the cart
// pill: "Two entry points to one list is not a shortcut, it is a question the
// visitor has to answer (are these the same thing?) before either is useful."
// Account was missed at the time and had accumulated three on a phone — the
// tab bar, the More menu and the drawer — and Admin had two.
import { chromium } from 'playwright';
import { resolveChromium } from './chromium-path.mjs';

const BASE = process.env.E2E_BASE_URL || 'http://127.0.0.1:4173';
const EXE  = resolveChromium();

const results = [];
function rec(view, what, expected, got, detail = '') {
  const ok = expected === got;
  results.push({ view, what, ok });
  console.log(
    `[${view.padEnd(11)}] ${ok ? 'PASS' : 'FAIL'}  ${what}: expected ${expected}, got ${got}` +
    (detail ? ` — ${detail}` : '')
  );
  return ok;
}

/**
 * Every on-screen control that leads to the account, as the browser sees it.
 *
 * Matches on destination rather than on a test id: a door is a door whether it
 * is a <Link to="/account">, a button that opens the auth modal, or a tab. An
 * id-based check would keep passing after someone added a fourth one.
 */
async function accountDoors(page) {
  return page.evaluate(() => {
    const shown = (el) => {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none';
    };
    const out = [];
    for (const el of document.querySelectorAll('a,button')) {
      if (!shown(el)) continue;
      const href = el.getAttribute('href') || '';
      const txt = (el.textContent || '').trim().replace(/\s+/g, ' ');
      if (href.endsWith('/account') || /^(My Account|Sign In|Sign in \/ Register|Account)$/i.test(txt)) {
        out.push(txt || el.getAttribute('aria-label') || '(unlabelled)');
      }
    }
    return out;
  });
}

async function run() {
  const browser = await chromium.launch({ executablePath: EXE });

  for (const [view, width] of [['mobile', 390], ['tablet', 768], ['desktop', 1440]]) {
    const ctx = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await ctx.newPage();

    await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);

    // Resting screen: nothing opened yet.
    const resting = await accountDoors(page);

    // The drawer, where the account buttons used to be pinned. Only counts
    // doors the resting screen did not already show.
    let drawer = [];
    const burger = page.locator('#navbar-hamburger');
    if (await burger.isVisible().catch(() => false)) {
      await burger.click();
      await page.waitForTimeout(500);
      drawer = (await accountDoors(page)).filter((d) => !resting.includes(d));
      await page.keyboard.press('Escape').catch(() => {});
      await page.waitForTimeout(300);
    }

    // The More ("...") menu. Reloaded first so a half-closed drawer cannot
    // leak its controls into this count.
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    await page.locator('#navbar-menu-btn').click();
    await page.waitForTimeout(500);
    const more = (await accountDoors(page)).filter((d) => !resting.includes(d));

    const all = [...resting, ...drawer, ...more];
    rec(view, 'ways into the account', 1, all.length, all.join(' + ') || 'none');

    // ── The screen behind that one door ──────────────────────────────
    // The signed-out account screen ends with the registered-office and VAT
    // line, which exists specifically so it can be read. The support FAB
    // floats above the same corner and is repositioned at four different
    // breakpoints in index.css, so "it clears it at 390px" is not a fact
    // about the other widths. Assert it everywhere instead of trusting the
    // arithmetic in .account-gate to hold.
    await page.goto(`${BASE}/account`, { waitUntil: 'networkidle' });
    const cookies = page.getByRole('button', { name: /accept all cookies/i });
    if (await cookies.count()) { await cookies.first().click().catch(() => {}); await page.waitForTimeout(400); }
    await page.waitForTimeout(800);

    const collision = await page.evaluate(() => {
      const box = (el) => {
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { l: r.left, r: r.right, t: r.top, b: r.bottom };
      };
      const legal = box(document.querySelector('.account-gate .app-legal'));
      const fab = box(document.querySelector('.support-fab'));
      // Desktop has no folded-in legal strip here (the site footer carries
      // it), so there is nothing to collide.
      if (!legal || !fab) return { checked: false, hit: false };
      const hit = legal.r > fab.l && legal.l < fab.r && legal.b > fab.t && legal.t < fab.b;
      return { checked: true, hit };
    });
    if (collision.checked) {
      rec(view, 'support button clear of the legal line', false, collision.hit);
    } else {
      console.log(`[${view.padEnd(11)}] SKIP  support button vs legal line: no folded-in legal strip at this width`);
    }

    await ctx.close();
  }

  await browser.close();

  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} passed`);
  process.exit(failed === 0 ? 0 : 1);
}

run().catch((err) => { console.error(err); process.exit(1); });
