/**
 * Regenerates every launcher and browser icon from one definition.
 *
 *   node scripts/generate-icons.mjs
 *
 * The icons were previously produced by hand and drifted: all of them were
 * flattened onto WHITE with no alpha channel, so the rounded amber tile
 * arrived with four opaque white corners baked in. On a dark Chrome tab
 * strip that is four bright notches around the mark — the bug this script
 * exists to stop coming back.
 *
 * Rendering goes through Chromium with `omitBackground`, so the corners the
 * tile does not cover stay genuinely transparent rather than becoming some
 * assumed page colour.
 *
 * Sizes are drawn, never downscaled from one master. A favicon is 16 CSS px
 * in the tab strip; resampling a 48px thin-stroke glyph down to 16 is what
 * turns it to mud. Each size gets its own optical treatment instead.
 */
import { chromium } from 'playwright';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { resolveChromium } from '../e2e/chromium-path.mjs';

const BRAND = '#a16207';   // --brand-cyan in src/index.css (amber, despite the name)
const GLYPH = '#ffffff';

// lucide-react `refresh-cw`, on a 24 viewBox. Kept inline rather than
// imported so this script does not depend on the React build.
const PATHS = [
  'M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8',
  'M21 3v5h-5',
  'M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16',
  'M8 16H3v5',
];

/**
 * @param size      canvas edge in px
 * @param glyphPct  glyph edge as a fraction of the canvas
 * @param radiusPct corner radius as a fraction of the canvas; 0 = full bleed
 * @param stroke    stroke width in the 24-unit glyph space
 */
function svg({ size, glyphPct, radiusPct, stroke }) {
  const g = size * glyphPct;
  const off = (size - g) / 2;
  const r = size * radiusPct;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${r}" ry="${r}" fill="${BRAND}"/>
  <g transform="translate(${off} ${off}) scale(${g / 24})"
     fill="none" stroke="${GLYPH}" stroke-width="${stroke}"
     stroke-linecap="round" stroke-linejoin="round">
    ${PATHS.map(d => `<path d="${d}"/>`).join('\n    ')}
  </g>
</svg>`;
}

// A favicon carries the mark optically larger and heavier than the app icon:
// it is read at 16px against browser chrome, not at 192px on a home screen.
const FAVICON = { glyphPct: 0.66, radiusPct: 0.22, stroke: 2.9 };
// The PWA icon matches BrandMark's own proportions (glyph 52%, radius 27%).
const APP     = { glyphPct: 0.52, radiusPct: 0.27, stroke: 2.5 };
// iOS and Android apply their own mask, so these are full bleed — a radius
// here would be clipped twice and a transparent corner would go black.
// The maskable glyph stays inside Android's 80%-diameter safe circle.
const APPLE    = { glyphPct: 0.52, radiusPct: 0,   stroke: 2.5 };
const MASKABLE = { glyphPct: 0.40, radiusPct: 0,   stroke: 2.5 };

const TARGETS = [
  { file: 'public/favicon-16.png',              size: 16,  ...FAVICON },
  { file: 'public/favicon-32.png',              size: 32,  ...FAVICON },
  { file: 'public/favicon-48.png',              size: 48,  ...FAVICON },
  { file: 'public/favicon.png',                 size: 48,  ...FAVICON },
  { file: 'public/icons/icon-192.png',          size: 192, ...APP },
  { file: 'public/icons/icon-512.png',          size: 512, ...APP },
  { file: 'public/icons/apple-touch-icon.png',  size: 180, ...APPLE },
  { file: 'public/icons/icon-maskable-192.png', size: 192, ...MASKABLE },
  { file: 'public/icons/icon-maskable-512.png', size: 512, ...MASKABLE },
];

const exe = resolveChromium();
const browser = await chromium.launch({ ...(exe ? { executablePath: exe } : {}), args: ['--no-sandbox'] });

await mkdir('public/icons', { recursive: true });

// The vector favicon Chrome prefers when it is offered one: no resampling at
// any zoom or device pixel ratio.
await writeFile('public/favicon.svg', svg({ size: 48, ...FAVICON }) + '\n');
console.log('public/favicon.svg');

for (const { file, ...spec } of TARGETS) {
  const page = await browser.newPage({
    viewport: { width: spec.size, height: spec.size },
    deviceScaleFactor: 1,
  });
  await page.setContent(
    `<style>html,body{margin:0;padding:0;background:transparent}</style>${svg(spec)}`,
    { waitUntil: 'load' },
  );
  await page.screenshot({ path: file, omitBackground: true });
  await page.close();
  console.log(file);
}

/**
 * Packs the three PNGs into /favicon.ico.
 *
 * Nothing in index.html points at it — the link tags above cover every
 * browser. It exists because crawlers, feed readers and link unfurlers probe
 * `/favicon.ico` at the site root regardless of what the markup says, and a
 * 404 there means those show a blank square. An ICO is just a directory of
 * images, and every current browser accepts PNG payloads inside one, so the
 * files already written go in whole rather than being re-encoded as BMP.
 */
async function writeIco(sources, out) {
  const pngs = await Promise.all(sources.map(s => readFile(s.file)));

  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);              // reserved
  header.writeUInt16LE(1, 2);              // 1 = icon
  header.writeUInt16LE(sources.length, 4);

  let offset = 6 + 16 * sources.length;
  const entries = sources.map((s, i) => {
    const e = Buffer.alloc(16);
    e.writeUInt8(s.size >= 256 ? 0 : s.size, 0);  // 0 means 256
    e.writeUInt8(s.size >= 256 ? 0 : s.size, 1);
    e.writeUInt8(0, 2);                    // palette size
    e.writeUInt8(0, 3);                    // reserved
    e.writeUInt16LE(1, 4);                 // colour planes
    e.writeUInt16LE(32, 6);                // bits per pixel
    e.writeUInt32LE(pngs[i].length, 8);
    e.writeUInt32LE(offset, 12);
    offset += pngs[i].length;
    return e;
  });

  await writeFile(out, Buffer.concat([header, ...entries, ...pngs]));
  console.log(out);
}

await writeIco(
  [
    { file: 'public/favicon-16.png', size: 16 },
    { file: 'public/favicon-32.png', size: 32 },
    { file: 'public/favicon-48.png', size: 48 },
  ],
  'public/favicon.ico',
);

await browser.close();
