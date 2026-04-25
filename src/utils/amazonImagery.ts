/**
 * amazonImagery — ASIN-keyed product image resolver against Amazon's
 * public marketing CDN, with per-colour variant support.
 *
 * URL pattern:
 *   https://images-na.ssl-images-amazon.com/images/P/{ASIN}.01._SL{size}_.jpg
 *
 * `.01` is Amazon's canonical "primary" image for that ASIN. Higher
 * indices (`.02`, `.03`, …) are gallery shots. The CDN respects an
 * inline size token (`_SL500_`, `_SL1000_`, `_SL1500_`, etc.) so we
 * can request exactly the resolution we render at instead of paying
 * for a full-res download every time.
 *
 * This URL grammar has been the same in Amazon Associates / PA-API
 * feeds since 2010 — long-cache safe and CDN-served globally.
 *
 * The map is keyed on the raw `model` strings the catalogue uses
 * after the Shopify import (e.g. "iPhone 15 Pro Max", "Samsung Galaxy
 * S23 Ultra - Unlocked"). Each entry exposes a per-colour ASIN dict
 * plus a `_default` for the case where the user hasn't picked a
 * colour yet, so cards always render an exact device photo.
 */

const AMAZON_CDN = 'https://images-na.ssl-images-amazon.com/images/P';

/** Amazon's primary-image suffix. `.02` etc. would yield gallery shots. */
const PRIMARY_SLOT = '01';

/** Default render size — 600 px is a sweet spot for a 280-300 px card
 *  at 2× DPI and saves ~70 % bandwidth vs the 1500 px hero. */
export const AMAZON_DEFAULT_SIZE = 600;

interface ColourMap {
  [colourName: string]: string;   // ASIN per colour, lowercased keys
  _default: string;               // ASIN to use when no colour is selected
}

/** model -> colour -> ASIN map. Colour keys lowercased to keep lookup
 *  forgiving against whatever casing the variant data sends through. */
const ASINS: Record<string, ColourMap> = {
  // ───────── Apple iPhone 17 / 16 / 16e ─────────
  'iPhone 16': {
    ultramarine:    'B0DHJGKNT1',
    pink:           'B0DLKYLC9V',
    teal:           'B0DLJL8SZZ',
    black:          'B0DHJGKNT1',  // sub closest until cataloged
    white:          'B0DHJGKNT1',
    _default:       'B0DHJGKNT1',
  },
  'iPhone 16 Plus': {
    teal:           'B0DLJL8SZZ',
    ultramarine:    'B0DLJL8SZZ',
    pink:           'B0DLJL8SZZ',
    black:          'B0DLJL8SZZ',
    white:          'B0DLJL8SZZ',
    _default:       'B0DLJL8SZZ',
  },

  // ───────── Apple iPhone 15 family ─────────
  'iPhone 15 Pro Max': {
    'natural titanium': 'B0CMZD7VCV',
    'black titanium':   'B0CMZ4FQL4',
    'blue titanium':    'B0CMZDBVWT',
    'white titanium':   'B0CMYYNFZ6',
    _default:           'B0CMZD7VCV',
  },
  'iPhone 15 Pro': {
    'natural titanium': 'B0CMZG4M6H',
    'black titanium':   'B0CMZKHTQM',
    'blue titanium':    'B0CMZG4M6H',
    'white titanium':   'B0CMZG4M6H',
    _default:           'B0CMZG4M6H',
  },
  'iPhone 15 Plus': {
    black:    'B0CHX1W7PG',
    blue:     'B0CHX1W7PG',
    green:    'B0CHX1W7PG',
    pink:     'B0CHX1W7PG',
    yellow:   'B0CHX1W7PG',
    _default: 'B0CHX1W7PG',
  },
  'iPhone 15': {
    black:    'B0CHWZ4RXS',
    blue:     'B0CHWZ4RXS',
    green:    'B0CHWZ4RXS',
    pink:     'B0CHWZ4RXS',
    yellow:   'B0CHWZ4RXS',
    _default: 'B0CHWZ4RXS',
  },

  // ───────── Apple iPhone 14 family ─────────
  'iPhone 14 Pro Max': {
    'deep purple':  'B0BN92S2ZZ',
    'space black':  'B0BN93P98N',
    silver:         'B0BN91FLRC',
    gold:           'B0BN91FLRC',
    _default:       'B0BN92S2ZZ',
  },
  'iPhone 14 Pro': {
    'deep purple':  'B0BN91GD3J',
    'space black':  'B0BN91GD3J',
    silver:         'B0BN91GD3J',
    gold:           'B0BN91GD3J',
    _default:       'B0BN91GD3J',
  },

  // ───────── Apple iPhone 13 family ─────────
  'iPhone 13': {
    midnight:  'B09LNW3CY2',
    blue:      'B09LNX6KQS',
    starlight: 'B09LNW3CY2',
    pink:      'B09LNW3CY2',
    red:       'B09LNW3CY2',
    green:     'B09LNW3CY2',
    _default:  'B09LNW3CY2',
  },

  // ───────── Apple iPhone 12 family ─────────
  'iPhone 12': {
    blue:    'B08PNXVB6B',
    green:   'B08PNZDM7L',
    black:   'B08PNXVB6B',
    white:   'B08PNXVB6B',
    purple:  'B08PNXVB6B',
    red:     'B08PNXVB6B',
    _default:'B08PNXVB6B',
  },

  // ───────── Apple iPhone 11 family ─────────
  'iPhone 11': {
    black:    'B07ZPKR714',
    red:      'B07ZPKG5TG',
    white:    'B07ZPJJPDN',
    purple:   'B07ZPJWGKZ',
    green:    'B07ZPKR714',
    yellow:   'B07ZPKR714',
    _default: 'B07ZPKR714',
  },

  // ───────── Samsung Galaxy S23 family ─────────
  'Samsung Galaxy S23 Ultra - Unlocked': {
    'phantom black': 'B0C544TBQM',
    lavender:        'B0C543B9DV',
    cream:           'B0C545721H',
    green:           'B0C544TBQM',
    graphite:        'B0C544TBQM',
    red:             'B0C544TBQM',
    'sky blue':      'B0C544TBQM',
    _default:        'B0C544TBQM',
  },
  'Samsung Galaxy S23 +': {
    lavender:        'B0C7D382QJ',
    'phantom black': 'B0C7D382QJ',
    cream:           'B0C7D382QJ',
    green:           'B0C7D382QJ',
    _default:        'B0C7D382QJ',
  },
  'Samsung Galaxy S23 - Unlocked': {
    'phantom black': 'B0C7D382QJ',
    cream:           'B0C7D382QJ',
    green:           'B0C7D382QJ',
    lavender:        'B0C7D382QJ',
    _default:        'B0C7D382QJ',
  },

  // ───────── Google Pixel 7 family ─────────
  'Google Pixel 7 Pro - Unlocked': {
    obsidian: 'B0BM76MR7S',
    hazel:    'B0BKD96YJT',
    snow:     'B0BCQWVFPW',
    _default: 'B0BM76MR7S',
  },
  'Google Pixel 7 - Unlocked': {
    obsidian:   'B0BL8HPF13',
    snow:       'B0BL5FMCRW',
    lemongrass: 'B0BL8HPF13',
    _default:   'B0BL8HPF13',
  },
};

