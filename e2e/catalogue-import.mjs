// Catalogue import, end to end: sample cleanup -> Apple import -> price one
// configuration -> upload a colour photo -> list -> shop shows exactly that.
//
//   npm run emulators &
//   npx vite build --mode e2e && npx vite preview --port 4173 &
//   npm run e2e:catalogue
//
// Runs in a real browser against the Firebase emulator suite, signed in
// through the real auth form, so firestore.rules and storage.rules decide
// every write. Screenshots land in e2e/screenshots/catalogue.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { resolveChromium } from './chromium-path.mjs';
import {
  seed, seedExtraProducts, waitForEmulators, getProduct, countProducts, ADMIN_EMAIL, PASSWORD,
} from './emulator-seed.mjs';

const BASE = process.env.E2E_BASE_URL || 'http://127.0.0.1:4173';
const OUT = process.env.E2E_CATALOGUE_SHOTS || 'e2e/screenshots/catalogue';
mkdirSync(OUT, { recursive: true });

/** A small real PNG, so the in-browser compression path has pixels to work on. */
const PNG_1PX = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

const results = [];
const rec = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

async function signIn(page) {
  await page.goto(`${BASE}/account`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  const cookies = page.getByRole('button', { name: /accept all cookies/i });
  if (await cookies.count()) await cookies.first().click().catch(() => {});
  await page.getByRole('button', { name: /sign in|log in|account/i }).first().click();
  const email = page.getByPlaceholder(/email or username|email address/i).first();
  await email.waitFor({ state: 'visible', timeout: 15000 });
  await email.fill(ADMIN_EMAIL);
  await page.getByPlaceholder(/^password$/i).first().fill(PASSWORD);
  await page.locator('form').getByRole('button', { name: /^(sign in|log in)$/i }).first().click();
  await page.waitForTimeout(3500);
}

await waitForEmulators();
await seed();
// A product left by the old demo seed: a sample id with no `source`. It
// shares its id with a catalogue model, so the import must not skip past it
// unnoticed.
await seedExtraProducts([{
  id: 'apple-iphone-15-plus', model: 'iPhone 15 Plus', brand: 'Apple', category: 'Phones',
  price: 459, originalPrice: 899, grade: 'Good', batteryHealth: 90, warrantyMonths: 12, returnDays: 30,
  imageUrl: '', isCertified: true, stock: 0, createdAt: '2025-01-01T00:00:00Z',
}]);
const before = await countProducts();

const browser = await chromium.launch({ executablePath: resolveChromium() });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errors = [];
page.on('pageerror', err => errors.push(err.message));

try {
  await signIn(page);

  // ── 1. Sample cleanup ────────────────────────────────────────────────────
  await page.goto(`${BASE}/admin/catalogue-import`, { waitUntil: 'domcontentloaded' });
  await page.getByText('Remove the old sample products').waitFor({ timeout: 20000 });
  rec('import page lists the old sample product', await page.getByText('apple-iphone-15-plus', { exact: true }).count() === 1);
  rec('a clashing catalogue model is flagged, not silently skipped', await page.getByText('Old sample — remove first').count() === 1);
  await page.screenshot({ path: `${OUT}/1-import-page.png`, fullPage: false });

  // The standard emulator seed's Galaxy S23 also uses an old demo id, so
  // count rather than assume one.
  const deleteButton = page.getByRole('button', { name: /Delete \d+ sample products/ });
  const deleted = Number((await deleteButton.textContent()).match(/Delete (\d+)/)[1]);
  await deleteButton.click();
  await page.getByRole('group', { name: 'Confirm delete' }).getByRole('button', { name: 'Yes, delete' }).click();
  await page.getByText(/sample products deleted/).waitFor({ timeout: 20000 });
  rec('sample product deleted from the database', (await getProduct('apple-iphone-15-plus')) === null);

  // ── 2. Import ────────────────────────────────────────────────────────────
  const importButton = page.getByRole('button', { name: /Import \d+ models as drafts/ });
  await importButton.waitFor({ timeout: 20000 });
  const expected = Number((await importButton.textContent()).match(/Import (\d+)/)[1]);
  await importButton.click();
  await page.getByText(/models added as drafts/).waitFor({ timeout: 120000 });
  const after = await countProducts();
  rec('every new model was written', after === before - deleted + expected, `${before - deleted} + ${expected} -> ${after}`);
  // The page re-reads the database after the notice appears; wait for it.
  rec('re-running finds nothing new', await page.getByRole('button', { name: /Nothing new to import/ })
    .waitFor({ timeout: 15000 }).then(() => true, () => false));

  const imported = await getProduct('apple-iphone-17-pro-max');
  rec('imported model is a draft', imported?.listed === false);
  rec('imported model has no price', imported?.price === 0);

  // ── 3. Drafts stay off the shop ─────────────────────────────────────────
  await page.goto(`${BASE}/products?brand=Apple`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3500);
  rec('draft is not in the shop listing', !(await page.locator('body').innerText()).includes('iPhone 17 Pro Max'));
  await page.goto(`${BASE}/product/apple-iphone-17-pro-max`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3500);
  rec('draft product page is not for sale', await page.getByRole('button', { name: 'Add to cart' }).count() === 0);

  // ── 4. Price one configuration, upload a colour photo, list ─────────────
  await page.goto(`${BASE}/admin/inventory/apple-iphone-17-pro-max`, { waitUntil: 'domcontentloaded' });
  await page.getByText('Photos by colour').waitFor({ timeout: 20000 });
  rec('editor opens imported model as a draft', !(await page.locator('#field-listed').isChecked()));
  rec('editor shows every configuration', await page.getByLabel(/^Configuration \d+ storage$/).count() === 12);

  await page.getByLabel('Configuration 1 condition').selectOption({ index: 1 });
  await page.getByLabel('Configuration 1 battery health').fill('92');
  await page.getByLabel('Configuration 1 selling price').fill('899');
  await page.getByLabel('Configuration 1 was price').fill('1199');
  await page.getByLabel('Configuration 1 stock').fill('2');

  // Listing with no photo is allowed, with a warning that the shop will
  // show an illustration until one is uploaded.
  await page.locator('#field-listed').check();
  rec('listing without a photo warns', await page.getByText(/No photos yet/).count() === 1);

  // Configuration 1 is 256GB Cosmic Orange, the first colour block.
  await page.locator('input[type=file]').first().setInputFiles({ name: 'orange.png', mimeType: 'image/png', buffer: PNG_1PX });
  await page.waitForFunction(() => document.body.innerText.includes('1 photo'), null, { timeout: 30000 });
  rec('colour photo uploaded and attached to that finish', true);
  await page.screenshot({ path: `${OUT}/2-editor.png`, fullPage: true });

  await page.getByRole('button', { name: /Save changes/ }).click();
  await page.waitForURL(/\/admin\/inventory$/, { timeout: 20000 });
  const listed = await getProduct('apple-iphone-17-pro-max');
  rec('saved as listed', listed?.listed === true);
  rec('from-price is the priced configuration, not £0', listed?.price === 899, `price ${listed?.price}`);
  rec('card image comes from the colour photo', typeof listed?.imageUrl === 'string' && listed.imageUrl.length > 0);

  // ── 5. Shop shows exactly what was priced ────────────────────────────────
  await page.goto(`${BASE}/product/apple-iphone-17-pro-max`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Add to cart' }).first().waitFor({ timeout: 20000 });
  const body = await page.locator('body').innerText();
  rec('product page shows the price', body.includes('£899'));
  rec('only the stocked finish is offered', /1 finish\b/.test(body), body.match(/\d+ finish(es)?/)?.[0]);
  rec('unpriced capacities are not offered', !body.includes('2TB'));
  await page.screenshot({ path: `${OUT}/3-product-page.png`, fullPage: false });

  rec('no uncaught page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
} catch (err) {
  rec('suite ran to completion', false, err.message.split('\n')[0]);
  await page.screenshot({ path: `${OUT}/failure.png`, fullPage: true }).catch(() => {});
} finally {
  await browser.close();
}

const failed = results.filter(r => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} catalogue checks passed`);
process.exit(failed.length ? 1 : 0);
