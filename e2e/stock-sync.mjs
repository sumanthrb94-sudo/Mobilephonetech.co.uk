// Stock sync, end to end: upload an inventory report -> preview -> apply ->
// the shop sells exactly those units and shows everything else as out of stock.
//
//   npm run emulators &
//   npx vite build --mode e2e && npx vite preview --port 4173 &
//   node e2e/stock-sync.mjs
//
// Uses a small generated report. To rehearse with a real export and catalogue
// (never committed: the report holds IMEIs and costs), point
// STOCK_SYNC_REPORT at the .xlsx and STOCK_SYNC_PRODUCTS at a JSON array of
// product documents.
import { chromium } from 'playwright';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as XLSX from 'xlsx';
import { resolveChromium } from './chromium-path.mjs';
import { seed, seedExtraProducts, waitForEmulators, getProduct, ADMIN_EMAIL, PASSWORD, SEED_PRODUCTS } from './emulator-seed.mjs';

const BASE = process.env.E2E_BASE_URL || 'http://127.0.0.1:4173';
const OUT = process.env.E2E_STOCK_SYNC_SHOTS || 'e2e/screenshots/stock-sync';
mkdirSync(OUT, { recursive: true });

const results = [];
const rec = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

function syntheticReport() {
  const office = [
    { Model: 'Galaxy S23', IMEI: '350000000000001', Storage: '128GB', Colour: 'Black', BP: 200, 'Stock Type': 'OFFICE' },
    { Model: 'SAMSUNG GALAXY S23', IMEI: '350000000000002', Storage: '128GB', Colour: 'Black', BP: 210, 'Stock Type': 'OFFICE' },
    { Model: 'Galaxy A32', IMEI: '350000000000003', Storage: '64GB', Colour: 'White', BP: 63, 'Stock Type': 'OFFICE' },
  ];
  const shs = [{ Model: 'Pixel 6A', IMEI: '', Storage: '128GB', Colour: 'Black', BP: 95, 'Stock Type': 'SHS' }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(office), 'Office Stock');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(shs), 'SHS Stock');
  const path = join(tmpdir(), 'inventory-report-all-time-e2e.xlsx');
  writeFileSync(path, XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
  return path;
}

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
await seed(); // apple-iphone-17 (4 in stock), samsung-galaxy-s23 (0)
const real = Boolean(process.env.STOCK_SYNC_REPORT);
if (process.env.STOCK_SYNC_PRODUCTS) {
  const products = JSON.parse(readFileSync(process.env.STOCK_SYNC_PRODUCTS, 'utf8'));
  const seeded = new Set(SEED_PRODUCTS.map(p => p.id));
  await seedExtraProducts(products.filter(p => !seeded.has(p.id)).map(({ createdAt, updatedAt, searchTerms, ...p }) => p));
}
const report = process.env.STOCK_SYNC_REPORT || syntheticReport();

const browser = await chromium.launch({ executablePath: resolveChromium() });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errors = [];
page.on('pageerror', err => errors.push(err.message));

try {
  await signIn(page);
  await page.goto(`${BASE}/admin/stock-sync`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: 'Stock sync' }).waitFor({ timeout: 20000 });
  await page.locator('input[type=file]').setInputFiles(report);
  await page.getByRole('button', { name: 'Apply to the shop' }).waitFor({ timeout: 30000 });
  const stat = async label => Number(await page.getByText(label, { exact: true }).locator('xpath=..').locator('div').first().textContent());
  const unitsOnSale = await stat('Units on sale');
  rec('preview counts the office units only', real ? unitsOnSale > 0 : unitsOnSale === 3, `${unitsOnSale}`);
  await page.screenshot({ path: `${OUT}/1-preview.png`, fullPage: false });

  const before = await getProduct('apple-iphone-17');
  rec('nothing is written by the preview', before.stock === 4);

  await page.getByRole('button', { name: 'Apply to the shop' }).click();
  await page.getByRole('status').filter({ hasText: 'Done.' }).waitFor({ timeout: 120000 });
  await page.screenshot({ path: `${OUT}/2-applied.png`, fullPage: false });

  if (!real) {
    const s23 = await getProduct('samsung-galaxy-s23-128gb') ?? await getProduct('samsung-galaxy-s23');
    rec('existing listing gets the report units at cost + 20%, as Pristine',
      s23?.stock === 2 && s23?.price === 252 && s23?.grade === 'Pristine' && s23?.variants?.[0]?.condition === 'Pristine',
      JSON.stringify({ id: s23 && 'found', stock: s23?.stock, price: s23?.price }));
    rec('no buying price on the public document', s23?.buyPrice == null && !JSON.stringify(s23?.variants).includes('buyPrice'));
    const a32 = await getProduct('samsung-galaxy-a32-64gb');
    rec('a model the shop lacked becomes a listed product', a32?.listed === true && a32?.stock === 1 && a32?.price === 76);
    const iphone = await getProduct('apple-iphone-17');
    rec('a listing not in the report goes to 0 and stays listed', iphone.stock === 0 && iphone.listed !== false);
  }

  // The shop: out-of-stock listings are still there, and can be filtered out.
  await page.goto(`${BASE}/products`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  const allCards = await page.getByText(/iPhone 17/).count();
  rec('out-of-stock listing is still visible in the shop', allCards > 0);
  await page.getByRole('checkbox', { name: 'In stock only' }).first().check().catch(async () => {
    await page.getByText('In stock only', { exact: true }).first().click();
  });
  await page.waitForTimeout(800);
  const filtered = await page.getByText(/iPhone 17/).count();
  rec('"In stock only" hides it', filtered === 0, `${allCards} -> ${filtered}`);
  await page.screenshot({ path: `${OUT}/3-shop-in-stock-only.png`, fullPage: false });

  rec('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
} catch (err) {
  rec('stock sync journey completed', false, err.message);
  await page.screenshot({ path: `${OUT}/error.png` }).catch(() => {});
} finally {
  await browser.close();
}

const failed = results.filter(r => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
