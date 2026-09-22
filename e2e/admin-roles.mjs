// The console as each role actually sees it, at a realistic catalogue size.
//
//   node e2e/volume.mjs && node e2e/admin-roles.mjs
//
// WHY A BROWSER AND NOT A UNIT TEST
//
// The unit tests mock useAdmin, so they prove the components branch correctly
// on a capability. They cannot prove that the capability a real signed-in
// staff account carries is the one the components are branching on: that
// depends on a custom claim surviving Firebase Auth, the ID token, the
// AuthContext refresh and the router guard, and a mock skips all four. The
// only way to know a staff member cannot reach the home-page editor is to
// sign in as one and try to open it.
//
// It also reads every screen at twelve hundred products rather than two, which
// is where InventoryManager's month-long simulation found its own defect — a
// panel on screen with nothing in it, and a check that passed without ever
// reading a line.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { resolveChromium } from './chromium-path.mjs';
import { ADMIN_EMAIL, STAFF_EMAIL, PASSWORD } from './emulator-seed.mjs';

const BASE = process.env.E2E_BASE || 'http://127.0.0.1:4173';
const OUT = 'e2e-screenshots/admin-roles';
mkdirSync(OUT, { recursive: true });

const results = [];
const rec = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
};

async function dismissCookies(page) {
  const accept = page.getByRole('button', { name: /accept all|accept/i }).first();
  if (await accept.isVisible().catch(() => false)) {
    await accept.click().catch(() => {});
    await page.waitForTimeout(400);
  }
}

