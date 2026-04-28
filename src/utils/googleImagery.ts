const ASSETS = {
  pixel8Pro:  '/assets/pixel-8-pro.png',
  pixel7a:    '/assets/pixel-7a.png',
  pixel6:     '/assets/pixel-6.png',
  pixelBuds:  '/assets/accessory-pixel-buds.svg',
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

const FAMILY_RULES: Array<[RegExp, string]> = [
  [/Pixel\s*[8-9].*Pro/i,    ASSETS.pixel8Pro],
  [/Pixel\s*[7-9]\s*Pro/i,   ASSETS.pixel8Pro],
  [/Pixel\s*\d+a/i,          ASSETS.pixel7a],
  [/Pixel\s*[7-9](?!\s*a)/i, ASSETS.pixel7a],
  [/Pixel\s*[3-6]/i,         ASSETS.pixel6],
  [/Pixel\s*Buds/i,          ASSETS.pixelBuds],
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
