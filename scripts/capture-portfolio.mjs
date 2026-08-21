#!/usr/bin/env node
/**
 * Capture the portfolio screenshot set by driving the real app in a browser.
 *
 *   node scripts/capture-portfolio.mjs storefront   # against a production build
 *   node scripts/capture-portfolio.mjs admin        # against an e2e build + emulators
 *
 * Two modes because the two halves of the app need different backing:
 *
 *  - The storefront falls back to the bundled catalogue when Firestore is
 *    unreachable, so a plain production build shows all 133 products with
 *    their real images — which is what the shots should show.
 *  - The admin console is behind a real auth check and a real admin claim, so
 *    it needs the emulator suite and a genuine sign-in. Nothing is faked or
 *    injected; the screenshot shows the console as an admin actually sees it.
 *
 * Output: docs/screenshots/. Existing files are overwritten.
 */
import { chromium } from 'playwright';
import { mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { resolveChromium } from '../e2e/chromium-path.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const MODE = process.argv[2] ?? 'storefront';
const BASE = process.env.CAPTURE_BASE_URL || 'http://127.0.0.1:4173';
const OUT = join(here, '..', 'docs', 'screenshots');
const EXE = resolveChromium();
const VIEWPORT = { width: 1440, height: 900 };

mkdirSync(OUT, { recursive: true });

const shot = async (page, name) => {
  await page.screenshot({ path: join(OUT, `${name}.png`) });
  console.log(`  ✓ ${name}.png`);
};

/** Dismiss the cookie banner — it is correct behaviour, but not the subject. */
async function dismissChrome(page) {
  const accept = page.getByRole('button', { name: /accept all cookies/i });
  if (await accept.count()) {
    await accept.first().click().catch(() => {});
    await page.waitForTimeout(400);
  }
  // The assistant bubble floats over the lower-right corner of every shot.
  await page.addStyleTag({ content: '.ai-fab { display: none !important; }' }).catch(() => {});
}

async function launch() {
  const browser = await chromium.launch({
    ...(EXE ? { executablePath: EXE } : {}),
    args: ['--no-sandbox'],
  });
  const page = await browser.newPage({ viewport: VIEWPORT, deviceScaleFactor: 2 });
  return { browser, page };
}

// ── Storefront ────────────────────────────────────────────────

async function captureStorefront() {
  const { browser, page } = await launch();

  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  await dismissChrome(page);
  await shot(page, '01-home');

  await page.goto(`${BASE}/products`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  await dismissChrome(page);
  // A filtered list is a truer picture of the page than an unfiltered one —
  // it shows the facets doing something.
  const apple = page.getByRole('checkbox', { name: /^Apple$/i }).first();
  if (await apple.count()) {
    await apple.check().catch(() => {});
    await page.waitForTimeout(1200);
  }
  await shot(page, '02-catalogue');

  // Open a product from the grid rather than by URL, so the shot is of a page
  // reached the way a customer reaches it.
  await page.goto(`${BASE}/products`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  await dismissChrome(page);
  // The cards navigate through an onClick handler rather than an anchor, so
  // there is no href to select on — click the card itself.
  await page.locator('[role="article"]').first().click();
  await page.waitForTimeout(2500);
  if (!/\/product\//.test(page.url())) {
    throw new Error(`Expected a product page, got ${page.url()}`);
  }
  await shot(page, '03-product-detail');

  // Add to basket, then photograph checkout with something actually in it —
  // an order summary reading £0.00 shows the page but not the product.
  await page.getByRole('button', { name: /^add to cart$/i }).first().click();
  await page.waitForTimeout(1600);
  const keepShopping = page.getByRole('button', { name: /continue shopping|close/i }).first();
  if (await keepShopping.count()) await keepShopping.click().catch(() => {});
  await page.waitForTimeout(600);

  await page.goto(`${BASE}/checkout`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  await dismissChrome(page);

  // Step past the guest gate so the shot shows the actual shipping form.
  const guestEmail = page.locator('input[name="guestEmail"]');
  if (await guestEmail.count()) {
    await guestEmail.fill('demo@example.com');
    await page.getByRole('button', { name: /continue as guest/i }).first().click();
    await page.waitForTimeout(2000);
  }

  const total = await page.locator('body').innerText();
  if (/Total\s*£0\.00/.test(total.replace(/\s+/g, ' '))) {
    throw new Error('Checkout basket is empty — the add-to-cart step did not take');
  }
  await shot(page, '04-checkout');

  await browser.close();
}

// ── Admin ─────────────────────────────────────────────────────

/**
 * src/data.ts is TypeScript, which node cannot import. The array is generated
 * data — object literals only — so it is extracted and evaluated rather than
 * adding a build step for a screenshot script. Same approach as
 * scripts/seed-firestore.mjs.
 */
function loadCatalogue(limit) {
  const src = readFileSync(join(here, '..', 'src', 'data.ts'), 'utf8');
  const marker = src.indexOf('export const MOCK_PHONES');
  if (marker === -1) throw new Error('MOCK_PHONES not found in src/data.ts');

  // Seek past the "=" first. The declaration is
  //   export const MOCK_PHONES: Product[] = [
  // so the first "[" after the name belongs to the *type annotation*, not the
  // array — taking it yields an empty literal and a silently empty catalogue.
  const open = src.indexOf('[', src.indexOf('=', marker));
  let depth = 0, end = -1;
  for (let i = open; i < src.length; i++) {
    if (src[i] === '[') depth++;
    else if (src[i] === ']' && --depth === 0) { end = i; break; }
  }
  // eslint-disable-next-line no-new-func
  const all = new Function(`return ${src.slice(open, end + 1)};`)();

  // Project to the scalar shape the emulator seeder handles, and vary the
  // stock so the console shows its in-stock, low and out-of-stock states.
  return all.filter(p => p?.id).slice(0, limit).map((p, i) => ({
    id: p.id,
    model: p.model, brand: p.brand, category: p.category ?? 'Phones',
    storage: p.storage ?? null,
    price: p.price, originalPrice: p.originalPrice ?? p.price,
    grade: p.grade ?? 'Good', batteryHealth: p.batteryHealth ?? 90,
    warrantyMonths: p.warrantyMonths ?? 12, returnDays: p.returnDays ?? 30,
    imageUrl: p.imageUrl ?? null,
    isCertified: Boolean(p.isCertified),
    stock: i % 9 === 0 ? 0 : i % 5 === 0 ? 3 : 6 + (i % 14),
    createdAt: new Date(Date.UTC(2026, 0, 1 + (i % 27))).toISOString(),
  }));
}

const DEMO_ORDERS = [
  { id: 'ord-1041', total: 592.8, status: 'shipped',   createdAt: '2026-08-19T10:12:00Z', itemCount: 1, shippingAddress: { fullName: 'Alex Morgan' }, items: [{ id: 'a' }] },
  { id: 'ord-1040', total: 269.0, status: 'confirmed', createdAt: '2026-08-18T16:44:00Z', itemCount: 1, shippingAddress: { fullName: 'Priya Shah' }, items: [{ id: 'b' }] },
  { id: 'ord-1039', total: 928.0, status: 'delivered', createdAt: '2026-08-17T09:03:00Z', itemCount: 2, shippingAddress: { fullName: 'Tom Whitfield' }, items: [{ id: 'c' }, { id: 'd' }] },
];

async function captureAdmin() {
  const { seed, seedExtraProducts, seedOrders, waitForEmulators, PASSWORD } =
    await import('../e2e/emulator-seed.mjs');

  await waitForEmulators();
  await seed();
  await seedExtraProducts(loadCatalogue(26));
  await seedOrders(DEMO_ORDERS);

  const { browser, page } = await launch();

  // Sign in through the real form — no session injection. The admin claim set
  // during seeding is what the security rules and the route gate both read.
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  await dismissChrome(page);

  const more = page.locator('[aria-label="More options"], [aria-label="Open menu"]').first();
  if (await more.count()) { await more.click(); await page.waitForTimeout(800); }
  await page.getByRole('button', { name: /sign in|log in|account/i }).first().click();
  await page.waitForTimeout(1200);

  await page.getByPlaceholder(/email or username|email address/i).first().fill('admin');
  await page.getByPlaceholder(/^password$/i).first().fill(PASSWORD);
  await page.locator('form').getByRole('button', { name: /^(sign in|log in)$/i }).first().click();
  await page.waitForTimeout(3500);

  await page.goto(`${BASE}/admin`, { waitUntil: 'domcontentloaded' });
  await page.locator('.ops-bar-row').first().waitFor({ state: 'visible', timeout: 20000 });
  await page.waitForTimeout(600);
  await dismissChrome(page);
  await shot(page, '05-admin-dashboard');

  await page.goto(`${BASE}/admin/inventory`, { waitUntil: 'domcontentloaded' });
  await page.locator('.admin-row').first().waitFor({ state: 'visible', timeout: 20000 });
  await page.waitForTimeout(600);
  await dismissChrome(page);
  await shot(page, '06-admin-inventory');

  await browser.close();
}

console.log(`\nCapturing (${MODE}) from ${BASE}\n`);
if (MODE === 'admin') await captureAdmin();
else await captureStorefront();
console.log(`\n  Done → docs/screenshots/\n`);