async function signInAs(page, identifier) {
  // domcontentloaded rather than networkidle: Firestore holds a long-lived
  // WebChannel open, so the network never goes idle and every navigation
  // would sit until the timeout.
  await page.goto(`${BASE}/account`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  await dismissCookies(page);

  await page.getByRole('button', { name: /sign in|log in|account/i }).first().click();
  await page.waitForTimeout(1200);

  const email = page.getByPlaceholder(/email or username|email address/i).first();
  await email.waitFor({ state: 'visible', timeout: 15000 });
  await email.fill(identifier);
  await page.getByPlaceholder(/^password$/i).first().fill(PASSWORD);
  await page.locator('form').getByRole('button', { name: /^(sign in|log in)$/i }).first().click();
  await page.waitForTimeout(3500);
}

/**
 * The role chip's own text.
 *
 * Read from the element rather than from the page body, because the body's
 * textContent concatenates without separators — the header strip flattens to
 * "AdminStaffDashboard", where a `\bstaff\b` match is impossible and a bare
 * /staff/ match would also hit the words "staff account" in a refusal screen.
 * The first version of this check asserted against the body and reported a
 * failure the application did not have.
 */
async function roleChip(page) {
  return (await page.locator('.ops-role').first().textContent().catch(() => '')) ?? '';
}

async function open(page, path, shot) {
  await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded' });
  // The console's own gate refreshes the ID token before deciding, so there
  // is a real wait here that is not a network wait.
  await page.waitForTimeout(3000);
  if (shot) await page.screenshot({ path: `${OUT}/${shot}.png`, fullPage: true });
  return (await page.textContent('body')) ?? '';
}

const browser = await chromium.launch({ executablePath: resolveChromium() });

try {
  // ── Manager ──────────────────────────────────────────────────
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));

    await signInAs(page, ADMIN_EMAIL);

    const dash = await open(page, '/admin', 'manager-dashboard');
    rec('Manager reaches the dashboard', !/staff access only|managers only|sign in required/i.test(dash));
    rec('Manager role is named in the header', /^manager$/i.test((await roleChip(page)).trim()),
      'the header chip says which hat you are wearing');

    const inv = await open(page, '/admin/inventory', 'manager-inventory');
    rec('Inventory renders at 1,200 products', /iPhone|Galaxy|Pixel/i.test(inv));
    // The control for the staff assertion below. If the archive button were
    // missing for everybody — renamed, or broken — "staff cannot see it"
    // would pass while proving nothing at all.
    rec('CONTROL manager is offered archive buttons',
      (await page.getByRole('button', { name: /^archive /i }).count()) > 0);
    // The panel-passes-vacuously trap: a console that renders an empty table
    // at this size is broken, not tidy.
    rec('Inventory is not empty at volume', !/no products|nothing to show/i.test(inv));

    for (const [path, shot] of [
      ['/admin/orders', 'manager-orders'],
      ['/admin/returns', 'manager-returns'],
      ['/admin/home', 'manager-home-layout'],
      ['/admin/series', 'manager-series'],
      ['/admin/analytics', 'manager-analytics'],
    ]) {
      const body = await open(page, path, shot);
      rec(`Manager opens ${path}`, !/managers only|staff access only/i.test(body));
    }

    rec('No uncaught errors as manager', errors.length === 0, errors.slice(0, 2).join(' | '));
    await ctx.close();
  }

  // ── Staff ────────────────────────────────────────────────────
  //
  // A separate browser context, not a sign-out: a stale ID token is exactly
  // the bug this is meant to catch, and reusing the context would let one
  // leak between the two runs and make a refusal look like a pass.
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));

    await signInAs(page, STAFF_EMAIL);

    const dash = await open(page, '/admin', 'staff-dashboard');
    rec('Staff reach the dashboard', !/staff access only|sign in required/i.test(dash));
    rec('Staff role is named in the header', /^staff$/i.test((await roleChip(page)).trim()));

    const inv = await open(page, '/admin/inventory', 'staff-inventory');
    rec('Staff see the inventory', /iPhone|Galaxy|Pixel/i.test(inv));
    // Not merely absent from the nav: the button itself must not be rendered,
    // because a button that leads to a refusal is worse than no button.
    //
    // Queried by accessible name, not by page text. The button is icon-only,
    // so its label lives in an aria-label and never appears in the body's
    // textContent — the first version of this check tested a string that
    // could not have been there whether the button was rendered or not, which
    // is the vacuous-assertion trap this whole suite exists to avoid.
    rec('Staff are offered no archive button',
      (await page.getByRole('button', { name: /^archive /i }).count()) === 0);
    // And the stock editor, which staff do need, is still there — otherwise
    // the line above would pass on a page that failed to render its actions.
    rec('CONTROL staff keep the stock editor',
      (await page.getByRole('button', { name: /stock/i }).count()) > 0);

    // The nav is filtered by role. A link to a page you cannot open is a
    // promise the console cannot keep.
    rec('Staff see no link to the shop-front editors',
      !/home layout|series|analytics/i.test(dash));

    // The real assertion: typing the URL anyway. A bookmark from before a
    // role changed must be refused, not merely unlinked.
    for (const [path, shot] of [
      ['/admin/home', 'staff-home-layout-refused'],
      ['/admin/series', 'staff-series-refused'],
      ['/admin/banners', 'staff-banners-refused'],
      ['/admin/analytics', 'staff-analytics-refused'],
    ]) {
      const body = await open(page, path, shot);
      rec(`Staff are refused ${path} by URL`, /managers only/i.test(body),
        'the guard must not depend on the nav hiding the link');
    }

    // ── The catalogue gate ──
    //
    // Staff may create a product; they may not invent a brand the shop has
    // never carried. Worth doing in a browser rather than only in a unit
    // test, because the gate depends on a real read of the real catalogue:
    // a failed or empty vocabulary must block nothing, and the only way to
    // know the read succeeded is to sign in and type into the real form.
    await open(page, '/admin/inventory/new', null);

    await page.locator('#field-brand').fill('Nokia');
    await page.locator('#field-model').fill('3310');
    // Snapping happens on blur, and so does the gate's own check.
    await page.locator('#field-model').blur();
    await page.waitForTimeout(400);
    await page.getByRole('button', { name: /save|create|add product/i }).first().click();
    await page.waitForTimeout(1200);

    const refused = await page.textContent('body') ?? '';
    rec('Staff cannot invent a brand the shop has never carried',
      /catalogue has no brand|ask a manager/i.test(refused),
      'the message must say what to do, not merely refuse');
    await page.screenshot({ path: `${OUT}/staff-catalogue-gate.png`, fullPage: true });

    // The other half: an existing spelling is corrected rather than refused.
    await page.locator('#field-brand').fill('apple');
    await page.locator('#field-brand').blur();
    await page.waitForTimeout(500);
    rec('CONTROL a known brand is snapped to the catalogue spelling',
      (await page.locator('#field-brand').inputValue()) === 'Apple');

    // Controls. If staff cannot do their own job, every refusal above proves
    // only that the account is broken.
    for (const [path, shot] of [['/admin/orders', 'staff-orders'], ['/admin/returns', 'staff-returns']]) {
      const body = await open(page, path, shot);
      rec(`CONTROL staff open ${path}`, !/managers only|staff access only/i.test(body));
    }

    rec('No uncaught errors as staff', errors.length === 0, errors.slice(0, 2).join(' | '));
    await ctx.close();
  }
} finally {
  await browser.close();
}

const passed = results.filter(r => r.ok).length;
console.log(`\n${passed}/${results.length} checks passed`);
console.log(`Screenshots in ${OUT}/`);
process.exit(passed === results.length ? 0 : 1);
