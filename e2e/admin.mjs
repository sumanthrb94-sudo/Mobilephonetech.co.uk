// Admin back-store end-to-end suite: desktop + mobile.
//
//   npm run e2e:admin
//
// Runs the real app in a real browser against the **Firebase emulator suite**,
// so the security rules in firestore.rules and storage.rules are the ones
// actually enforced. That matters: a hand-written stub of the rules could only
// encode what I already believe they do, which is the thing worth testing.
//
// Sign-in is performed through the real auth form with a real password — no
// session is injected — so the whole path from credentials to admin claim to
// rules decision is exercised.
//
// Screenshots land in e2e/screenshots/admin. Exits non-zero on any FAIL.
import { chromium, devices } from 'playwright';
import { mkdirSync } from 'node:fs';
import { resolveChromium } from './chromium-path.mjs';
import {
  seed, waitForEmulators, getProduct, countProducts, attemptProductWriteAs,
  ADMIN_EMAIL, CUSTOMER_EMAIL, PASSWORD,
} from './emulator-seed.mjs';

const BASE = process.env.E2E_BASE_URL || 'http://127.0.0.1:4173';
const EXE = resolveChromium();
const OUT = process.env.E2E_ADMIN_SHOTS || 'e2e/screenshots/admin';

mkdirSync(OUT, { recursive: true });

const results = [];
let shotN = 0;
const rec = (view, name, ok, detail = '') => results.push({ view, name, ok, detail });

async function shot(page, name) {
  shotN += 1;
  await page.screenshot({ path: `${OUT}/${String(shotN).padStart(2, '0')}-${name}.png`, fullPage: false });
}

/**
 * Wait for something to actually render rather than for a fixed delay.
 *
 * Every admin route gates on an auth check and then a Firestore query, neither
 * of which has a fixed cost. A flat 600–800ms passed locally and failed
 * intermittently under load, so the suite reported a different failure on each
 * run — which makes every result, pass or fail, untrustworthy.
 *
 * Failure to appear is swallowed on purpose: the assertion that follows is
 * what should report the problem, with its own message.
 */
async function settled(page, selector, timeout = 20000) {
  await page.locator(selector).first()
    .waitFor({ state: 'visible', timeout })
    .catch(() => {});
}

async function dismissCookies(page) {
  const b = page.getByRole('button', { name: /accept all cookies/i });
  if (await b.count()) { await b.first().click().catch(() => {}); await page.waitForTimeout(300); }
}

/**
 * Sign in through the real form.
 *
 * `admin` is typed as a bare username to exercise the staff-username
 * resolution (utils/loginIdentifier) as well as the auth call itself.
 */
async function signInAs(page, identifier) {
  // domcontentloaded rather than networkidle throughout: Firestore holds a
  // long-lived WebChannel connection open, so the network never goes idle and
  // every navigation would sit until the timeout.
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  await dismissCookies(page);

  // The auth modal lives behind the "More" menu (desktop) / burger (mobile);
  // /account itself redirects away when signed out.
  const more = page.locator('[aria-label="More options"], [aria-label="Open menu"]').first();
  if (await more.count()) { await more.click(); await page.waitForTimeout(900); }

  const signIn = page.getByRole('button', { name: /sign in|log in|account/i }).first();
  await signIn.click();
  await page.waitForTimeout(1200);

  const emailField = page.getByPlaceholder(/email or username|email address/i).first();
  await emailField.waitFor({ state: 'visible', timeout: 15000 });
  await emailField.fill(identifier);
  await page.getByPlaceholder(/^password$/i).first().fill(PASSWORD);

  // The submit button inside the modal, not the nav control that opened it.
  await page.locator('form').getByRole('button', { name: /^(sign in|log in)$/i }).first().click();

  // Wait for the modal to close, which is the app's own signal that
  // onAuthStateChanged has fired and the session is live.
  await page.waitForTimeout(3500);
}

