import { describe, it, expect } from 'vitest';
import {
  colourHex, knownColourHex, deliberateHex, storedSwatch, FALLBACK_HEX,
} from '../../utils/deviceColors';

/**
 * Swatch colours by finish name. The palette used to be one exact lookup, so
 * any name it had not seen painted the generic grey — all three finishes of
 * the Galaxy S25 Edge came out the same #888888.
 */

const rgb = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
};
const luma = (hex: string) => { const { r, g, b } = rgb(hex); return 0.299 * r + 0.587 * g + 0.114 * b; };
const bluish = (hex: string) => { const { r, g, b } = rgb(hex); return b > r + 15 && b >= g; };
const greenish = (hex: string) => { const { r, g, b } = rgb(hex); return g > r && g > b; };

/** Every colour name in the live catalogue (variant colours and colorOptions). */
const CATALOGUE_COLOURS = [
  '(PRODUCT)RED', 'Alpine Green', 'Black', 'Black Titanium', 'Blue', 'Blue Titanium', 'Burgundy',
  'Charcoal', 'Cloud White', 'Cosmic Orange', 'Cream', 'Dark Bronze', 'Deep Blue', 'Deep Purple',
  'Desert Titanium', 'Glacier', 'Gold', 'Graphite', 'Gray', 'Gray Green', 'Green', 'Grey',
  'Icy Blue', 'Jet Black', 'Lavender', 'Light Gold', 'Lilac', 'Midnight', 'Mint', 'Mist Blue',
  'Natural', 'Natural Titanium', 'Navy', 'Olive', 'Orange', 'Pacific Blue', 'Pink', 'Purple',
  'Red', 'Rose Gold', 'Sage', 'Sierra Blue', 'Silver', 'Silver Shadow', 'Sky Blue', 'Slate',
  'Soft Pink', 'Space Black', 'Space Grey', 'Starlight', 'Teal', 'Titanium Black',
  'Titanium Grey', 'Titanium Icy Blue', 'Titanium Jet Black', 'Titanium Silver',
  'Titanium Silverblue', 'Titanium Whitesilver', 'Ultramarine', 'Violet', 'White',
  'White Titanium', 'Yellow',
];

/** The finishes of one listing, which must be told apart from each other. */
const LISTINGS: Record<string, string[]> = {
  'Galaxy S25 Edge': ['Titanium Silver', 'Titanium Jet Black', 'Titanium Icy Blue'],
  'Galaxy S25': ['Icy Blue', 'Mint', 'Navy', 'Silver Shadow'],
  'Galaxy S25 FE': ['Grey', 'Jet Black', 'Navy', 'Icy Blue'],
  'Galaxy S25 Ultra': ['Titanium Black', 'Titanium Grey', 'Titanium Silverblue', 'Titanium Whitesilver'],
  'Galaxy A57 5G': ['Navy', 'Gray', 'Lilac', 'Icy Blue'],
  'Galaxy A37 5G': ['Charcoal', 'Lavender', 'White', 'Gray Green'],
  'Galaxy S21 FE': ['Black', 'Blue', 'Green', 'Grey', 'Lavender', 'Olive', 'Purple', 'Violet', 'White'],
  'Pixel 9a': ['Black', 'Pink', 'Purple', 'White'],
  'iPhone 16 Pro': ['Black Titanium', 'White Titanium', 'Natural Titanium', 'Desert Titanium'],
  'iPhone 17 Pro': ['Cosmic Orange', 'Deep Blue', 'Silver'],
};

describe('colourHex — Galaxy S25 Edge', () => {
  const edge = LISTINGS['Galaxy S25 Edge'];

  it('gives each finish its own colour rather than the fallback grey', () => {
    const hexes = edge.map(n => colourHex(n));
    expect(hexes).toEqual(['#c4c6c9', '#1b1b1d', '#adc8e2']);
    for (const h of hexes) expect(h).not.toBe(FALLBACK_HEX);
    expect(new Set(hexes).size).toBe(3);
  });

  it('paints silver light, jet black dark and icy blue blue', () => {
    expect(luma(colourHex('Titanium Silver'))).toBeGreaterThan(180);
    expect(luma(colourHex('Titanium Jet Black'))).toBeLessThan(40);
    expect(bluish(colourHex('Titanium Icy Blue'))).toBe(true);
  });

  it('does the same with the brand passed, and as a known colour', () => {
    for (const n of edge) {
      expect(colourHex(n, 'Samsung')).toBe(colourHex(n));
      expect(knownColourHex(n)).toBe(colourHex(n));
    }
  });

  it('reads the colour word, not "titanium", when the exact name is not listed', () => {
    // Samsung's own spelling runs the words together.
    expect(colourHex('Titanium Jetblack')).toBe(colourHex('Titanium Jet Black'));
    expect(colourHex('Titanium Icyblue')).toBe(colourHex('Titanium Icy Blue'));
    expect(colourHex('TITANIUM  ICY-BLUE')).toBe(colourHex('Titanium Icy Blue'));
    // Names with no entry of their own land on the colour they end with.
    expect(colourHex('Titanium Sky Blue')).toBe(colourHex('Sky Blue'));
    expect(colourHex('Titanium Mint')).toBe(colourHex('Mint'));
    expect(colourHex('Ceramic Icy Blue')).toBe(colourHex('Icy Blue'));
  });
});

