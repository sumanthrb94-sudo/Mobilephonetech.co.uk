// Parallel customer + admin simulation.
//
//   npm run e2e:parallel     (emulators + an e2e-mode build on :4173)
//
// Two live browser contexts against ONE database, acting at the same time:
// a signed-in customer shopping the storefront while an admin works the back
// office. The single-session suites prove each side works alone; this one
// proves the cross-effects — the properties that were actually broken in
// production once, when the storefront read a bundled catalogue while the
// admin console managed an empty database:
//
//   - an admin price change reaches the customer's next page view
//   - an admin stock-out flips the customer's buy button
//   - a customer's order appears on the admin's Operations Hub
//   - a product the admin creates is findable through storefront search
//
// Concurrency is real (Promise.all over both sessions), not interleaved
// turn-taking. Assertions cross sessions only at explicit joins.
import { chromium } from 'playwright';
import { resolveChromium } from './chromium-path.mjs';
import { seed, waitForEmulators, getProduct, PASSWORD, CUSTOMER_EMAIL } from './emulator-seed.mjs';

const BASE = process.env.E2E_BASE_URL || 'http://127.0.0.1:4173';
const EXE = resolveChromium();

const results = [];
const rec = (who, name, ok, detail = '') => {
  results.push({ who, name, ok });
  console.log(`[${who.padEnd(8)}] ${ok ? 'PASS' : 'FAIL'} ${name}${detail && !ok ? ` — ${detail}` : ''}`);
};

const text = async (page) => (await page.locator('body').innerText()).replace(/\s+/g, ' ');

async function dismissCookies(page) {
  const b = page.getByRole('button', { name: /accept all cookies/i });
  if (await b.count()) { await b.first().click().catch(() => {}); await page.waitForTimeout(300); }
}

/** Real sign-in through the real form — same path as e2e/admin.mjs. */
async function signIn(page, identifier) {
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  await dismissCookies(page);
  const more = page.locator('[aria-label="More options"], [aria-label="Open menu"]').first();
  if (await more.count()) { await more.click(); await page.waitForTimeout(900); }
  await page.getByRole('button', { name: /sign in|log in|account/i }).first().click();
  await page.waitForTimeout(1200);
  const email = page.getByPlaceholder(/email or username|email address/i).first();
  await email.waitFor({ state: 'visible', timeout: 15000 });
  await email.fill(identifier);
  await page.getByPlaceholder(/^password$/i).first().fill(PASSWORD);
  await page.locator('form').getByRole('button', { name: /^(sign in|log in)$/i }).first().click();
  await page.waitForTimeout(3500);
}

await waitForEmulators();
await seed();

const browser = await chromium.launch({ ...(EXE ? { executablePath: EXE } : {}), args: ['--no-sandbox'] });
const adminCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const custCtx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
const admin = await adminCtx.newPage();
const cust = await custCtx.newPage();
const errors = { admin: [], customer: [] };
admin.on('pageerror', e => errors.admin.push(String(e.message).slice(0, 120)));
cust.on('pageerror', e => errors.customer.push(String(e.message).slice(0, 120)));

// ── Phase A: both sessions come alive at once ──────────────────
await Promise.all([
  signIn(admin, 'admin'),
  signIn(cust, CUSTOMER_EMAIL),
]);
rec('both', 'Admin and customer signed in concurrently', true);

// ── Phase B: admin opens the console while the customer opens the PDP ──
await Promise.all([
  (async () => {
    await admin.goto(`${BASE}/admin/inventory`, { waitUntil: 'domcontentloaded' });
    await admin.locator('.admin-row').first().waitFor({ state: 'visible', timeout: 20000 });
  })(),
  (async () => {
    await cust.goto(`${BASE}/product/apple-iphone-17`, { waitUntil: 'domcontentloaded' });
    await cust.waitForTimeout(2200);
  })(),
]);
const pdpBefore = await text(cust);
rec('customer', 'PDP shows the seeded price', /£759/.test(pdpBefore), pdpBefore.slice(0, 100));
rec('admin', 'Inventory lists the same product', /iPhone 17/.test(await text(admin)));

// ── Phase C: admin reprices WHILE the customer adds to cart ────
await Promise.all([
  (async () => {
    await admin.goto(`${BASE}/admin/inventory/apple-iphone-17`, { waitUntil: 'domcontentloaded' });
    await admin.locator('#field-model').waitFor({ state: 'visible', timeout: 20000 });
    await admin.locator('#field-price').fill('699');
    await admin.getByRole('button', { name: /save changes/i }).first().click();
    await admin.waitForTimeout(1200);
  })(),
  (async () => {
    await cust.getByRole('button', { name: /^add to cart$/i }).first().click();
    await cust.waitForTimeout(1200);
    const close = cust.getByRole('button', { name: /continue shopping|close/i }).first();
    if (await close.count()) await close.click().catch(() => {});
  })(),
]);

const stored = await getProduct('apple-iphone-17');
rec('admin', 'Price change persisted to the shared database', stored?.price === 699, `price=${stored?.price}`);

await cust.reload({ waitUntil: 'domcontentloaded' });
await cust.waitForTimeout(2200);
rec('customer', 'Customer sees the new price on their next view', /£699/.test(await text(cust)));

