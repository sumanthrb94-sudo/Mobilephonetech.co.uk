// Splitting a multi-colour listing into one listing per colour, end to end.
//
//   node e2e/colour-split.mjs   (needs the emulator suite, api-server and
//                                preview all running — see docs/ADMIN.md)
//
// WHY THIS EXISTS
//
// A shopper looked at a real listing whose Colour options named two colours
// and asked why the colours were not clickable. They were not clickable on
// purpose: that listing is one document, one price, one stock count, and a
// customer clicking "Silver" on it would not get a silver handset, because
// both colours are the same row. The fix already built for storage — one
// listing per size, each with its own stock, offered as siblings — applies
// to colour the same way, and this script proves the whole path: a manager
// splits a real multi-colour listing, the database ends up holding what the
// screen said it would, and the resulting listings render as real, clickable
// swatches on the storefront, not as the plain-text "depends on
// availability" note the ambiguous listing used to show.
import { chromium } from 'playwright';
import { resolveChromium } from './chromium-path.mjs';
import {
  seed, waitForEmulators, seedCatalogue, seedExtraProducts, catalogueIdFor,
  listCollection, getProduct, ADMIN_EMAIL, PASSWORD,
} from './emulator-seed.mjs';

const BASE = process.env.E2E_BASE || 'http://127.0.0.1:4173';

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

async function signInAsAdmin(page) {
  await page.goto(`${BASE}/account`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  await dismissCookies(page);
  await page.getByRole('button', { name: /sign in|log in|account/i }).first().click();
  await page.waitForTimeout(1200);
  const email = page.getByPlaceholder(/email or username|email address/i).first();
  await email.waitFor({ state: 'visible', timeout: 15000 });
  await email.fill(ADMIN_EMAIL);
  await page.getByPlaceholder(/^password$/i).first().fill(PASSWORD);
  await page.locator('form').getByRole('button', { name: /^(sign in|log in)$/i }).first().click();
  await page.waitForTimeout(3500);
}

await waitForEmulators();
await seed();

// A model the catalogue carries, and one real listing on it that names two
// colours in its own Colour options field — exactly the shape of the
// listing that prompted this, storage and all.
const BRAND = 'Apple';
const MODEL = 'iPhone 8';
const ORIGINAL_ID = 'apple-iphone-8-multicolour';
const CATALOGUE_ID = catalogueIdFor(BRAND, MODEL);

await seedCatalogue([{ brand: BRAND, model: MODEL }]);
await seedExtraProducts([{
  id: ORIGINAL_ID,
  brand: BRAND,
  model: MODEL,
  catalogueModelId: CATALOGUE_ID,
  storage: '128GB',
  price: 270,
  originalPrice: 399,
  stock: 3,
  grade: 'Pristine',
  category: 'Phones',
  colorOptions: ['Blue', 'Silver'],
  batteryHealth: 100,
  warrantyMonths: 12,
  returnDays: 30,
  isCertified: true,
  imageUrl: '/assets/x.jpg',
}]);

const browser = await chromium.launch({ executablePath: resolveChromium() });

try {
  // ── Before: the storefront shows the honest text, not fake buttons ──
  {
    const page = await browser.newPage();
    await page.goto(`${BASE}/product/${ORIGINAL_ID}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);
    const body = (await page.textContent('body')) ?? '';
    rec('Before splitting, colour reads as text, not buttons',
      /Blue, Silver/.test(body) && /depends on availability/i.test(body));
    await page.close();
  }

  // ── The split, as a manager ──
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));

  await signInAsAdmin(page);
  await page.goto(`${BASE}/admin/inventory/${ORIGINAL_ID}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  await page.getByRole('button', { name: /split into one listing per colour/i }).click();
  await page.waitForTimeout(400);
  await page.getByLabel(/Blue — stock/i).fill('2');
  await page.getByLabel(/Silver — stock/i).fill('1');
  await page.screenshot({ path: 'e2e-screenshots/admin-roles/colour-split-form.png', fullPage: true });

  await page.getByRole('button', { name: /^split into 2 listings$/i }).click();
  await page.waitForTimeout(2500);

  rec('The manager lands back on Inventory once the split has gone through',
    /Inventory/i.test(await page.textContent('h1').catch(() => '')));
  await page.screenshot({ path: 'e2e-screenshots/admin-roles/colour-split-done.png', fullPage: true });

  // ── The database, not just the screen ──
  const products = await listCollection('products');
  const blueId = `${BRAND.toLowerCase()}-${MODEL.toLowerCase().replace(/\s+/g, '-')}-128gb-blue`;
  const silverId = `${BRAND.toLowerCase()}-${MODEL.toLowerCase().replace(/\s+/g, '-')}-128gb-silver`;

  const blue = products.find(p => p.id === blueId);
  const silver = products.find(p => p.id === silverId);
  rec('A real Blue listing exists with the count entered, not a guessed one',
    blue && Number(blue.stock) === 2 && blue.catalogueModelId === CATALOGUE_ID,
    blue ? `stock=${blue.stock} catalogueModelId=${blue.catalogueModelId}` : 'no Blue listing found');
  rec('A real Silver listing exists with the count entered',
    silver && Number(silver.stock) === 1, silver ? `stock=${silver.stock}` : 'no Silver listing found');
  rec('Neither new listing kept the ambiguous colour list',
    JSON.stringify(blue?.colorOptions) !== JSON.stringify(['Blue', 'Silver'])
    && JSON.stringify(silver?.colorOptions) !== JSON.stringify(['Blue', 'Silver']));

  const original = await getProduct(ORIGINAL_ID);
  rec('The original is archived, not deleted, and its stock is zeroed',
    !!original && !!original.archivedAt && Number(original.stock) === 0,
    original ? `archivedAt=${original.archivedAt} stock=${original.stock}` : 'original was removed');

  rec('No uncaught errors during the split', errors.length === 0, errors.slice(0, 2).join(' | '));
  await ctx.close();

  // ── After: the storefront offers real, clickable colour swatches ──
  {
    const shopperPage = await browser.newPage();
    await shopperPage.goto(`${BASE}/product/${blueId}`, { waitUntil: 'domcontentloaded' });
    await shopperPage.waitForTimeout(2500);

    const swatch = shopperPage.getByRole('button', { name: /Silver, £270/ });
    rec('The other colour is now offered as a real, priced button',
      (await swatch.count()) > 0);
    await shopperPage.screenshot({ path: 'e2e-screenshots/admin-roles/colour-split-storefront.png', fullPage: true });

    if (await swatch.count()) {
      await swatch.click();
      await shopperPage.waitForTimeout(1500);
      rec('Clicking the other colour\'s swatch takes the shopper to that real listing',
        shopperPage.url().includes(silverId), shopperPage.url());
    } else {
      rec('Clicking the other colour\'s swatch takes the shopper to that real listing', false, 'no swatch to click');
    }
    await shopperPage.close();
  }
} finally {
  await browser.close();
}

const passed = results.filter(r => r.ok).length;
console.log(`\n${passed}/${results.length} checks passed`);
process.exit(passed === results.length ? 0 : 1);
