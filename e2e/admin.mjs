// Admin back-store end-to-end suite: desktop + mobile.
//
//   npm run build && npx vite preview --port 4173 &
//   npm run e2e:admin
//
// The real app runs in a real browser — real routing, real React, real forms.
// Supabase's HTTP calls are intercepted at the network layer and answered from
// an in-memory fixture, which is what makes it possible to sign in as an admin
// without a live project. It exercises the frontend end to end; it does not
// prove the RLS policies, which only the database can enforce. Those are
// covered by the migration and verified by signing in for real.
//
// Screenshots land in e2e/screenshots/admin. Exits non-zero on any FAIL.
import { chromium, devices } from 'playwright';
import { mkdirSync } from 'node:fs';
import { resolveChromium } from './chromium-path.mjs';

const BASE = process.env.E2E_BASE_URL || 'http://127.0.0.1:4173';
const EXE = resolveChromium();
const OUT = process.env.E2E_ADMIN_SHOTS || 'e2e/screenshots/admin';

mkdirSync(OUT, { recursive: true });

const results = [];
let shotN = 0;
const rec = (view, name, ok, detail = '') =>
  results.push({ view, name, ok, detail });

const ADMIN_ID = '11111111-1111-4111-8111-111111111111';

function seedProducts() {
  return [
    {
      id: 'apple-iphone-17', model: 'iPhone 17', brand: 'Apple', category: 'Phones',
      storage: '256GB', price: 759, original_price: 1099, grade: 'Good',
      battery_health: 90, warranty_months: 12, return_days: 30,
      image_url: '/assets/iphone-17-pro-max-orange.jpg', gallery_images: null,
      is_certified: true, stock: 4, specs: {}, description: null,
      condition_description: null, color_options: null, storage_options: null,
      created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
    },
    {
      id: 'samsung-galaxy-s23', model: 'Galaxy S23', brand: 'Samsung', category: 'Phones',
      storage: '128GB', price: 399, original_price: 849, grade: 'Excellent',
      battery_health: 94, warranty_months: 12, return_days: 30,
      image_url: '/assets/galaxy-s23.jpg', gallery_images: null,
      is_certified: true, stock: 0, specs: {}, description: null,
      condition_description: null, color_options: null, storage_options: null,
      created_at: '2026-01-02T00:00:00Z', updated_at: '2026-01-02T00:00:00Z',
    },
  ];
}

/**
 * Answer every Supabase REST/Auth/Storage request from memory.
 * State lives in `db` so writes are visible to subsequent reads, which is what
 * makes the create/edit/delete assertions meaningful rather than cosmetic.
 */
