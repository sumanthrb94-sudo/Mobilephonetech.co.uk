// Product page photos, in a real browser against the emulator:
//  - the page waits for the chosen colour's photos before it appears;
//  - each distinct photo shows once (no padding to six with repeats);
//  - switching colour keeps the page and the hero <img> in place and only
//    swaps the photos, once the new ones have loaded.
// Photos are served by the test itself with a delay, so "loading" is real.
import { chromium } from 'playwright';
import { resolveChromium } from './chromium-path.mjs';
import { createServer } from 'node:http';
import { seedExtraProducts } from './emulator-seed.mjs';

const BASE = process.env.E2E_BASE_URL || 'http://127.0.0.1:4173';
const PHOTO_DELAY_MS = 1500;
// A local photo host rather than intercepted requests: Playwright turns the
// HTTP cache off while routing, and the cache is the point of preloading.
const PHOTO_PORT = 4599;
const cdn = name => `http://127.0.0.1:${PHOTO_PORT}/pdp/${name}.png`;
// 1x1 PNG; the content does not matter, only that it loads.
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

const PRODUCT = {
  id: 'apple-iphone-13-photo-test',
  model: 'iPhone 13 Photo Test', brand: 'Apple', category: 'Phones', storage: '128GB',
  price: 300, originalPrice: 600, grade: 'Excellent', batteryHealth: 90,
  warrantyMonths: 12, returnDays: 30, isCertified: true, stock: 4, listed: true,
  createdAt: '2026-01-03T00:00:00Z',
  imageUrl: cdn('green-front'),
  galleryImages: [cdn('green-front'), cdn('back'), cdn('side')],
  variants: [
    { id: 'v-green', color: 'Green', storage: '128GB', condition: 'Excellent', price: 300, originalPrice: 600, stock: 2,
      imageUrl: cdn('green-front'),
      // The same front twice: one photo, shown once.
      galleryImages: [cdn('green-front'), cdn('back'), cdn('side'), cdn('green-front')] },
    { id: 'v-blue', color: 'Blue', storage: '128GB', condition: 'Excellent', price: 310, originalPrice: 600, stock: 2,
      imageUrl: cdn('blue-front'),
      galleryImages: [cdn('blue-front'), cdn('back'), cdn('side')] },
  ],
};

let pass = 0, fail = 0;
const rec = (name, ok, detail = '') => {
  ok ? pass++ : fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
};

await seedExtraProducts([PRODUCT]);
const photoHost = createServer((req, res) => setTimeout(() => {
  res.writeHead(200, { 'content-type': 'image/png', 'cache-control': 'public, max-age=31536000', 'access-control-allow-origin': '*' });
  res.end(PNG);
}, PHOTO_DELAY_MS)).listen(PHOTO_PORT, '127.0.0.1');
const browser = await chromium.launch({ executablePath: resolveChromium() });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

await page.goto(`${BASE}/product/${PRODUCT.id}`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(600);
rec('Page waits for its photos (skeleton while they load)', await page.locator('.pdp-gallery').count() === 0);

await page.locator('.pdp-gallery').waitFor({ timeout: 15000 });
const heroLoaded = await page.locator('.pdp-gallery img').first()
  .evaluate(img => img.complete && img.naturalWidth > 0);
rec('Hero photo is fully loaded when the page appears', heroLoaded);

const thumbs = await page.locator('.pdp-thumbnails button').count();
rec('Each distinct photo shows once', thumbs === 3, `${thumbs} thumbnails for 3 distinct photos`);

const hero = page.locator('.pdp-gallery img').first();
await hero.evaluate(img => { img.dataset.same = 'yes'; });
const greenSrc = await hero.getAttribute('src');

const blue = page.getByRole('button', { name: /^Blue/ }).first();
await blue.click();
// While the blue photos load: same page, same <img>, still the green photo.
let blanked = false;
for (let t = 0; t < PHOTO_DELAY_MS; t += 100) {
  if (await page.locator('.pdp-gallery').count() === 0) blanked = true;
  await page.waitForTimeout(100);
}
rec('Switching colour never shows the page skeleton', !blanked);
await page.waitForFunction(src => document.querySelector('.pdp-gallery img')?.getAttribute('src') !== src, greenSrc, { timeout: 8000 })
  .catch(() => {});
const after = await page.locator('.pdp-gallery img').first().evaluate(img => ({
  same: img.dataset.same === 'yes', src: img.getAttribute('src'), loaded: img.complete && img.naturalWidth > 0,
}));
rec('Only the photo changes: the hero <img> is reused', after.same);
rec('Hero now shows the blue photo, fully loaded', /blue-front/.test(after.src ?? '') && after.loaded, after.src ?? '');

await browser.close();
photoHost.close();
console.log(`PASS ${pass}  FAIL ${fail}`);
process.exit(fail ? 1 : 0);
