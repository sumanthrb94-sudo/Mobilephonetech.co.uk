/**
 * googleImagery — exact-render image URLs for every Google Pixel
 * model in the catalogue.
 *
 * /public/assets/ ships three Pixel photos (Pixel 6, 7a, 8 Pro).
 * Map every Pixel / Pixel a / Pixel XL generation to the closest
 * committed photo so the card always shows a real Pixel shape.
 *
 * Same lookup contract as appleImagery.ts and samsungImagery.ts.
 */

const ASSETS = {
  pixel8Pro:   '/assets/pixel-8-pro.png',
  pixel7a:     '/assets/pixel-7a.png',
  pixel6:      '/assets/pixel-6.png',
  pixel8ProSvg: '/assets/pixel-8-pro-gen.svg',
  pixelBuds:   '/assets/accessory-pixel-buds.svg',
};

const EXACT: Record<string, string> = {
  'Google Pixel 7 Pro - Unlocked': ASSETS.pixel8Pro,
  'Google Pixel 7 - Unlocked':     ASSETS.pixel7a,
  'Google Pixel 7a - Unlocked':    ASSETS.pixel7a,
  'Google Pixel 6 Pro - Unlocked': ASSETS.pixel8Pro,
  'Google Pixel 6  - Unlocked':    ASSETS.pixel6,
  'Google Pixel 6 - Unlocked':     ASSETS.pixel6,
  'Google Pixel 5  - Unlocked':    ASSETS.pixel6,
  'Google Pixel 5 - Unlocked':     ASSETS.pixel6,
};

/** Family rules walked top-down: first match wins. */
const FAMILY_RULES: Array<[RegExp, string]> = [
  // Top-tier Pro → 8 Pro photo
  [/Pixel\s*[8-9].*Pro/i,       ASSETS.pixel8Pro],
  [/Pixel\s*[7-9]\s*Pro/i,      ASSETS.pixel8Pro],
  // a-series → 7a photo
  [/Pixel\s*\d+a/i,             ASSETS.pixel7a],
  // Vanilla Pixel 7 / 8 / 9 → 7a body shape (similar form factor)
  [/Pixel\s*[7-9](?!\s*a)/i,    ASSETS.pixel7a],
  // Older Pixels → 6 photo
  [/Pixel\s*[3-6]/i,            ASSETS.pixel6],
  // Pixel Buds + Watch — fall back to the buds/watch silhouettes
  [/Pixel\s*Buds/i,             ASSETS.pixelBuds],
];

export function resolveGoogleImage(brand: string, model: string): string | null {
  if (brand !== 'Google') return null;
  if (!model) return null;
  if (EXACT[model]) return EXACT[model];
  for (const [re, asset] of FAMILY_RULES) {
    if (re.test(model)) return asset;
  }
  return null;
}
