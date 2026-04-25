/**
 * samsungImagery — exact-render image URLs for every Samsung Galaxy
 * model in the catalogue.
 *
 * We control 4 product photos in /public/assets/ (Galaxy S21 FE, S22,
 * S23 Ultra, S24 Ultra) plus the brand silhouette SVGs. This map
 * routes every Galaxy / Note / Z Fold / Z Flip / Tab S model to the
 * closest committed photo so cards always render an actual Samsung
 * device shape rather than the brand-logo placeholder.
 *
 * Same lookup contract as appleImagery.ts so ProductImage can call
 * either resolver with the same shape.
 */

const ASSETS = {
  s24Ultra:    '/assets/samsung-s24-ultra.png',
  s23Ultra:    '/assets/samsung-s23-ultra.png',
  s22:         '/assets/samsung-s22.png',
  s21Fe:       '/assets/samsung-s21-fe.png',
  s24UltraSvg: '/assets/samsung-s24-ultra-gen.svg',
  tabS9:       '/assets/samsung-tab-s9.svg',
};

/** Exact model-string overrides — when we have a definitive photo
 *  match for a specific SKU. */
const EXACT: Record<string, string> = {
  'Samsung Galaxy S23 Ultra - Unlocked': ASSETS.s23Ultra,
  'Samsung Galaxy S22 5G - Unlocked':    ASSETS.s22,
  'Samsung Galaxy S22+ 5G - Unlocked':   ASSETS.s22,
  'Samsung Galaxy S22 Ultra 5G - Unlocked': ASSETS.s23Ultra,
  'Samsung Galaxy S20 FE - Unlocked':    ASSETS.s21Fe,
  'Samsung Galaxy S20 FE -  Unlocked':   ASSETS.s21Fe,
  'Samsung Galaxy S20 FE 5G - Unlocked': ASSETS.s21Fe,
};

/** Family rules walked top-down: first match wins. */
const FAMILY_RULES: Array<[RegExp, string]> = [
  // Galaxy S series — newer Ultra → s24Ultra, mid → s23Ultra, older → s22
  [/Galaxy\s*S2[3-9].*Ultra/i,  ASSETS.s24Ultra],
  [/Galaxy\s*S2[2-3]/i,         ASSETS.s23Ultra],
  [/Galaxy\s*S2[0-1]/i,         ASSETS.s22],
  [/Galaxy\s*S1[0-9]/i,         ASSETS.s22],
  [/Galaxy\s*S\d.*FE/i,         ASSETS.s21Fe],
  // Note series → use Ultra body shape
  [/Galaxy\s*Note\s*\d+\s*Ultra/i, ASSETS.s24Ultra],
  [/Galaxy\s*Note\s*\d+/i,         ASSETS.s23Ultra],
  // Z Fold / Flip — closest portrait we have
  [/Galaxy\s*Z\s*Fold/i,         ASSETS.s23Ultra],
  [/Galaxy\s*Z\s*Flip/i,         ASSETS.s22],
  // A series — generic phone body
  [/Galaxy\s*A\d+/i,             ASSETS.s21Fe],
  // Tablets — use the tab silhouette SVG so the aspect is right
  [/Galaxy\s*Tab\s*S/i,          ASSETS.tabS9],
];

export function resolveSamsungImage(brand: string, model: string): string | null {
  if (brand !== 'Samsung') return null;
  if (!model) return null;
  if (EXACT[model]) return EXACT[model];
  for (const [re, asset] of FAMILY_RULES) {
    if (re.test(model)) return asset;
  }
  return null;
}