async function installSupabaseStub(ctx, { role = 'admin' } = {}) {
  const db = { products: seedProducts(), uploads: [], deletedPaths: [] };

  await ctx.route('**/*.supabase.co/**', async route => {
    const req = route.request();
    const url = new URL(req.url());
    const path = url.pathname;
    const method = req.method();
    const json = (body, status = 200) =>
      route.fulfill({
        status,
        contentType: 'application/json',
        headers: {
          'access-control-allow-origin': '*',
          // The stub is cross-origin, so content-range is invisible to JS
          // unless it is explicitly exposed. Without this supabase-js reads a
          // null count and the console renders "0 products" over a full list.
          // Real Supabase sends this header; the stub has to as well.
          'access-control-expose-headers': 'content-range, content-length',
          'content-range': `0-${Math.max(0, (Array.isArray(body) ? body.length : 1) - 1)}/${Array.isArray(body) ? body.length : 1}`,
        },
        body: JSON.stringify(body),
      });

    if (method === 'OPTIONS') {
      return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' } });
    }

    // ── Auth ──
    if (path.includes('/auth/v1/token')) {
      return json({
        access_token: 'stub-access', refresh_token: 'stub-refresh',
        token_type: 'bearer', expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        user: { id: ADMIN_ID, email: 'admin@lehart.co.uk', user_metadata: { full_name: 'Store Admin' }, aud: 'authenticated', role: 'authenticated' },
      });
    }
    if (path.includes('/auth/v1/user')) {
      return json({ id: ADMIN_ID, email: 'admin@lehart.co.uk', user_metadata: { full_name: 'Store Admin' } });
    }
    if (path.includes('/auth/v1/')) return json({});

    // ── Storage ──
    if (path.includes('/storage/v1/object/')) {
      if (method === 'POST' || method === 'PUT') {
        const key = path.split('/object/')[1].replace(/^upload\//, '');
        db.uploads.push(key);
        return json({ Key: key });
      }
      if (method === 'DELETE') {
        db.deletedPaths.push(path);
        return json({});
      }
      return json([]);
    }
    if (path.includes('/storage/v1/')) return json([]);

    // ── REST ──
    if (path.includes('/rest/v1/profiles')) {
      return json([{ id: ADMIN_ID, full_name: 'Store Admin', role }]);
    }

    if (path.includes('/rest/v1/products')) {
      if (method === 'GET') {
        let rows = [...db.products];
        const idParam = url.searchParams.get('id');
        if (idParam?.startsWith('eq.')) rows = rows.filter(r => r.id === idParam.slice(3));
        const stock = url.searchParams.get('stock');
        if (stock === 'eq.0') rows = rows.filter(r => r.stock === 0);
        if (stock === 'gt.0') rows = rows.filter(r => r.stock > 0);
        return json(rows);
      }
      if (method === 'POST') {
        const body = JSON.parse(req.postData() || '{}');
        const row = Array.isArray(body) ? body[0] : body;
        if (db.products.some(p => p.id === row.id)) {
          return json({ code: '23505', message: 'duplicate key value violates unique constraint' }, 409);
        }
        db.products.unshift({ ...seedProducts()[0], ...row });
        return json([{ ...seedProducts()[0], ...row }], 201);
      }
      if (method === 'PATCH') {
        const body = JSON.parse(req.postData() || '{}');
        const idParam = url.searchParams.get('id') ?? '';
        const id = idParam.replace(/^eq\./, '');
        const row = db.products.find(p => p.id === id);
        if (row) Object.assign(row, body);
        return json(row ? [row] : []);
      }
      if (method === 'DELETE') {
        const idParam = url.searchParams.get('id') ?? '';
        const id = idParam.replace(/^eq\./, '');
        db.products = db.products.filter(p => p.id !== id);
        return json([]);
      }
    }

    return json([]);
  });

  return db;
}

/**
 * Storage keys supabase-js might use for its session.
 *
 * The key is `sb-<project-ref>-auth-token`, where the ref comes from
 * VITE_SUPABASE_URL at build time. A build made without that variable falls
 * back to the placeholder URL in src/lib/supabase.ts, giving the ref
 * "unconfigured" — which is the usual case in CI. Write every candidate so the
 * suite works against a configured build and an unconfigured one alike.
 */
function sessionKeys() {
  const keys = new Set(['sb-unconfigured-auth-token']);
  const url = process.env.VITE_SUPABASE_URL;
  const ref = url && /https?:\/\/([^.]+)\./.exec(url)?.[1];
  if (ref) keys.add(`sb-${ref}-auth-token`);
  return [...keys];
}

/** Put a Supabase session in localStorage so the app boots signed in. */
async function signIn(page) {
  await page.addInitScript(([id, keys]) => {
    const session = {
      access_token: 'stub-access', refresh_token: 'stub-refresh',
      token_type: 'bearer', expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      user: { id, email: 'admin@lehart.co.uk', user_metadata: { full_name: 'Store Admin' }, aud: 'authenticated', role: 'authenticated' },
    };
    for (const key of keys) localStorage.setItem(key, JSON.stringify(session));
  }, [ADMIN_ID, sessionKeys()]);
}

async function shot(page, name) {
  shotN += 1;
  await page.screenshot({ path: `${OUT}/${String(shotN).padStart(2, '0')}-${name}.png`, fullPage: false });
}

async function dismissCookies(page) {
  const b = page.getByRole('button', { name: /accept all cookies/i });
  if (await b.count()) { await b.first().click().catch(() => {}); await page.waitForTimeout(300); }
}

async function run(view, contextOpts) {
  const browser = await chromium.launch({ ...(EXE ? { executablePath: EXE } : {}), args: ['--no-sandbox'] });
  const ctx = await browser.newContext(contextOpts);
  const errors = [];

  const db = await installSupabaseStub(ctx);
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(String(e.message).slice(0, 160)));
  await signIn(page);

  const txt = async () => (await page.locator('body').innerText()).replace(/\s+/g, ' ');

  // ── 1. Dashboard loads for an admin ──
  await page.goto(`${BASE}/admin/inventory`, { waitUntil: 'networkidle' });
  await dismissCookies(page);
  await page.waitForTimeout(700);
  let body = await txt();
  rec(view, 'Admin dashboard opens for an admin', /Back store/i.test(body) && /Inventory/i.test(body), body.slice(0, 90));
  rec(view, 'Seeded products are listed', /iPhone 17/.test(body) && /Galaxy S23/.test(body));
  rec(view, 'Product count matches the rows shown', /2 products/.test(body), body.slice(0, 120));
  rec(view, 'Storefront chrome (marketing footer) is hidden', !/Sign up to our newsletter/i.test(body));
  await shot(page, `${view}-dashboard`);

  // ── 2. Stock states are visually distinguished ──
  rec(view, 'Out-of-stock item shows 0 in stock', /0 in stock/.test(body));
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
    rec(view, 'Stock edit reached the database', db.products.find(p => p.id === 'apple-iphone-17')?.stock === 17);
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
  await page.goto(`${BASE}/admin/inventory/new`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
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

  const created = db.products.find(p => p.id === 'google-pixel-9-pro');
  rec(view, 'Product is created in the database', Boolean(created), created ? '' : 'not found in stub db');
  rec(view, 'Created product carries the right price', created?.price === 649 && created?.original_price === 1099);
  rec(view, 'Redirects to the inventory list after saving', /\/admin\/inventory$/.test(new URL(page.url()).pathname));
  rec(view, 'Success message is shown', /saved/i.test(await txt()));
  await shot(page, `${view}-created`);

  // ── 7. Edit an existing product ──
  await page.goto(`${BASE}/admin/inventory/apple-iphone-17`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  rec(view, 'Edit form loads the existing values', (await page.locator('#field-model').inputValue()) === 'iPhone 17');
  rec(view, 'Slug is locked when editing', await page.locator('#field-id').isEditable() === false);

  await page.locator('#field-price').fill('699');
  await page.getByRole('button', { name: /Save changes/i }).first().click();
  await page.waitForTimeout(1000);
  rec(view, 'Edit persists to the database', db.products.find(p => p.id === 'apple-iphone-17')?.price === 699);
  await shot(page, `${view}-edited`);

  // ── 8. Image manager ──
  await page.goto(`${BASE}/admin/inventory/apple-iphone-17`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  rec(view, 'Image manager renders', /Images/.test(await txt()));

  const uploadBtn = page.getByRole('button', { name: /Upload images/i }).first();
  rec(view, 'Upload control is available', await uploadBtn.count() > 0);

  // A 1x1 PNG is enough to prove the upload path end to end.
  const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  await page.locator('input[type="file"]').first().setInputFiles({
    name: 'pixel-front.png', mimeType: 'image/png', buffer: Buffer.from(pngBase64, 'base64'),
  });
  await page.waitForTimeout(1200);
  rec(view, 'Image upload reaches storage', db.uploads.length > 0, db.uploads.join(','));
  rec(view, 'Uploaded image is filed under the product id',
    db.uploads.some(k => k.includes('apple-iphone-17/')), db.uploads.join(','));
  await shot(page, `${view}-image-uploaded`);

  // ── 9. Delete requires confirmation ──
  await page.goto(`${BASE}/admin/inventory`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  const before = db.products.length;
  const delBtn = page.getByRole('button', { name: /Delete Samsung Galaxy S23/i }).first();
  if (await delBtn.count()) {
    await delBtn.click();
    await page.waitForTimeout(400);
    rec(view, 'Delete opens a confirmation dialog', /cannot be undone/i.test(await txt()));
    await shot(page, `${view}-delete-confirm`);

    await page.getByRole('button', { name: /Keep it/i }).first().click();
    await page.waitForTimeout(400);
    rec(view, 'Cancelling the dialog does not delete', db.products.length === before);

    await delBtn.click();
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: /Delete permanently/i }).first().click();
    await page.waitForTimeout(1200);
    rec(view, 'Confirmed delete removes the product',
      !db.products.some(p => p.id === 'samsung-galaxy-s23'), `${db.products.length} left`);
    await shot(page, `${view}-deleted`);
  } else {
    rec(view, 'Delete opens a confirmation dialog', false, 'delete button not found');
    rec(view, 'Cancelling the dialog does not delete', false, 'delete button not found');
    rec(view, 'Confirmed delete removes the product', false, 'delete button not found');
  }

  // ── 10. Non-admin is refused even with a valid session ──
  const ctx2 = await browser.newContext(contextOpts);
  await installSupabaseStub(ctx2, { role: 'customer' });
  const page2 = await ctx2.newPage();
  await signIn(page2);
  await page2.goto(`${BASE}/admin/inventory`, { waitUntil: 'networkidle' });
  await page2.waitForTimeout(900);
  const customerBody = (await page2.locator('body').innerText()).replace(/\s+/g, ' ');
  rec(view, 'Signed-in customer is refused', /Admin access only/i.test(customerBody), customerBody.slice(0, 90));
  rec(view, 'Customer sees no inventory data', !/Add product/i.test(customerBody));
  await page2.screenshot({ path: `${OUT}/${String(++shotN).padStart(2, '0')}-${view}-customer-refused.png` });
  await ctx2.close();

  // ── 11. Hygiene ──
  await page.goto(`${BASE}/admin/inventory`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  const overflow = await page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth);
  rec(view, 'No horizontal overflow', overflow <= 0, `${overflow}px`);

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
