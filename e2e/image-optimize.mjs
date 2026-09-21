// Image-optimisation suite: what actually happens to a photo an admin
// uploads, measured in a real browser against real bytes — not asserted
// from reading the code.
//
//   npm run e2e:image-optimize
//
// Exits non-zero on any FAIL.
//
// WHY THIS IS A BROWSER TEST
//
// optimizeImage() (src/lib/imageOptimize.ts) is built entirely on
// createImageBitmap, <canvas> and canvas.toBlob — none of which jsdom
// implements. A unit test here could only assert that the function was
// CALLED with the right arguments, never that a 4000px photo actually came
// out smaller and correctly sized. So this bundles the real module with
// esbuild, serves it to a real Chromium tab, generates a photo-shaped image
// on an in-page <canvas> (no fixture files, no image-library dependency),
// and reads back what the function actually produced.
//
// WHAT IT PROTECTS
//
// The problem this exists to solve: uploadImage() sends whatever File it is
// given, unchanged, straight to Storage. A phone photo is routinely 3000-
// 4000px and several MB; the storefront never shows a product photo wider
// than the PDP gallery. Upload the source file as-is and every visitor's
// phone downloads a file sized for a desktop monitor to see something the
// size of a playing card. Measured on a realistic case below: a 4032x3024
// photo comes back at 2000x1500 WebP, roughly a tenth of the size.
import { chromium } from 'playwright';
import { resolveChromium } from './chromium-path.mjs';
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const results = [];
function rec(what, expected, got, detail = '') {
  const ok = expected === got;
  results.push({ what, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${what}: expected ${expected}, got ${got}${detail ? ` — ${detail}` : ''}`);
}
function recTrue(what, ok, detail = '') {
  results.push({ what, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${what}${detail ? ` — ${detail}` : ''}`);
}

async function run() {
  const dir = mkdtempSync(join(tmpdir(), 'imgopt-'));
  const bundlePath = join(dir, 'imageOptimize.bundle.js');
  execFileSync('npx', ['esbuild', 'src/lib/imageOptimize.ts', '--bundle', '--format=esm', `--outfile=${bundlePath}`]);

  const harnessPath = join(dir, 'harness.html');
  writeFileSync(harnessPath, `<!doctype html><html><body>
<script type="module">
  import { optimizeImage } from './imageOptimize.bundle.js';

  /** A photo-shaped canvas image — soft blobs, not synthetic noise, since
      that is what JPEG/WebP's DCT actually compresses well, the same way a
      real product photo does. No fixture file, no image library: the
      browser draws its own test input. */
  window.__makePhoto = async (w, h) => {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#f5f5f8'; ctx.fillRect(0, 0, w, h);
    let seed = 42;
    const rand = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    for (let i = 0; i < 40; i++) {
      const x = rand() * w, y = rand() * h, r = 60 + rand() * 300;
      ctx.fillStyle = \`rgb(\${(rand()*200)|0},\${(rand()*200)|0},\${(rand()*200)|0})\`;
      ctx.beginPath(); ctx.ellipse(x, y, r, r, 0, 0, Math.PI * 2); ctx.fill();
    }
    const blob = await new Promise((res) => c.toBlob(res, 'image/jpeg', 0.92));
    return new File([blob], 'test-photo.jpg', { type: 'image/jpeg' });
  };

  window.__run = async (w, h) => {
    const file = await window.__makePhoto(w, h);
    const result = await optimizeImage(file);
    const bitmap = await createImageBitmap(result.file);
    return {
      optimized: result.optimized,
      originalBytes: result.originalBytes,
      finalBytes: result.finalBytes,
      finalType: result.file.type,
      width: bitmap.width,
      height: bitmap.height,
    };
  };
</script>
</body></html>`);

  const server = createServer((req, res) => {
    const path = req.url === '/' ? '/harness.html' : req.url;
    try {
      const body = readFileSync(join(dir, path));
      res.writeHead(200, { 'content-type': path.endsWith('.js') ? 'application/javascript' : 'text/html' });
      res.end(body);
    } catch {
      res.writeHead(404);
      res.end();
    }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;

  const browser = await chromium.launch({ executablePath: resolveChromium() });
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'load' });

  // ── A realistic phone-camera-shaped photo ──────────────────────────
  const big = await page.evaluate(() => window.__run(4032, 3024));
  recTrue('a 4032x3024 photo is resized down', big.width <= 2000 && big.height <= 2000,
    `${big.width}x${big.height}`);
  rec('the long edge lands exactly at the cap', 2000, Math.max(big.width, big.height));
  rec('aspect ratio is preserved (4:3)', '2000x1500', `${big.width}x${big.height}`);
  rec('it is re-encoded as WebP', 'image/webp', big.finalType);
  recTrue('it comes out meaningfully smaller', big.finalBytes < big.originalBytes * 0.5,
    `${big.originalBytes} -> ${big.finalBytes} bytes`);
  recTrue('never comes out bigger than the source', big.finalBytes <= big.originalBytes);

  // ── An image already inside the size cap ───────────────────────────
  const small = await page.evaluate(() => window.__run(400, 400));
  rec('a 400x400 image is not upscaled', '400x400', `${small.width}x${small.height}`);
  recTrue('never comes out bigger than the source (small case)', small.finalBytes <= small.originalBytes,
    `${small.originalBytes} -> ${small.finalBytes} bytes`);

  await browser.close();
  server.close();

  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} passed`);
  process.exit(failed === 0 ? 0 : 1);
}

run().catch((err) => { console.error(err); process.exit(1); });