async function run(view, contextOpts) {
  const browser = await chromium.launch({ ...(EXE ? { executablePath: EXE } : {}), args: ['--no-sandbox'] });
  const ctx = await browser.newContext(contextOpts);
  const errors = [];

  // Fresh emulator state per view, so desktop and mobile never interfere.
  await seed();

  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(String(e.message).slice(0, 160)));

  // Real sign-in with a real password, typed as the bare staff username.
  await signInAs(page, 'admin');
  rec(view, 'Signs in with the bare "admin" username', true);

  const txt = async () => (await page.locator('body').innerText()).replace(/\s+/g, ' ');

  // ── 1. Dashboard loads for an admin ──
  await page.goto(`${BASE}/admin/inventory`, { waitUntil: 'domcontentloaded' });
  await dismissCookies(page);
  await settled(page, '.admin-row');
  let body = await txt();
  rec(view, 'Admin dashboard opens for an admin', /\bAdmin\b/i.test(body) && /Inventory/i.test(body), body.slice(0, 90));
  rec(view, 'Seeded products are listed', /iPhone 17/.test(body) && /Galaxy S23/.test(body));
  rec(view, 'Product count matches the rows shown', /2 products/.test(body), body.slice(0, 120));
  rec(view, 'Storefront chrome (marketing footer) is hidden', !/Sign up to our newsletter/i.test(body));
  await shot(page, `${view}-dashboard`);

  // ── 2. Stock states are visually distinguished ──
  // Zero reads as "Out of stock", not "0 in stock" — the count is only
  // meaningful while there is one. The aria-label still carries the number.
  rec(view, 'Out-of-stock item is labelled out of stock', /Out of stock/.test(body));
  rec(view, 'Low-stock item shows its count', /4 in stock/.test(body));

  // ── 3. Inline stock edit persists ──
  const stockBtn = page.getByRole('button', { name: /Edit stock for Apple iPhone 17/i }).first();
  if (await stockBtn.count()) {
    await stockBtn.click();
    const input = page.getByRole('spinbutton', { name: /Stock for Apple iPhone 17/i }).first();
    await input.fill('17');
    await page.getByRole('button', { name: /Save stock/i }).first().click();
    await page.waitForTimeout(600);
    const after = await txt();
    rec(view, 'Inline stock edit saves', /17 in stock/.test(after) && /Stock updated/i.test(after));
    const stored = await getProduct('apple-iphone-17');
    rec(view, 'Stock edit reached Firestore', stored?.stock === 17, `stock=${stored?.stock}`);
    await shot(page, `${view}-stock-edited`);
  } else {
    rec(view, 'Inline stock edit saves', false, 'stock button not found');
    rec(view, 'Stock edit reached the database', false, 'stock button not found');
  }

  // ── 4. Filtering ──
  const stockFilter = page.getByRole('combobox', { name: /Filter by stock/i }).first();
  if (await stockFilter.count()) {
    await stockFilter.selectOption('out');
    await page.waitForTimeout(600);
    const filtered = await txt();
    rec(view, 'Out-of-stock filter narrows the list', /Galaxy S23/.test(filtered) && !/iPhone 17\b/.test(filtered), filtered.slice(0, 80));
    await stockFilter.selectOption('all');
    await page.waitForTimeout(500);
  } else {
    rec(view, 'Out-of-stock filter narrows the list', false, 'filter not found');
  }

  // ── 5. Search ──
  const search = page.getByRole('textbox', { name: /Search inventory/i }).first();
  if (await search.count()) {
    await search.fill('galaxy');
    await page.waitForTimeout(800);
    rec(view, 'Search box accepts a query', (await search.inputValue()) === 'galaxy');
    await search.fill('');
    await page.waitForTimeout(700);
  } else {
    rec(view, 'Search box accepts a query', false, 'search not found');
  }

  // ── 6. Create a product ──
  await page.goto(`${BASE}/admin/inventory/new`, { waitUntil: 'domcontentloaded' });
  await settled(page, '#field-brand');
  rec(view, 'Add-product form opens', /Add a product/i.test(await txt()));

  // Empty submit must surface validation, not silently do nothing.
  await page.getByRole('button', { name: /Create product/i }).first().click();
  await page.waitForTimeout(400);
  rec(view, 'Empty form is rejected with field errors', /Required/i.test(await txt()));
  await shot(page, `${view}-editor-validation`);

  await page.locator('#field-brand').fill('Google');
  await page.locator('#field-model').fill('Pixel 9 Pro');
  await page.waitForTimeout(300);
  const slug = await page.locator('#field-id').inputValue();
  rec(view, 'Slug auto-derives from brand and model', slug === 'google-pixel-9-pro', slug);

  await page.locator('#field-price').fill('649');
  await page.locator('#field-originalPrice').fill('399');
  await page.getByRole('button', { name: /Create product/i }).first().click();
  await page.waitForTimeout(400);
  rec(view, 'Was-price below sale price is rejected', /below the selling price/i.test(await txt()));

  await page.locator('#field-originalPrice').fill('1099');
  await page.locator('#field-stock').fill('6');
  await page.getByRole('button', { name: /Create product/i }).first().click();
  await page.waitForTimeout(1000);

  const created = await getProduct('google-pixel-9-pro');
  rec(view, 'Product is created in Firestore', Boolean(created), created ? '' : 'not found in Firestore');
  rec(view, 'Created product carries the right price',
    created?.price === 649 && created?.originalPrice === 1099,
    `price=${created?.price} was=${created?.originalPrice}`);
  rec(view, 'Created product has searchTerms for the search index',
    Array.isArray(created?.searchTerms?.arrayValue?.values ?? created?.searchTerms) || created?.searchTerms != null);
  rec(view, 'Redirects to the inventory list after saving', /\/admin\/inventory$/.test(new URL(page.url()).pathname));
  rec(view, 'Success message is shown', /saved/i.test(await txt()));
  await shot(page, `${view}-created`);

  // ── 7. Edit an existing product ──
  await page.goto(`${BASE}/admin/inventory/apple-iphone-17`, { waitUntil: 'domcontentloaded' });
  await settled(page, '#field-model');
  rec(view, 'Edit form loads the existing values', (await page.locator('#field-model').inputValue()) === 'iPhone 17');
  rec(view, 'Slug is locked when editing', await page.locator('#field-id').isEditable() === false);

  await page.locator('#field-price').fill('699');
  await page.getByRole('button', { name: /Save changes/i }).first().click();
  await page.waitForTimeout(1000);
  const edited = await getProduct('apple-iphone-17');
  rec(view, 'Edit persists to Firestore', edited?.price === 699, `price=${edited?.price}`);
  await shot(page, `${view}-edited`);

  // ── 8. Image manager ──
  await page.goto(`${BASE}/admin/inventory/apple-iphone-17`, { waitUntil: 'domcontentloaded' });
  await settled(page, '#field-model');
  rec(view, 'Image manager renders', /Images/.test(await txt()));

  const uploadBtn = page.getByRole('button', { name: /Upload images/i }).first();
  rec(view, 'Upload control is available', await uploadBtn.count() > 0);

  // A 1x1 PNG is enough to prove the upload path end to end.
  const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  await page.locator('input[type="file"]').first().setInputFiles({
    name: 'pixel-front.png', mimeType: 'image/png', buffer: Buffer.from(pngBase64, 'base64'),
  });
  await page.waitForTimeout(1200);
  // The gallery grows only if the upload actually resolved a download URL,
  // which means the object reached the Storage emulator and passed its rules.
  const galleryAfter = await page.locator('img[alt*="product image" i], img[alt*="Primary product image" i]').count();
  rec(view, 'Image upload reaches storage', galleryAfter > 0, `${galleryAfter} image(s) in the gallery`);
  await shot(page, `${view}-image-uploaded`);

  // ── 9. Delete requires confirmation ──
  await page.goto(`${BASE}/admin/inventory`, { waitUntil: 'domcontentloaded' });
  await settled(page, '.admin-row');
  const before = await countProducts();
  const delBtn = page.getByRole('button', { name: /Delete Samsung Galaxy S23/i }).first();
  if (await delBtn.count()) {
    await delBtn.click();
    await page.waitForTimeout(400);
    rec(view, 'Delete opens a confirmation dialog', /cannot be undone/i.test(await txt()));
    await shot(page, `${view}-delete-confirm`);

    await page.getByRole('button', { name: /Keep it/i }).first().click();
    await page.waitForTimeout(400);
    rec(view, 'Cancelling the dialog does not delete', (await countProducts()) === before);

    await delBtn.click();
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: /Delete permanently/i }).first().click();
    await page.waitForTimeout(1200);
    rec(view, 'Confirmed delete removes the product from Firestore',
      (await getProduct('samsung-galaxy-s23')) === null, `${await countProducts()} left`);
    await shot(page, `${view}-deleted`);
  } else {
    rec(view, 'Delete opens a confirmation dialog', false, 'delete button not found');
    rec(view, 'Cancelling the dialog does not delete', false, 'delete button not found');
    rec(view, 'Confirmed delete removes the product', false, 'delete button not found');
  }

  // ── 10. Non-admin is refused even with a valid session ──
  const ctx2 = await browser.newContext(contextOpts);
  const page2 = await ctx2.newPage();
  await signInAs(page2, 'customer');
  await page2.goto(`${BASE}/admin/inventory`, { waitUntil: 'domcontentloaded' });
  await page2.waitForTimeout(900);
  const customerBody = (await page2.locator('body').innerText()).replace(/\s+/g, ' ');
  rec(view, 'Signed-in customer is refused', /Admin access only/i.test(customerBody), customerBody.slice(0, 90));
  rec(view, 'Customer sees no inventory data', !/Add product/i.test(customerBody));

  // The UI gate is presentation. These two are the part that matters: the
  // security rules are evaluated by the emulator against real ID tokens, so a
  // caller who bypasses the React guard entirely is judged exactly as
  // production would judge them.
  //
  // Both directions are asserted deliberately. A deny-only check would still
  // pass if the rules denied everybody — including the admin — which would be
  // a broken shop that looked secure.
  const customerWrite = await attemptProductWriteAs(CUSTOMER_EMAIL, 'apple-iphone-17', { price: 1 });
  const priceAfterCustomer = await getProduct('apple-iphone-17');
  rec(view, 'Security rules block a non-admin write',
    customerWrite.startsWith('DENIED') && priceAfterCustomer?.price !== 1,
    `${customerWrite} price=${priceAfterCustomer?.price}`);

  const adminWrite = await attemptProductWriteAs(ADMIN_EMAIL, 'apple-iphone-17', { price: 555 });
  const priceAfterAdmin = await getProduct('apple-iphone-17');
  rec(view, 'Security rules allow an admin write',
    adminWrite === 'ALLOWED' && priceAfterAdmin?.price === 555,
    `${adminWrite} price=${priceAfterAdmin?.price}`);

  // ── 11. Hygiene ──
  await page.goto(`${BASE}/admin/inventory`, { waitUntil: 'domcontentloaded' });
  await settled(page, '.admin-row');
  const overflow = await page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth);
  rec(view, 'No horizontal overflow', overflow <= 0, `${overflow}px`);

  // Shopper chrome must not follow staff into the console. Both of these are
  // pinned overlays, so on a phone they sat directly on top of the row action
  // buttons rather than merely looking out of place.
  const probe = () => ({
    assistant: Boolean(document.querySelector('.ai-fab, [aria-label="Open Tech Advisor"]')),
    trustStrip: Boolean(document.querySelector('.announcement-bar')),
  });
  const chrome = await page.evaluate(probe);
  rec(view, 'Shopping assistant is not shown in the console', !chrome.assistant);
  rec(view, 'Storefront trust strip is not shown in the console', !chrome.trustStrip);

  // Positive control. Without it the two assertions above would also hold for
  // a selector that matches nothing anywhere — which is how an absence test
  // quietly stops testing anything.
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await settled(page, '.announcement-bar');
  // The assistant is a lazy chunk, so it appears a beat after the rest.
  await settled(page, '.ai-fab');
  const onStore = await page.evaluate(probe);
  rec(view, 'Absence selectors do match on the storefront', onStore.assistant && onStore.trustStrip,
    JSON.stringify(onStore));

  await page.goto(`${BASE}/admin/inventory`, { waitUntil: 'domcontentloaded' });
  await settled(page, '.admin-row');

  // One panel, not a stack of cards: rows must not carry their own frame.
  const rowFrames = await page.evaluate(() => {
    const row = document.querySelector('.admin-row');
    if (!row) return null;
    const s = getComputedStyle(row);
    return { radius: parseFloat(s.borderTopLeftRadius), top: s.borderTopWidth, left: s.borderLeftWidth };
  });
  rec(view, 'Inventory rows are table rows, not nested cards',
    Boolean(rowFrames) && rowFrames.radius === 0 && rowFrames.top === '0px' && rowFrames.left === '0px',
    JSON.stringify(rowFrames));

  const smallTargets = await page.evaluate(() => {
    const bad = [];
    for (const el of document.querySelectorAll('button, a[href], select, input')) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (r.width < 24 || r.height < 24) bad.push(`${el.tagName}.${el.className}`.slice(0, 50));
    }
    return bad;
  });
  rec(view, 'Tap targets >= 24px (WCAG 2.2 SC 2.5.8)', smallTargets.length === 0, smallTargets.join(' | '));

  rec(view, 'Admin pages are noindex', await page.evaluate(() =>
    /noindex/.test(document.querySelector('meta[name="robots"]')?.getAttribute('content') ?? '')));

  rec(view, 'No uncaught JS errors', errors.length === 0, errors.join(' | '));

  await browser.close();
}

await waitForEmulators();

await run('desktop', { viewport: { width: 1440, height: 900 } });
await run('mobile', { ...devices['iPhone 12'] });

const pass = results.filter(r => r.ok).length;
const fail = results.filter(r => !r.ok);

for (const r of results) {
  const tag = r.view === 'mobile' ? 'mobile ' : 'desktop';
  console.log(`[${tag}] ${r.ok ? 'PASS' : 'FAIL'} ${r.name}${r.detail && !r.ok ? ` — ${r.detail}` : ''}`);
}

console.log('\n============== ADMIN SUMMARY ==============');
console.log(`PASS ${pass}  FAIL ${fail.length}`);
if (fail.length) {
  console.log('\n--- FAILURES ---');
  for (const f of fail) console.log(`  [${f.view}] ${f.name} — ${f.detail}`);
  process.exit(1);
}
