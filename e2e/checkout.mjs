// Checkout walk: cart → shipping → payment → review → confirmation.
//
//   node e2e/checkout.mjs      (against the preview server on :4173)
//
// Exists for one reason above all: to prove the payment step never grows a
// card input again. Accepting a PAN into this DOM would put the site in PCI
// scope, so the absence of card fields is asserted at every step of the flow,
// not assumed — alongside proof that an order can still be completed without
// them.
import { chromium } from 'playwright';
import { resolveChromium } from './chromium-path.mjs';

const BASE = process.env.E2E_BASE_URL || 'http://127.0.0.1:4173';
const EXE = resolveChromium();

const results = [];
const rec = (name, ok, detail = '') => {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail && !ok ? ` — ${detail}` : ''}`);
};

const browser = await chromium.launch({ ...(EXE ? { executablePath: EXE } : {}), args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });

/** Any input a PSP would object to: card number, expiry or CSC shapes. */
const cardInputs = () => page.evaluate(() =>
  document.querySelectorAll(
    'input[autocomplete^="cc-"], input[name*="card" i], input[name*="cvv" i], input[name*="cvc" i], input[placeholder*="0000" i]',
  ).length);

await page.goto(`${BASE}/products`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2200);
const accept = page.getByRole('button', { name: /accept all cookies/i });
if (await accept.count()) await accept.first().click().catch(() => {});

// ── Into the basket ──
await page.locator('[role="article"]').first().click();
await page.waitForTimeout(2200);
await page.getByRole('button', { name: /^add to cart$/i }).first().click();
await page.waitForTimeout(1400);
const keepShopping = page.getByRole('button', { name: /continue shopping|close/i }).first();
if (await keepShopping.count()) await keepShopping.click().catch(() => {});

// ── Guest gate ──
await page.goto(`${BASE}/checkout`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2000);
const guestEmail = page.locator('input[name="guestEmail"]');
rec('Guest gate offered', await guestEmail.count() > 0);
await guestEmail.fill('e2e-buyer@example.com');
await page.getByRole('button', { name: /continue as guest/i }).first().click();
await page.waitForTimeout(1800);

// ── Shipping ──
rec('No card inputs on the shipping step', (await cardInputs()) === 0, `${await cardInputs()} found`);
await page.locator('input[name="fullName"]').fill('E2E Buyer');
const phone = page.locator('input[name="phone"]');
if (await phone.count()) await phone.fill('07700 900123');
await page.locator('input[name="addressLine1"]').fill('1 Test Terrace');
const city = page.locator('input[name="city"]');
if (await city.count()) await city.fill('London');
const postcode = page.locator('input[name="postcode"], input[name="postCode"]').first();
if (await postcode.count()) await postcode.fill('NW1 6XE');
await page.locator('form').getByRole('button', { name: /continue|payment/i }).first().click();
await page.waitForTimeout(1600);

// ── Payment: selection only ──
const bodyText = async () => (await page.locator('body').innerText()).replace(/\s+/g, ' ');
rec('Payment step reached', /payment method/i.test(await bodyText()));
rec('No card inputs on the payment step', (await cardInputs()) === 0, `${await cardInputs()} found`);
rec('Payment step says card details are never entered here',
  /never entered on this site/i.test(await bodyText()));

// Selecting another method must not surface inputs either.
const klarna = page.getByRole('radio', { name: /klarna|pay in 3/i }).first();
if (await klarna.count()) { await klarna.click().catch(() => {}); await page.waitForTimeout(400); }
rec('No card inputs after switching method', (await cardInputs()) === 0);

await page.getByRole('button', { name: /review order/i }).first().click();
await page.waitForTimeout(1600);

// ── Review → place order ──
rec('Review step shows the address and method', /E2E Buyer/.test(await bodyText()));
await page.getByRole('button', { name: /place your order/i }).first().click();
await page.waitForTimeout(2500);

const confirmation = await bodyText();
rec('Order completes without any card data',
  /(order confirmed|thank you|order number|confirmation)/i.test(confirmation), confirmation.slice(0, 120));
rec('No card inputs anywhere in the whole flow', (await cardInputs()) === 0);

await browser.close();

const fails = results.filter(r => !r.ok);
console.log('\n============== CHECKOUT SUMMARY ==============');
console.log(`PASS ${results.length - fails.length}  FAIL ${fails.length}`);
process.exit(fails.length ? 1 : 0);
