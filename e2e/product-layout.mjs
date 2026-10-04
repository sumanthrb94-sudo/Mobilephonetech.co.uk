// Product listing/detail responsiveness is geometry, not a component unit
// test. This protects the mobile-first catalogue against accidental desktop
// spacing regressions at the Android and iPhone widths that carry most visits.
//
// Start a built preview first:
//   npm run build
//   npx vite preview --host 127.0.0.1 --port 4173
// Then run:
//   npm run e2e:products
import { chromium } from 'playwright';
import { resolveChromium } from './chromium-path.mjs';

const BASE = process.env.E2E_BASE_URL || 'http://127.0.0.1:4173';
const devices = [
  ['Android 360', 360, 800, 2],
  ['iPhone 390', 390, 844, 3],
  ['iPhone 430', 430, 932, 3],
  ['Tablet 768', 768, 1024, 2],
  ['Desktop 1280', 1280, 900, 1],
  ['Desktop 1440', 1440, 900, 1],
];

const failures = [];
let assertions = 0;
function expect(device, assertion, pass, detail = '') {
  assertions += 1;
  const mark = pass ? 'PASS' : 'FAIL';
  console.log(`[${device}] ${mark} ${assertion}${detail ? ` — ${detail}` : ''}`);
  if (!pass) failures.push({ device, assertion, detail });
}

async function dismissCookies(page) {
  const button = page.getByRole('button', { name: /accept all cookies/i });
  if (await button.count()) await button.first().click().catch(() => {});
}

async function measureListing(page) {
  return page.evaluate(() => {
    const cards = [...document.querySelectorAll('[id^="product-card-"]')];
    const boxes = cards.map((card) => {
      const r = card.getBoundingClientRect();
      return { top: Math.round(r.top), left: Math.round(r.left), width: Math.round(r.width) };
    });
    const firstRow = boxes.filter((box) => Math.abs(box.top - boxes[0]?.top) < 3);
    return {
      overflow: document.documentElement.scrollWidth > window.innerWidth,
      cards: boxes.length,
      columns: firstRow.length,
      firstRow,
    };
  });
}

async function measureProduct(page) {
  return page.evaluate(() => {
    const grid = document.querySelector('.pdp-main-grid');
    const gallery = document.querySelector('.pdp-gallery');
    const buy = document.querySelector('.pdp-buy');
    const style = grid ? getComputedStyle(grid) : null;
    const galleryBox = gallery?.getBoundingClientRect();
    const buyBox = buy?.getBoundingClientRect();
    return {
      overflow: document.documentElement.scrollWidth > window.innerWidth,
      columns: style?.gridTemplateColumns ?? '',
      gallery: galleryBox ? { left: Math.round(galleryBox.left), right: Math.round(galleryBox.right) } : null,
      buy: buyBox ? { left: Math.round(buyBox.left), right: Math.round(buyBox.right) } : null,
    };
  });
}

async function verifyVariantDecision(page, device) {
  // Matrix colour buttons carry a title; gallery and utility buttons do not.
  // Not every live product has a matrix, so a single-configuration listing is
  // deliberately skipped rather than treated as a broken choice.
  const alternative = await page.evaluate(() => {
    const selected = [...document.querySelectorAll('button[aria-label*="(Selected)"]')]
      .find(button => button.hasAttribute('title'));
    const selectedTitle = selected?.title;
    return [...document.querySelectorAll('.pdp-buy button[title]')]
      .map(button => button.title)
      .find(title => title && title !== selectedTitle) ?? null;
  });

  if (alternative) {
    const beforePath = new URL(page.url()).pathname;
    await page.getByTitle(alternative, { exact: true }).click();
    await page.waitForTimeout(150);
    const selected = await page.locator('button[aria-label*="(Selected)"][title]').evaluateAll(
      buttons => buttons.some(button => (button.getAttribute('aria-label') ?? '').startsWith(button.getAttribute('title') ?? '')),
    );
    expect(device, 'colour selection updates in place without navigating away', new URL(page.url()).pathname === beforePath && selected);
  } else {
    console.log(`[${device}] SKIP  in-place colour update: this product has one configuration`);
  }

  const gradingHelp = page.getByRole('button', { name: 'What does each grade mean?' });
  if (await gradingHelp.count()) {
    await gradingHelp.first().click();
    const dialog = page.getByRole('dialog');
    await dialog.waitFor({ state: 'visible' });
    const gradingIsAccurate = await dialog.getByText('Pristine', { exact: true }).count() > 0
      && await dialog.getByText('Excellent', { exact: true }).count() > 0
      && await dialog.getByText('Good', { exact: true }).count() > 0
      && await dialog.getByText(/70-point technical inspection/i).count() > 0;
    expect(device, 'grading overlay explains the three live grades and 70-point test', gradingIsAccurate);
    await page.keyboard.press('Escape');
  } else {
    console.log(`[${device}] SKIP  grading overlay: no condition choices on this product`);
  }
}

async function run() {
  const browser = await chromium.launch({ executablePath: resolveChromium() });

  for (const [device, width, height, scale] of devices) {
    const context = await browser.newContext({
      viewport: { width, height },
      deviceScaleFactor: scale,
      hasTouch: width < 1024,
      isMobile: width < 640,
    });
    const page = await context.newPage();
    await page.goto(`${BASE}/products`, { waitUntil: 'networkidle' });
    await dismissCookies(page);
    await page.locator('[id^="product-card-"]').first().waitFor({ state: 'visible', timeout: 10_000 });

    const listing = await measureListing(page);
    expect(device, 'catalogue has no horizontal scroll', !listing.overflow);
    expect(device, 'catalogue cards rendered', listing.cards > 0, `${listing.cards} cards`);
    if (width < 640) {
      expect(device, 'catalogue keeps an even two-card phone row', listing.columns === 2, `${listing.columns} columns`);
    } else if (width >= 1024) {
      expect(device, 'catalogue uses a useful desktop grid', listing.columns >= 3, `${listing.columns} columns`);
    }

    await page.locator('[id^="product-card-"]').first().click();
    await page.waitForURL(/\/product\//, { timeout: 10_000 });
    await page.locator('.pdp-gallery').waitFor({ state: 'visible', timeout: 10_000 });
    const product = await measureProduct(page);
    expect(device, 'product page has no horizontal scroll', !product.overflow);
    expect(device, 'gallery and purchase panel render', Boolean(product.gallery && product.buy));
    if (width >= 1024) {
      const twoColumns = product.columns.trim().split(/\s+/).length === 2;
      const separate = Boolean(product.gallery && product.buy && product.gallery.right < product.buy.left);
      expect(device, 'desktop gallery and buy panel align side-by-side', twoColumns && separate, product.columns);
    } else {
      const oneColumn = product.columns.trim().split(/\s+/).length === 1;
      expect(device, 'phone product page stacks in one clear reading column', oneColumn, product.columns);
    }
    await verifyVariantDecision(page, device);
    await context.close();
  }

  await browser.close();
  console.log(`\n${assertions - failures.length}/${assertions} product layout assertions passed`);
  if (failures.length) process.exit(1);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
