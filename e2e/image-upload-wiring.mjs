// Which admin upload screens actually run a photo through the compressor —
// proven by uploading a real file through the real running app, not by
// reading which functions call which.
//
//   node e2e/image-upload-wiring.mjs   (needs emulators, api-server and
//                                       preview — see docs/ADMIN.md)
//
// WHY THIS IS SEPARATE FROM e2e/image-optimize.mjs
//
// That script proves optimizeImage() itself resizes and re-encodes
// correctly — it calls the function directly, in a bare page with no admin
// app, no auth, no Storage, and needs none of those to run. This proves the
// opposite thing: that a real upload on a real screen actually reaches that
// function at all. The gap it exists to catch is real — Banners and the
// Series panel's hero image both called uploadImage() straight, skipping
// optimizeImage() entirely, so an above-the-fold homepage photo uploaded
// there went out exactly as large as the file the admin's camera produced,
// while the product gallery next to it was already compressed. Reading the
// two files side by side is how that was found; only running an upload
// through each screen and checking what Storage actually received proves
// it is fixed.
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { resolveChromium } from './chromium-path.mjs';
import { seed, waitForEmulators, ADMIN_EMAIL, PASSWORD } from './emulator-seed.mjs';

const BASE = process.env.E2E_BASE || 'http://127.0.0.1:4173';
const FIXTURE_PATH = 'public/assets/quality-inspection.png'; // a real JPEG despite the name
const fixture = readFileSync(FIXTURE_PATH);

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

/** Fetches a URL and reports what actually came back, not what was asked for. */
async function inspect(url) {
  const res = await fetch(url);
  const buf = Buffer.from(await res.arrayBuffer());
  return { contentType: res.headers.get('content-type') ?? '', bytes: buf.length };
}

/**
 * Waits for the upload's own thumbnail to show a real hosted URL.
 *
 * Both Banners and Series render the uploaded image at the same class,
 * `.bn-upload__thumb`, bound directly to the field's stored value — so its
 * `src` becomes the real uploaded URL the moment the write resolves, with
 * no intermediate blob: preview to race against. Polled rather than a fixed
 * sleep, since the upload's own duration is what decides how long this
 * takes, not a guess at it.
 */
async function waitForUploadedUrl(page, timeoutMs = 15000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const src = await page.locator('.bn-upload__thumb').first().getAttribute('src').catch(() => null);
    if (src && src.startsWith('http')) return src;
    // eslint-disable-next-line no-await-in-loop
    await page.waitForTimeout(400);
  }
  return null;
}

await waitForEmulators();
await seed();

console.log(`Fixture: ${FIXTURE_PATH} — ${(fixture.length / 1024).toFixed(0)} KB source`);

const browser = await chromium.launch({ executablePath: resolveChromium() });

try {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));

  await signInAsAdmin(page);

  // ── Banners ──
  await page.goto(`${BASE}/admin/banners`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  // A fresh project has no banners yet, and the upload control only exists
  // on a row — so one is created first, the same first step a real admin
  // takes.
  await page.getByRole('button', { name: /new banner/i }).click();
  await page.waitForTimeout(800);

  const bannerInput = page.locator('input[type="file"]').first();
  await bannerInput.setInputFiles({
    name: 'quality-inspection.jpg', mimeType: 'image/jpeg', buffer: fixture,
  });
  const bannerUrl = await waitForUploadedUrl(page);

  if (bannerUrl) {
    const { contentType, bytes } = await inspect(bannerUrl);
    rec('Banner upload re-encodes to WebP or JPEG, never the raw source',
      /image\/(webp|jpeg)/.test(contentType), `content-type=${contentType}`);
    rec('Banner upload is genuinely smaller than the source, not a passthrough',
      bytes > 0 && bytes < fixture.length * 0.6,
      `${(bytes / 1024).toFixed(0)}KB of ${(fixture.length / 1024).toFixed(0)}KB source`);
  } else {
    rec('Banner upload re-encodes to WebP or JPEG, never the raw source', false, 'no hosted banner image URL found after upload');
    rec('Banner upload is genuinely smaller than the source, not a passthrough', false, 'no hosted banner image URL found after upload');
  }

  // ── Series panel hero image ──
  await page.goto(`${BASE}/admin/series`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  // A fresh project has no saved panels — the storefront falls back to the
  // built-ins, but the editor itself only edits a real row, so one is
  // created first, same as the banner above.
  await page.getByRole('button', { name: /new series/i }).click();
  await page.waitForTimeout(800);

  const seriesInput = page.locator('input[type="file"]').first();
  if (await seriesInput.count()) {
    await seriesInput.setInputFiles({
      name: 'quality-inspection-2.jpg', mimeType: 'image/jpeg', buffer: fixture,
    });
    const heroUrl = await waitForUploadedUrl(page);

    if (heroUrl) {
      const { contentType, bytes } = await inspect(heroUrl);
      rec('Series panel hero image is re-encoded, not uploaded raw',
        /image\/(webp|jpeg)/.test(contentType), `content-type=${contentType}`);
      rec('Series panel hero image is genuinely smaller than the source',
        bytes > 0 && bytes < fixture.length * 0.6,
        `${(bytes / 1024).toFixed(0)}KB of ${(fixture.length / 1024).toFixed(0)}KB source`);
    } else {
      rec('Series panel hero image is re-encoded, not uploaded raw', false, 'no hosted hero image URL found after upload');
      rec('Series panel hero image is genuinely smaller than the source', false, 'no hosted hero image URL found after upload');
    }
  } else {
    rec('Series panel hero image is re-encoded, not uploaded raw', false, 'no file input found on the Series page');
    rec('Series panel hero image is genuinely smaller than the source', false, 'no file input found on the Series page');
  }

  rec('No uncaught errors during either upload', errors.length === 0, errors.slice(0, 2).join(' | '));
  await ctx.close();
} finally {
  await browser.close();
}

const passed = results.filter(r => r.ok).length;
console.log(`\n${passed}/${results.length} checks passed`);
process.exit(passed === results.length ? 0 : 1);