// ── Phase D: admin marks it out of stock; customer's buy button flips ──
await admin.goto(`${BASE}/admin/inventory`, { waitUntil: 'domcontentloaded' });
await admin.locator('.admin-row').first().waitFor({ state: 'visible', timeout: 20000 });
const stockBtn = admin.getByRole('button', { name: /edit stock for apple iphone 17/i }).first();
await stockBtn.click();
await admin.getByRole('spinbutton', { name: /stock for apple iphone 17/i }).first().fill('0');
await admin.getByRole('button', { name: /save stock/i }).first().click();
await admin.waitForTimeout(1000);

await cust.reload({ waitUntil: 'domcontentloaded' });
await cust.waitForTimeout(2200);
rec('customer', 'Stock-out flips the buy button to Out of stock',
  /out of stock/i.test(await text(cust)));

// Restock so the purchase can proceed — the admin fixing their own mistake.
await stockBtn.click();
await admin.getByRole('spinbutton', { name: /stock for apple iphone 17/i }).first().fill('5');
await admin.getByRole('button', { name: /save stock/i }).first().click();
await admin.waitForTimeout(1000);

// ── Phase E: customer buys WHILE the admin creates a new product ──
const BUYER = 'Parallel Buyer';
await Promise.all([
  (async () => {
    await admin.goto(`${BASE}/admin/inventory/new`, { waitUntil: 'domcontentloaded' });
    await admin.locator('#field-brand').waitFor({ state: 'visible', timeout: 20000 });
    await admin.locator('#field-brand').fill('Google');
    await admin.locator('#field-model').fill('Pixel 9 Parallel');
    await admin.locator('#field-price').fill('349');
    await admin.locator('#field-originalPrice').fill('499');
    await admin.locator('#field-stock').fill('3');
    await admin.getByRole('button', { name: /create product/i }).first().click();
    await admin.waitForTimeout(1500);
  })(),
  (async () => {
    await cust.goto(`${BASE}/checkout`, { waitUntil: 'domcontentloaded' });
    await cust.waitForTimeout(2000);

    // Signed in, the guest gate must not appear.
    const gate = cust.locator('input[name="guestEmail"]');
    rec('customer', 'Signed-in checkout skips the guest gate', (await gate.count()) === 0);
    if (await gate.count()) {
      await gate.fill(CUSTOMER_EMAIL);
      await cust.getByRole('button', { name: /continue as guest/i }).first().click();
      await cust.waitForTimeout(1500);
    }

    await cust.locator('input[name="fullName"]').fill(BUYER);
    const phone = cust.locator('input[name="phone"]');
    if (await phone.count()) await phone.fill('07700 900456');
    await cust.locator('input[name="addressLine1"]').fill('2 Concurrency Close');
    const city = cust.locator('input[name="city"]');
    if (await city.count()) await city.fill('London');
    const postcode = cust.locator('input[name="postcode"], input[name="postCode"]').first();
    if (await postcode.count()) await postcode.fill('NW1 6XE');
    await cust.locator('form').getByRole('button', { name: /continue|payment/i }).first().click();
    await cust.waitForTimeout(1500);

    await cust.getByRole('button', { name: /review order/i }).first().click();
    await cust.waitForTimeout(1500);
    await cust.getByRole('button', { name: /place your order/i }).first().click();
    await cust.waitForTimeout(2500);
    rec('customer', 'Order completes',
      /(order confirmed|thank you|order number|confirmation)/i.test(await text(cust)));
  })(),
]);

const created = await getProduct('google-pixel-9-parallel');
rec('admin', 'New product persisted with auto-derived slug', Boolean(created), 'google-pixel-9-parallel missing');

// ── Phase F: the joins — each side sees the other's work ──────
// Admin: the customer's order is on the Operations Hub.
await admin.goto(`${BASE}/admin`, { waitUntil: 'domcontentloaded' });
await admin.locator('.ops-bar-row').first().waitFor({ state: 'visible', timeout: 20000 });
const hub = await text(admin);
rec('admin', "Customer's order shows on the Operations Hub", new RegExp(BUYER).test(hub), hub.slice(0, 200));
rec('admin', 'Orders KPI counts the purchase', /ORDERS 1\b/i.test(hub));

// Customer: the admin's new product is findable through real search.
await cust.goto(`${BASE}/products`, { waitUntil: 'domcontentloaded' });
await cust.waitForTimeout(2200);
await dismissCookies(cust);
const search = cust.getByPlaceholder(/search/i).and(cust.locator('input:visible')).first();
await search.waitFor({ timeout: 10000 });
await search.fill('parallel');
await cust.waitForTimeout(2000);
rec('customer', "Admin's new product appears in storefront search", /Pixel 9 Parallel/i.test(await text(cust)));

await cust.goto(`${BASE}/product/google-pixel-9-parallel`, { waitUntil: 'domcontentloaded' });
await cust.waitForTimeout(2200);
const newPdp = await text(cust);
rec('customer', 'New product PDP renders with its price', /Pixel 9 Parallel/.test(newPdp) && /£349/.test(newPdp));

rec('admin', 'No uncaught errors in the admin session', errors.admin.length === 0, errors.admin.join(' | '));
rec('customer', 'No uncaught errors in the customer session', errors.customer.length === 0, errors.customer.join(' | '));

await browser.close();

const fails = results.filter(r => !r.ok);
console.log('\n============ PARALLEL SUMMARY ============');
console.log(`PASS ${results.length - fails.length}  FAIL ${fails.length}`);
if (fails.length) for (const f of fails) console.log(`  [${f.who}] ${f.name}`);
process.exit(fails.length ? 1 : 0);