describe('colourHex — names the palette did not know', () => {
  it('places the catalogue names that used to fall back to grey', () => {
    expect(colourHex('Silver Shadow')).toBe('#a9abae');
    expect(colourHex('Lilac')).toBe('#c5b3db');
    expect(colourHex('Gray Green')).toBe(colourHex('Grey Green'));
    expect(colourHex('Titanium Grey')).toBe(colourHex('Titanium Gray'));
    expect(greenish(colourHex('Gray Green'))).toBe(true);
  });

  it('splits run-together Samsung names', () => {
    expect(colourHex('Pinkgold')).toBe(colourHex('Pink Gold'));
    expect(colourHex('Titanium Pinkgold')).toBe('#e5c8bc');
    expect(colourHex('Titanium Jadegreen')).toBe('#9db7a6');
    expect(colourHex('Blueblack')).toBe('#232a36');
    expect(colourHex('Coralred')).toBe('#d6675d');
    expect(colourHex('Icyblue')).toBe(colourHex('Icy Blue'));
  });

  it('falls back on colour keywords', () => {
    expect(greenish(colourHex('Emerald Titanium'))).toBe(true);
    expect(luma(colourHex('Phantom Onyx'))).toBeLessThan(40);
    expect(luma(colourHex('Pearl'))).toBeGreaterThan(200);
    expect(colourHex('Champagne Gold')).toBe(colourHex('Gold'));
    expect(colourHex('Champagne')).not.toBe(FALLBACK_HEX);
    expect(colourHex('PRODUCT(RED)')).toBe(colourHex('(PRODUCT)RED'));
  });

  it('shades a colour by the words around it', () => {
    const blue = colourHex('Blue');
    expect(luma(colourHex('Midnight Blue'))).toBeLessThan(luma(blue));
    expect(luma(colourHex('Baby Blue'))).toBeGreaterThan(luma(blue));
    expect(bluish(colourHex('Midnight Blue'))).toBe(true);
    expect(bluish(colourHex('Baby Blue'))).toBe(true);
  });

  it('treats a bare material as metal, not as unknown', () => {
    expect(colourHex('Titanium')).not.toBe(FALLBACK_HEX);
    expect(knownColourHex('Titanium')).not.toBeNull();
  });

  it('keeps exact names exactly as listed', () => {
    expect(colourHex('Blue Titanium')).toBe('#3d5a7a');
    expect(colourHex('Deep Blue')).toBe('#1f3a5f');
    expect(colourHex('Icy Blue')).toBe('#c7dbe9');
    expect(colourHex('Rose Gold')).toBe('#dabfb1');
    expect(colourHex('Titanium Silverblue')).toBe('#a9b8c8');
    expect(colourHex('(PRODUCT)RED')).toBe('#bf0013');
  });

  it('still falls back for a name with no colour in it', () => {
    expect(colourHex('Zorblax')).toBe(FALLBACK_HEX);
    expect(colourHex('Zorblax', 'Samsung')).toBe('#1a1a1a');
    expect(colourHex(undefined)).toBe(FALLBACK_HEX);
    expect(colourHex('   ')).toBe(FALLBACK_HEX);
    expect(colourHex('constructor')).toBe(FALLBACK_HEX);
    expect(colourHex('_samsung')).toBe(FALLBACK_HEX);
    expect(knownColourHex('Zorblax')).toBeNull();
  });
});

describe('colourHex — the live catalogue', () => {
  it.each(CATALOGUE_COLOURS)('places "%s"', name => {
    expect(knownColourHex(name)).not.toBeNull();
    expect(colourHex(name)).not.toBe(FALLBACK_HEX);
    expect(colourHex(name)).toMatch(/^#[0-9a-f]{6}$/);
  });

  it.each(Object.entries(LISTINGS))('tells the %s finishes apart', (_, finishes) => {
    const hexes = finishes.map(n => colourHex(n));
    expect(new Set(hexes).size).toBe(finishes.length);
  });
});

describe('stored swatches', () => {
  it('honours a hex set on purpose', () => {
    expect(deliberateHex('#E3E4E5')).toBe('#e3e4e5');
    expect(deliberateHex(' #abc ')).toBe('#aabbcc');
  });

  it('ignores placeholder greys, empty values and names that are not hex', () => {
    expect(deliberateHex('#888888')).toBeUndefined();
    expect(deliberateHex('#888')).toBeUndefined();
    expect(deliberateHex(FALLBACK_HEX.toUpperCase())).toBeUndefined();
    expect(deliberateHex('')).toBeUndefined();
    expect(deliberateHex(undefined)).toBeUndefined();
    expect(deliberateHex('Blue')).toBeUndefined();
  });

  it('lets a placeholder lose to the colour the name gives', () => {
    const variants = [
      { color: 'Titanium Icy Blue', colorHex: '#888888' },
      { color: 'Titanium Silver', colorHex: '#c0c0c0' },
      { color: ' Titanium Jet Black ' },
    ];
    expect(storedSwatch(variants, 'Titanium Icy Blue')).toBeUndefined();
    expect(storedSwatch(variants, 'Titanium Icy Blue') ?? colourHex('Titanium Icy Blue')).toBe('#adc8e2');
    expect(storedSwatch(variants, 'Titanium Silver')).toBe('#c0c0c0');
    expect(storedSwatch(variants, 'Titanium Jet Black')).toBeUndefined();
    expect(storedSwatch(undefined, 'Black')).toBeUndefined();
  });

  it('takes the first deliberate hex among a finish\'s configurations', () => {
    const variants = [
      { color: 'Blue', colorHex: '#888888' },
      { color: 'Blue', colorHex: '#a6bccf' },
    ];
    expect(storedSwatch(variants, 'Blue')).toBe('#a6bccf');
  });
});
