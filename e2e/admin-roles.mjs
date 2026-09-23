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
import {
  ADMIN_EMAIL, STAFF_EMAIL, PASSWORD, listCollection, getProduct, catalogueIdFor,
} from './emulator-seed.mjs';

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

    // Controls. If staff cannot do their own job, every refusal above proves
    // only that the account is broken.
    for (const [path, shot] of [['/admin/orders', 'staff-orders'], ['/admin/returns', 'staff-returns']]) {
      const body = await open(page, path, shot);
      rec(`CONTROL staff open ${path}`, !/managers only|staff access only/i.test(body));
    }

    rec('No uncaught errors as staff', errors.length === 0, errors.slice(0, 2).join(' | '));
    await ctx.close();
  }

  // ── The catalogue, end to end, across both roles ─────────────
  //
  // The owner's rule: an employee lists only a model already in the
  // database, and a model that is not becomes a task for a manager. The
  // unit tests prove each screen behaves; only this proves the rule works as
  // a sequence — that a request a member of staff sends is the request a
  // manager sees, that approving it puts the model in front of the staff
  // member, and that the listing they then make is linked to it.
  //
  // Each step checks the database, not only the screen. What the page says
  // happened and what happened are different claims.
  const NEW_MODEL = 'iPhone 17e';
  const NEW_ID = catalogueIdFor('Apple', NEW_MODEL);

  // 1. Staff: no way to type a model, and a request for the missing one.
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const page = await ctx.newPage();
    await signInAs(page, STAFF_EMAIL);
    await open(page, '/admin/inventory/new', null);
    await page.waitForTimeout(1500);

    rec('Staff have no text box for brand or model',
      (await page.locator('input#field-brand, input#field-model').count()) === 0
      && (await page.locator('select#field-brand').count()) === 1);
    rec('Staff are not offered "+ Add a model…"',
      (await page.locator('select#field-model option', { hasText: /add a model/i }).count()) === 0);
    rec(`${NEW_MODEL} is not in the picker yet`,
      !(await page.locator('select#field-model').innerText().catch(() => '')).includes(NEW_MODEL));

    await page.getByRole('button', { name: /model not listed/i }).click();
    await page.waitForTimeout(400);
    await page.locator('#field-requestBrand').selectOption({ label: 'Apple' });
    // The guard first: a size in the name must stop the request being sent.
    await page.locator('#field-requestModel').fill(`${NEW_MODEL} 128GB`);
    await page.waitForTimeout(300);
    rec('A requested model with the storage in its name cannot be sent',
      await page.getByRole('button', { name: /send to a manager/i }).isDisabled());
    await page.locator('#field-requestModel').fill(NEW_MODEL);
    await page.locator('#field-requestNote').fill('Two in from the supplier this morning');
    await page.getByRole('button', { name: /send to a manager/i }).click();
    await page.waitForTimeout(2000);
    rec('Staff are told the request is with a manager',
      /with a manager/i.test(await page.textContent('body') ?? ''));
    await page.screenshot({ path: `${OUT}/flow-1-staff-requested.png`, fullPage: true });

    const requests = await listCollection('modelRequests');
    const mine = requests.find(r => r.model === NEW_MODEL);
    rec('The request is in the database, open, in the staff member\'s name',
      mine?.status === 'open' && mine?.requestedBy === STAFF_EMAIL,
      mine ? `${mine.status} by ${mine.requestedBy}` : 'no request written');
    await ctx.close();
  }

  // 2. Manager: sees the waiting count, approves, and the model exists.
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const page = await ctx.newPage();
    await signInAs(page, ADMIN_EMAIL);
    await open(page, '/admin', null);
    rec('The manager\'s nav shows a request waiting',
      (await page.locator('.ops-nav-count').first().textContent().catch(() => '')) === '1');

    await open(page, '/admin/catalogue', null);
    await page.getByRole('button', { name: new RegExp(`^Approve request for Apple ${NEW_MODEL}$`, 'i') }).click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${OUT}/flow-2-manager-approving.png`, fullPage: true });
    await page.getByRole('form', { name: new RegExp(`^Approve Apple ${NEW_MODEL}$`, 'i') })
      .getByRole('button', { name: /approve/i }).click();
    await page.waitForTimeout(2500);

    const entry = (await listCollection('catalogueModels')).find(m => m.id === NEW_ID);
    rec('Approving adds the model to the catalogue', entry?.model === NEW_MODEL,
      entry ? `${entry.brand} ${entry.model}` : 'no entry written');
    const closed = (await listCollection('modelRequests')).find(r => r.model === NEW_MODEL);
    rec('Approving closes the request against that entry',
      closed?.status === 'approved' && closed?.catalogueModelId === NEW_ID);

    // The count must fall once the queue is empty — it used to be read once
    // per visit and stayed at 1 after the manager had cleared it.
    await open(page, '/admin', null);
    rec('The waiting count clears once the manager has acted',
      (await page.locator('.ops-nav-count').count()) === 0);
    await page.screenshot({ path: `${OUT}/flow-3-manager-cleared.png`, fullPage: true });
    await ctx.close();
  }

  // 3. Staff: the model is now in the picker, and a listing for it saves
  //    linked to the entry.
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const page = await ctx.newPage();
    await signInAs(page, STAFF_EMAIL);
    await open(page, '/admin/inventory/new', null);
    await page.waitForTimeout(1500);

    await page.locator('select#field-brand').selectOption({ label: 'Apple' });
    await page.waitForTimeout(300);
    rec(`${NEW_MODEL} is now in the staff picker`,
      (await page.locator('select#field-model option', { hasText: NEW_MODEL }).count()) === 1);
    await page.locator('select#field-model').selectOption({ label: NEW_MODEL });
    await page.locator('#field-price').fill('399');
    await page.locator('#field-originalPrice').fill('599');
    await page.locator('#field-stock').fill('2');
    await page.getByRole('button', { name: /^create product$/i }).click();
    await page.waitForTimeout(3000);
    await page.screenshot({ path: `${OUT}/flow-4-staff-listed.png`, fullPage: true });

    const slug = `apple-${NEW_MODEL.toLowerCase().replace(/\s+/g, '-')}`;
    const listing = await getProduct(slug);
    rec('The staff listing is saved and linked to the catalogue entry',
      listing?.catalogueModelId === NEW_ID && listing?.model === NEW_MODEL,
      listing ? `catalogueModelId=${listing.catalogueModelId}` : `no product at ${slug}`);
    await ctx.close();
  }
} finally {
  await browser.close();
}

const passed = results.filter(r => r.ok).length;
console.log(`\n${passed}/${results.length} checks passed`);
console.log(`Screenshots in ${OUT}/`);
process.exit(passed === results.length ? 0 : 1);