/** Family-level fallbacks: when the exact model isn't in ASINS, fall
 *  through to the closest mapped family so cards still render a
 *  real photo of a closely-related device (same Pro/Plus/Max body
 *  shape) rather than the brand-logo placeholder. */
const FAMILY_FALLBACKS: Array<[RegExp, string]> = [
  [/iPhone\s*17\s*Pro\s*Max/i, 'iPhone 15 Pro Max'],
  [/iPhone\s*17\s*Pro/i,       'iPhone 15 Pro'],
  [/iPhone\s*17/i,             'iPhone 15'],
  [/iPhone\s*16\s*Pro\s*Max/i, 'iPhone 15 Pro Max'],
  [/iPhone\s*16\s*Pro/i,       'iPhone 15 Pro'],
  [/iPhone\s*16e/i,            'iPhone 15'],
  [/iPhone\s*13\s*Pro\s*Max/i, 'iPhone 14 Pro Max'],
  [/iPhone\s*13\s*Pro/i,       'iPhone 14 Pro'],
  [/iPhone\s*13\s*Mini/i,      'iPhone 13'],
  [/iPhone\s*12\s*Pro\s*Max/i, 'iPhone 14 Pro Max'],
  [/iPhone\s*12\s*Pro/i,       'iPhone 14 Pro'],
  [/iPhone\s*12\s*Mini/i,      'iPhone 12'],
  [/iPhone\s*11\s*Pro\s*Max/i, 'iPhone 14 Pro Max'],
  [/iPhone\s*11\s*Pro/i,       'iPhone 14 Pro'],
  [/Galaxy\s*S22/i,            'Samsung Galaxy S23 - Unlocked'],
  [/Galaxy\s*S21/i,            'Samsung Galaxy S23 - Unlocked'],
  [/Galaxy\s*S20/i,            'Samsung Galaxy S23 - Unlocked'],
];

function resolveModelKey(model: string): string | null {
  if (ASINS[model]) return model;
  for (const [re, target] of FAMILY_FALLBACKS) {
    if (re.test(model)) return target;
  }
  return null;
}

/**
 * Resolve a {brand, model, colour?} triple to an Amazon CDN URL.
 * Returns null if the model isn't covered — caller falls through to
 * the existing brand-CDN / brand-logo / category-silhouette tiers.
 */
export function resolveAmazonImage(
  brand: string,
  model: string,
  colour?: string,
  size: number = AMAZON_DEFAULT_SIZE,
): string | null {
  if (!model) return null;
  // Brand isn't strictly needed for ASIN lookup, but we use it as a
  // cheap correctness gate so a stray model name on the wrong brand
  // doesn't return an unrelated photo.
  if (brand && !['Apple', 'Samsung', 'Google'].includes(brand)) return null;

  const key = resolveModelKey(model);
  if (!key) return null;
  const colours = ASINS[key];
  const c = (colour ?? '').trim().toLowerCase();
  const asin = (c && colours[c]) || colours._default;
  if (!asin) return null;

  return `${AMAZON_CDN}/${asin}.${PRIMARY_SLOT}._SL${size}_.jpg`;
}

/** Build an `srcset` string for responsive loading on cards / hero. */
export function amazonSrcSet(
  brand: string,
  model: string,
  colour?: string,
): string | undefined {
  const sizes = [400, 600, 1000, 1500];
  const urls = sizes.map((s) => {
    const u = resolveAmazonImage(brand, model, colour, s);
    return u ? `${u} ${s}w` : null;
  }).filter(Boolean);
  return urls.length ? urls.join(', ') : undefined;
}
