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
  ADMIN_EMAIL, CUSTOMER_EMAIL, PASSWORD, seedOrders,
} from './emulator-seed.mjs';

const BASE = process.env.E2E_BASE_URL || 'http://127.0.0.1:4173';
const EXE = resolveChromium();
const OUT = process.env.E2E_ADMIN_SHOTS || 'e2e/screenshots/admin';

mkdirSync(OUT, { recursive: true });

/** Smallest valid PNG: enough to exercise the upload, nothing to store. */
const PNG_1PX = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

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
  //
  // /account itself is the sign-in entry point on every width: its
  // signed-out gate screen offers the same "Sign in or create an account"
  // control regardless of viewport. This used to open the auth modal
  // through the desktop "More" menu's account row instead — which stopped
  // working the day that row was made desktop-only (mobile's one entry
  // point is the bottom tab bar's Account link, not the More menu), and
  // every mobile run here failed at this exact click from then on.
  await page.goto(`${BASE}/account`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  await dismissCookies(page);

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

/**
 * Layout invariants that must hold at EVERY viewport, not just the one the
 * screen was designed at. Desktop and mobile drift apart silently otherwise:
 * a grid sized for one width shatters at the other, and nothing fails.
 *
 * Measured on the live page rather than asserted from the CSS, because what
 * matters is where the pixels actually landed.
 */
async function auditLayout(page, view, label) {
  const r = await page.evaluate(() => {
    const vis = el => el.getBoundingClientRect().height > 0;
    const doc = document.documentElement;
    return {
      overflow: doc.scrollWidth - doc.clientWidth,
      // Typed-into fields only. A text box with no border is invisible to
      // type into, which is the defect this catches — but a checkbox or a
      // radio is a native control drawn by the browser, and has no border
      // by design. Including them failed the bulk-select boxes on the
      // orders screen for having exactly the appearance they should.
      borderless: [...document.querySelectorAll('input:not([type=hidden])')]
        .filter(el => !['checkbox', 'radio', 'range', 'color', 'file'].includes(el.type))
        .filter(vis)
        .filter(el => parseFloat(getComputedStyle(el).borderTopWidth) === 0)
        .map(el => el.id || el.placeholder || 'input'),
      // An icon on its own line is the signature of a button with no
      // inline-flex — the defect that made three controls look like plain text.
      // Measured as "does the content box span more than one line", scoped to
      // the action controls; a tall button with generous padding is not a bug,
      // and an earlier height-versus-icon ratio flagged every one of those.
      stacked: [...document.querySelectorAll('.ord-actions button, .ord-confirm button, .admin-toolbar button')]
        .filter(vis)
        .filter(el => el.querySelector('svg') && (el.textContent || '').trim())
        .filter(el => {
          // Vertical centres, not heights: a button with a tap-target minimum
          // height is taller than its text and perfectly fine. What marks the
          // defect is the icon sitting on its own row, which pulls its centre
          // clear of the button's.
          const icon = el.querySelector('svg').getBoundingClientRect();
          const box = el.getBoundingClientRect();
          const drift = Math.abs((icon.top + icon.height / 2) - (box.top + box.height / 2));
          return drift > icon.height * 0.75;
        })
        .map(el => (el.textContent || '').trim().slice(0, 24)),
    };
  });

  rec(view, `${label}: page never scrolls sideways`, r.overflow <= 0, `${r.overflow}px`);
  rec(view, `${label}: every input has a visible border`, r.borderless.length === 0, r.borderless.join(', '));
  rec(view, `${label}: no button stacks its icon above its label`, r.stacked.length === 0, r.stacked.join(' | '));
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

  // ── 0. Operations Hub ──
  // The seed fixture is two products: one with 4 in stock at £759, one out of
  // stock at £399. Every figure below is therefore checked against a number
  // computed by hand, not against whatever the page happens to render.
  await page.goto(`${BASE}/admin`, { waitUntil: 'domcontentloaded' });
  await dismissCookies(page);
  await settled(page, '.ops-bar-row');
  const hub = await txt();

  rec(view, 'Operations Hub is the admin landing page', /OPERATIONS HUB/i.test(hub), hub.slice(0, 80));
  rec(view, 'Product count KPI is right', /PRODUCTS 2\b/i.test(hub), hub.slice(0, 160));
  rec(view, 'Units-in-stock KPI is right', /UNITS IN STOCK 4\b/i.test(hub));
  // 4 x £759 = £3,036, and the out-of-stock item contributes nothing.
  rec(view, 'Stock value KPI is right', /STOCK VALUE £3,036/i.test(hub), hub.slice(0, 220));
  rec(view, 'Needs-attention KPI counts both bands', /NEEDS ATTENTION 2\b/i.test(hub) && /1 out · 1 low/.test(hub));

  const bars = await page.locator('.ops-bar-row').count();
  rec(view, 'Stock-by-brand chart renders a bar per brand', bars === 2, `${bars} bars`);

  // A zero-unit brand must draw no fill at all — a stub of bar reads as "some".
  const zeroBarWidth = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('.ops-bar-row')];
    const samsung = rows.find(r => /Samsung/i.test(r.textContent || ''));
    return samsung?.querySelector('.ops-bar-fill')?.getBoundingClientRect().width ?? -1;
  });
  rec(view, 'A brand with zero stock draws no bar', zeroBarWidth === 0, `${zeroBarWidth}px`);

  rec(view, 'Restocking queue lists the out-of-stock item', /Samsung Galaxy S23/.test(hub) && /OUT OF STOCK/i.test(hub));
  await shot(page, `${view}-dashboard-hub`);

  // ── 1. Inventory loads for an admin ──
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

  // ── 9. Archiving requires confirmation, and keeps the record ──
  //
  // This used to test deletion. Products are no longer deletable by anyone —
  // firestore.rules refuses it outright — because a product is referenced by
  // every order that ever contained it, so removing one rewrites history: an
  // old invoice loses the thing it was for, and a return raised against it
  // has nothing to check.
  //
  // The assertion is therefore inverted. The old one passed when the document
  // was gone; this one fails if it is, because surviving is the point.
  await page.goto(`${BASE}/admin/inventory`, { waitUntil: 'domcontentloaded' });
  await settled(page, '.admin-row');
  const before = await countProducts();
  const archiveBtn = page.getByRole('button', { name: /Archive Samsung Galaxy S23/i }).first();
  if (await archiveBtn.count()) {
    await archiveBtn.click();
    await page.waitForTimeout(400);
    const dialog = await txt();
    rec(view, 'Archiving opens a confirmation dialog', /archive/i.test(dialog));
    // The copy has to say it is reversible. The old dialog said "cannot be
    // undone", which was true of a delete and is a lie about an archive —
    // and a warning people learn is overstated is a warning they stop
    // reading.
    rec(view, 'The dialog says archiving is reversible',
      /reversible|restore|undo/i.test(dialog) && !/cannot be undone/i.test(dialog));
    await shot(page, `${view}-archive-confirm`);

    await page.getByRole('button', { name: /Keep it|Cancel/i }).first().click();
    await page.waitForTimeout(400);
    rec(view, 'Cancelling the dialog archives nothing',
      (await getProduct('samsung-galaxy-s23'))?.archivedAt == null);

    await archiveBtn.click();
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: /^Archive( it)?$/i }).first().click();
    await page.waitForTimeout(1500);

    const archived = await getProduct('samsung-galaxy-s23');
    rec(view, 'Confirmed archive stamps the product rather than deleting it',
      archived != null && archived.archivedAt != null,
      archived == null ? 'the document was removed — history is now broken' : `archivedAt=${archived.archivedAt}`);
    // Nothing left the database. A count that fell would mean the archive
    // path is still deleting somewhere.
    rec(view, 'Nothing was removed from Firestore', (await countProducts()) === before,
      `${await countProducts()} of ${before}`);
    await shot(page, `${view}-archived`);
  } else {
    rec(view, 'Archiving opens a confirmation dialog', false, 'archive button not found');
    rec(view, 'The dialog says archiving is reversible', false, 'archive button not found');
    rec(view, 'Cancelling the dialog archives nothing', false, 'archive button not found');
    rec(view, 'Confirmed archive stamps the product rather than deleting it', false, 'archive button not found');
    rec(view, 'Nothing was removed from Firestore', false, 'archive button not found');
  }

  // ── 10. Non-admin is refused even with a valid session ──
  const ctx2 = await browser.newContext(contextOpts);
  const page2 = await ctx2.newPage();
  await signInAs(page2, 'customer');
  await page2.goto(`${BASE}/admin/inventory`, { waitUntil: 'domcontentloaded' });
  await page2.waitForTimeout(900);
  const customerBody = (await page2.locator('body').innerText()).replace(/\s+/g, ' ');
  // "Staff access only" rather than the old "Admin access only": the console
  // now has two back-office roles, and a customer has neither. The refusal is
  // about not working here at all, which is why it does not name a role.
  rec(view, 'Signed-in customer is refused', /Staff access only/i.test(customerBody), customerBody.slice(0, 90));
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

  /* ── Banners: the shop front, editable without a deploy ──
     The property that matters is the round trip. A banner saved here has to
     reach the home page, and a banner switched off must not — anything less
     and staff are typing into a form that may or may not be the website. */
  await page.goto(`${BASE}/admin/banners`, { waitUntil: 'domcontentloaded' });
  await settled(page, '.ops-title');
  rec(view, 'Banners screen is reachable from the admin nav',
    /home banners/i.test(await txt()));

  await page.getByRole('button', { name: /New banner/i }).click();
  await settled(page, '.bn-card');

  // A new banner is off and incomplete: it must not be savable yet.
  const saveBtn = page.getByRole('button', { name: /^Save$/ }).first();
  rec(view, 'An incomplete banner cannot be saved',
    await saveBtn.isDisabled(), 'save was enabled on an empty banner');
  rec(view, 'It says what is missing rather than only refusing',
    (await page.locator('.bn-problems li').count()) > 0);

  await page.getByLabel('Headline').fill('E2E banner headline');
  await page.getByLabel('Image description').fill('An end-to-end test banner');
  await page.getByLabel('Button link').fill('/products');

  // A link that leaves the shop is refused: this is the home page's main
  // call to action, set from a text field.
  await page.getByLabel('Button link').fill('https://evil.test');
  await page.waitForTimeout(250);
  rec(view, 'A banner link that leaves the shop is refused',
    /inside the shop/i.test(await txt()));
  await page.getByLabel('Button link').fill('/products');
  await page.waitForTimeout(250);

  // Artwork, through the real upload path into the emulator's storage.
  await page.setInputFiles('.bn-field input[type="file"]', {
    name: 'banner.png', mimeType: 'image/png', buffer: PNG_1PX,
  });
  await page.waitForTimeout(2500);
  rec(view, 'Banner artwork uploads to storage',
    (await page.locator('.bn-upload__thumb[src]').count()) > 0);

  await page.getByRole('button', { name: /Switch on/i }).click();
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: /Save & put live/i }).click();
  await page.waitForTimeout(2500);
  rec(view, 'Saving a live banner reports it as live', /live on the home page/i.test(await txt()));

  // The round trip: the storefront must now be showing it.
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await dismissCookies(page);
  await page.waitForTimeout(3500);
  rec(view, 'A saved banner reaches the home page',
    /E2E banner headline/i.test(await txt()), (await txt()).slice(0, 120));

  // …and switching it off takes it down again.
  await page.goto(`${BASE}/admin/banners`, { waitUntil: 'domcontentloaded' });
  await settled(page, '.bn-card');
  await page.getByRole('button', { name: /Switch off/i }).first().click();
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: /^Save$/ }).first().click();
  await page.waitForTimeout(2500);

  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3500);
  rec(view, 'Switching a banner off takes it off the home page',
    !/E2E banner headline/i.test(await txt()));

  await auditLayout(page, view, 'Banners');
  await page.goto(`${BASE}/admin/banners`, { waitUntil: 'domcontentloaded' });
  await settled(page, '.bn-card');
  await shot(page, `${view}-banners`);

  // ── Orders: the screen staff actually run the shop from ──
  const orderFixture = (id, status, total) => ({
    id, status, total, currency: 'GBP',
    contactEmail: 'buyer@example.com', createdAt: '2026-09-11T08:12:44.000Z',
    updatedAt: '2026-09-11T08:12:44.000Z', paypalOrderId: `PP-${id}`, captureId: `CAP-${id}`,
    shippingAddress: { fullName: 'Alex Morgan', addressLine1: '221B Baker Street', city: 'London', postalCode: 'NW1 6XE' },
    items: [{ productId: 'apple-iphone-17', brand: 'Apple', model: 'iPhone 17', quantity: 1, price: total }],
  });

  // One order at each stage. A single fixture would have passed against the
  // broken screen too: it showed every action at every stage, so it showed
  // the right one as well.
  await seedOrders([
    orderFixture('ORD-E2E-1', 'pending', 759),
    orderFixture('ORD-E2E-2', 'dispatched', 429),
    orderFixture('ORD-E2E-3', 'out-for-delivery', 315),
    orderFixture('ORD-E2E-4', 'delivered', 199),
  ]);

  await page.goto(`${BASE}/admin/orders`, { waitUntil: 'domcontentloaded' });
  await dismissCookies(page);
  await settled(page, '.ord-head');
  const orders = await txt();

  rec(view, 'Orders screen lists the seeded order', /ORD-E2E-1/.test(orders), orders.slice(0, 120));
  rec(view, 'Order total is shown', /£759\.00/.test(orders));
  rec(view, 'Status reads as a packing task', /Paid — to pack/i.test(orders));

  // The order reference must never wrap — it is the thing staff read aloud.
  const idLines = await page.evaluate(() => {
    const el = document.querySelector('.ord-id');
    if (!el) return -1;
    return Math.round(el.getBoundingClientRect().height / parseFloat(getComputedStyle(el).fontSize));
  });
  rec(view, 'Order reference stays on one line', idLines > 0 && idLines < 2, `${idLines} lines`);

  await auditLayout(page, view, 'Orders (collapsed)');
  await shot(page, `${view}-orders-list`);

  await page.locator('.ord-head').first().click();
  await settled(page, '.ord-actions');
  rec(view, 'Expanding an order reveals the dispatch controls',
    await page.getByRole('button', { name: /Mark dispatched/i }).isVisible());
  await auditLayout(page, view, 'Orders (expanded)');
  await shot(page, `${view}-orders-expanded`);

  /* Each stage offers ONE move — the next one — and never the others.
     This shipped broken: every order showed Mark dispatched, Out for
     delivery, Resend receipt and Refund whatever stage it was at, so an
     order already on the van still offered to dispatch it. The suite did not
     notice, because it only ever asked whether the controls appeared. */
  const STAGE_EXPECTATIONS = [
    ['ORD-E2E-1', 'Mark dispatched',       ['Mark out for delivery', 'Mark delivered'], true],
    ['ORD-E2E-2', 'Mark out for delivery', ['Mark dispatched', 'Mark delivered'],       true],
    ['ORD-E2E-3', 'Mark delivered',        ['Mark dispatched', 'Mark out for delivery'], false],
    ['ORD-E2E-4', null,                    ['Mark dispatched', 'Mark out for delivery', 'Mark delivered'], false],
  ];

  await page.goto(`${BASE}/admin/orders`, { waitUntil: 'domcontentloaded' });
  await settled(page, '.ord-head');
  await page.getByRole('tab', { name: /^All/ }).click();
  await page.waitForTimeout(500);

  for (const [id, expected, forbidden, wantsTracking] of STAGE_EXPECTATIONS) {
    const head = page.locator('.ord-head', { hasText: id }).first();
    if (!(await head.count())) { rec(view, `Stage actions: ${id}`, false, 'row not found'); continue; }
    await head.click();
    await page.waitForTimeout(450);

    const exact = (name) => page.getByRole('button', { name: new RegExp(`^${name}$`, 'i') });
    const offered = expected ? await exact(expected).count() : 0;
    let wrong = 0;
    for (const f of forbidden) wrong += await exact(f).count();

    rec(view, `Stage offers only its next move: ${id}`,
      (expected ? offered === 1 : true) && wrong === 0,
      `expected ${expected ?? 'none'} (found ${offered}), forbidden found ${wrong}`);

    // Courier and tracking belong to a movement, not to every row.
    const tracking = await page.getByLabel('Tracking number').count();
    rec(view, `Tracking fields shown only when useful: ${id}`,
      wantsTracking ? tracking === 1 : tracking === 0, `found ${tracking}`);

    // The rail says where the order is without decoding the button.
    const rail = await page.locator('.ord-steps li[data-state="now"]').count();
    rec(view, `Progress rail marks one current stage: ${id}`, rail === 1, `found ${rail}`);

    await head.click();
    await page.waitForTimeout(300);
  }

  await page.locator('.ord-head', { hasText: 'ORD-E2E-1' }).first().click();
  await settled(page, '.ord-actions');

  // Money leaving takes two deliberate steps at every width.
  await page.getByRole('button', { name: /Refund & restock/i }).click();
  const confirming = await page.locator('.ord-confirm').isVisible();
  rec(view, 'Refund asks before it acts', confirming);
  rec(view, 'Refund trigger is withdrawn while confirming',
    (await page.getByRole('button', { name: /Refund & restock/i }).count()) === 0);
  await auditLayout(page, view, 'Orders (confirming refund)');
  await shot(page, `${view}-orders-refund-confirm`);

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
