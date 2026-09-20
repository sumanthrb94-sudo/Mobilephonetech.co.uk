// Search suite: what the search field does when tapped, when cleared, and
// when its URL is loaded rather than navigated to.
//
//   npm run build && npx vite preview --port 4173 &
//   npm run e2e:search
//
// Exits non-zero on any FAIL.
//
// Each of these covers something that was broken and would not have shown up
// in a unit test, because each one needs a real catalogue, a real URL and a
// real cascade:
//
//  1. TAPPING AN EMPTY FIELD. There was an empty-state branch reading "Start
//     typing to see devices", but showPanel required a query or a saved
//     search, so on a first visit the panel never opened and the message
//     could not render. A keyboard came up over a blank screen.
//
//  2. EVERY SUGGESTION MUST FIND SOMETHING. ProductsPage matches the query as
//     a substring of ONE field, so "Apple iPhone 17 Pro Max" is in none of
//     them and returned nothing. A suggestion that leads to an empty results
//     page is worse than no suggestion, so this clicks through every row on
//     screen rather than trusting the derivation.
//
//  3. CLEARING. Until there was a button, the only way out of an open panel
//     was to delete the query a character at a time, or to find a patch of
//     page the dropdown was not covering.
//
//  4. ?search= ON A COLD LOAD. The page read category, brand, model and deal
//     from the URL but never search, so the term survived a click and
//     nothing else: a reload, a shared link or a bookmark showed all 133
//     products as though nothing had been asked for.
import { chromium } from 'playwright';
import { resolveChromium } from './chromium-path.mjs';

const BASE = process.env.E2E_BASE_URL || 'http://127.0.0.1:4173';
const EXE = resolveChromium();

const results = [];
function rec(what, expected, got, detail = '') {
  const ok = expected === got;
  results.push({ what, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${what}: expected ${expected}, got ${got}${detail ? ` — ${detail}` : ''}`);
}

const cards = (page) =>
  page.evaluate(() => document.querySelectorAll('article[id^="product-card-"]').length);

async function dismissCookies(page) {
  const b = page.getByRole('button', { name: /accept all cookies/i });
  if (await b.count()) { await b.first().click().catch(() => {}); await page.waitForTimeout(400); }
}

async function run() {
  const browser = await chromium.launch({ executablePath: EXE });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();

  // ── 1. Tapping an empty field offers something ────────────────────
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await dismissCookies(page);
  await page.waitForTimeout(900);
  await page.locator('input[role="combobox"]').first().click();
  await page.waitForTimeout(700);

  const terms = await page.evaluate(() =>
    [...document.querySelectorAll('#search-listbox button')]
      .map((b) => b.textContent.trim().replace(/\s+/g, ' '))
      .filter((t) => t && t !== 'Clear'));
  rec('empty field offers suggestions', true, terms.length > 0, terms.join(' / '));

  // Readable, not cut off mid-word.
  const truncated = await page.evaluate(() =>
    [...document.querySelectorAll('#search-listbox button span')]
      .filter((s) => s.scrollWidth > s.clientWidth + 1)
      .map((s) => s.textContent.trim()));
  rec('no suggestion is truncated', 0, truncated.length, truncated.join(' / '));

  // ── 2. Every suggestion finds something ───────────────────────────
  // The visible label is the search that gets run — they are the same
  // string on purpose — so searching the label is a fair test of the row.
  let empties = 0;
  for (const term of terms) {
    await page.goto(`${BASE}/products?search=${encodeURIComponent(term)}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1100);
    const n = await cards(page);
    if (n === 0) { empties++; console.log(`      ^ "${term}" returned nothing`); }
  }
  rec('every suggestion returns results', 0, empties, `${terms.length} checked`);

  // ── 3. Clearing ───────────────────────────────────────────────────
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await dismissCookies(page);
  await page.waitForTimeout(800);
  const box = page.locator('input[role="combobox"]').first();
  await box.click();
  await box.fill('Appl');
  await page.waitForTimeout(600);

  const clearShown = await page.getByRole('button', { name: 'Clear search' }).isVisible().catch(() => false);
  rec('clear button appears once there is text', true, clearShown);

  if (clearShown) {
    await page.getByRole('button', { name: 'Clear search' }).click();
    await page.waitForTimeout(500);
    const after = await page.evaluate(() => ({
      value: document.querySelector('input[role="combobox"]').value,
      panelOpen: !!document.getElementById('search-listbox'),
      stillFocused: document.activeElement === document.querySelector('input[role="combobox"]'),
    }));
    rec('clearing empties the field', '', after.value);
    rec('clearing closes the panel', false, after.panelOpen);
    // Blurred so the phone keyboard goes away with it.
    rec('clearing drops the keyboard', false, after.stillFocused);
  }

  // ── 3b. An abandoned draft must not outlive the dropdown ──────────
  // searchQuery is one useState in SearchContext and the Navbar never
  // unmounts, so a half-typed term used to sit in the bar for the whole
  // visit — and feed ProductsPage's filter while it sat there.
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await dismissCookies(page);
  await page.waitForTimeout(800);
  const draft = page.locator('input[role="combobox"]').first();
  await draft.click();
  await draft.fill('Iph');
  await page.waitForTimeout(500);
  await page.mouse.click(200, 700);           // tap the page, not the panel
  await page.waitForTimeout(600);
  const leftBehind = await page.evaluate(() =>
    document.querySelector('input[role="combobox"]').value);
  rec('an abandoned draft is discarded', '', leftBehind);

  // ...but a committed search is NOT a draft. Dismissing the dropdown on a
  // results page must leave the term, and the results, alone.
  await page.goto(`${BASE}/products?search=${encodeURIComponent('Pixel')}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const committedCards = await cards(page);
  await page.mouse.click(200, 700);
  await page.waitForTimeout(600);
  const kept = await page.evaluate(() =>
    document.querySelector('input[role="combobox"]').value);
  rec('a committed search survives a dismiss', 'Pixel', kept);
  rec('and its results survive too', true, (await cards(page)) === committedCards, `${committedCards} cards`);

  // ── 4. The URL is the search ──────────────────────────────────────
  await page.goto(`${BASE}/products?search=${encodeURIComponent('iPhone 17 Pro Max')}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const seeded = await cards(page);
  rec('a cold-loaded ?search= actually filters', true, seeded > 0 && seeded < 20, `${seeded} cards`);

  await page.goto(`${BASE}/products`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1400);
  const unfiltered = await cards(page);
  rec('no param does not carry the last search over', true, unfiltered > seeded, `${unfiltered} cards`);

  await browser.close();
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} passed`);
  process.exit(failed === 0 ? 0 : 1);
}

run().catch((err) => { console.error(err); process.exit(1); });
