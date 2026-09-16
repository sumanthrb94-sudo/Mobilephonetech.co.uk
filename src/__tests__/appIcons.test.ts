import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * The launcher and browser icons, asserted as shipped files.
 *
 * They had all been flattened onto WHITE with no alpha channel, so the
 * rounded amber tile carried four opaque white corners. Nothing failed: the
 * icons loaded, every size was present, and on a dark Chrome tab strip the
 * mark simply sat inside four bright notches. Only a person looking at their
 * own tab bar would ever catch it.
 *
 * What these check is the colour type declared in each PNG's header — the
 * one byte that separates "has an alpha channel" from "was flattened onto
 * some background". That is precisely the property that regressed, and it
 * regresses again the moment someone re-exports an icon from a tool that
 * defaults to a white matte.
 *
 * They do not decode pixels, so they prove a transparent corner is possible,
 * not that the generator drew one. scripts/generate-icons.mjs is what draws
 * them, and it renders through Chromium with `omitBackground`.
 */

const root = (p: string) => resolve(process.cwd(), p);
const read = (p: string) => readFileSync(root(p));

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** Reads IHDR: width, height and colour type (6 = RGBA, 2 = RGB, 4 = grey+A). */
function pngHeader(buf: Buffer) {
  expect(buf.subarray(0, 8).equals(PNG_MAGIC)).toBe(true);
  expect(buf.subarray(12, 16).toString('ascii')).toBe('IHDR');
  return {
    width: buf.readUInt32BE(16),
    height: buf.readUInt32BE(20),
    colourType: buf.readUInt8(25),
  };
}
const hasAlpha = (colourType: number) => colourType === 4 || colourType === 6;

// Drawn on the page background, so the corners the rounded tile leaves must
// be transparent rather than some colour guessed at export time.
const TRANSPARENT: Array<[string, number]> = [
  ['public/favicon-16.png', 16],
  ['public/favicon-32.png', 32],
  ['public/favicon-48.png', 48],
  ['public/favicon.png', 48],
  ['public/icons/icon-192.png', 192],
  ['public/icons/icon-512.png', 512],
];

// Masked by the platform, so these are full bleed by design: a transparent
// corner under an iOS or Android mask renders black, not as the page behind.
const FULL_BLEED: Array<[string, number]> = [
  ['public/icons/apple-touch-icon.png', 180],
  ['public/icons/icon-maskable-192.png', 192],
  ['public/icons/icon-maskable-512.png', 512],
];

describe('app icons', () => {
  it.each(TRANSPARENT)('%s is %ipx square and keeps an alpha channel', (file, size) => {
    const { width, height, colourType } = pngHeader(read(file));
    expect(width).toBe(size);
    expect(height).toBe(size);
    expect(hasAlpha(colourType)).toBe(true);
  });

  it.each(FULL_BLEED)('%s is %ipx square', (file, size) => {
    const { width, height } = pngHeader(read(file));
    expect(width).toBe(size);
    expect(height).toBe(size);
  });

  it('offers a vector favicon and a PNG at each size a tab strip asks for', () => {
    // The tab strip draws 16 CSS px. One 48px source downscaled to that is
    // what turned the glyph to mud, so each size is declared separately and
    // the vector is offered first for anything that understands it.
    const html = readFileSync(root('index.html'), 'utf8');
    const icons = [...html.matchAll(/<link\s+rel="icon"[^>]*>/g)].map(m => m[0]);

    expect(icons[0]).toContain('image/svg+xml');
    expect(icons[0]).toContain('/favicon.svg');
    for (const size of [16, 32, 48]) {
      expect(icons.some(l => l.includes(`sizes="${size}x${size}"`) && l.includes(`/favicon-${size}.png`))).toBe(true);
    }
  });

  it('ships the root /favicon.ico crawlers probe for', () => {
    // Nothing in the markup points at it; feed readers and link unfurlers
    // request it anyway, and a 404 there shows a blank square.
    const ico = read('public/favicon.ico');
    expect(ico.readUInt16LE(0)).toBe(0);  // reserved
    expect(ico.readUInt16LE(2)).toBe(1);  // 1 = icon, not cursor
    const entries = ico.readUInt16LE(4);
    expect(entries).toBe(3);

    // Byte 0 of each directory entry is the width, with 0 meaning 256.
    const widths = Array.from({ length: entries }, (_, i) => ico.readUInt8(6 + 16 * i));
    expect(widths.sort((a, b) => a - b)).toEqual([16, 32, 48]);
  });

  it('paints the tile in the brand colour the theme-color matches', () => {
    // A tab icon in one colour and a mobile address bar in another reads as
    // two products. Both come from --brand-cyan in src/index.css.
    const css = readFileSync(root('src/index.css'), 'utf8');
    const brand = /--brand-cyan:\s*(#[0-9a-f]{6})/i.exec(css)?.[1]?.toLowerCase();
    expect(brand).toBeTruthy();

    const svg = readFileSync(root('public/favicon.svg'), 'utf8');
    expect(svg.toLowerCase()).toContain(`fill="${brand}"`);

    const html = readFileSync(root('index.html'), 'utf8');
    expect(html.toLowerCase()).toContain(`<meta name="theme-color" content="${brand}" />`);

    const manifest = JSON.parse(readFileSync(root('public/manifest.webmanifest'), 'utf8'));
    expect(String(manifest.theme_color).toLowerCase()).toBe(brand);
  });
});
