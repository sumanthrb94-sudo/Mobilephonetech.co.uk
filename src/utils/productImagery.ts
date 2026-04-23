/**
 * productImagery — resolves per-product image URLs against the set of
 * real assets actually on disk in public/assets. If a product's
 * imageUrl points at a file that's missing, the resolver returns null
 * and the calling ProductImage component falls back to a Claude-
 * designed SVG illustration keyed to the product's category.
 *
 * The manifest is built from a one-time audit of public/assets. When
 * new photography drops in, either:
 *   - use an imageUrl whose basename already exists, or
 *   - add the new path to KNOWN_ASSETS below.
 *
 * Keeps the resolver fully static so it works in SSR and during
 * build-time code-gen — no fs.existsSync at runtime, no 404 races.
 */

const KNOWN_ASSETS = new Set<string>([
  // Category hero shots
  '/assets/cat-accessories.png',
  '/assets/cat-smartphones.png',
  '/assets/cat-smartwatches.png',
  '/assets/cat-tablets.png',
  '/assets/quality-inspection.png',

  // Hand-crafted SVG silhouettes already in repo
  '/assets/accessory-airpods.svg',
  '/assets/accessory-buds.svg',
  '/assets/accessory-pixel-buds.svg',
  '/assets/computing-laptop.svg',
  '/assets/gaming-ps5.svg',
  '/assets/gaming-switch.svg',
  '/assets/gaming-xbox.svg',
  '/assets/iphone-15-pro-max-gen.svg',
  '/assets/pixel-8-pro-gen.svg',
  '/assets/samsung-s24-ultra-gen.svg',
  '/assets/smartwatch-apple-watch.svg',
  '/assets/tv-frame-gen.svg',

  // Phone photography
  '/assets/iphone-11.png',
  '/assets/iphone-12.png',
  '/assets/iphone-12-pro.png',
  '/assets/iphone-13.png',
  '/assets/iphone-14-pro.png',
  '/assets/iphone-15-pro-max.png',
  '/assets/motorola-edge-40.png',
  '/assets/motorola-g84.png',
  '/assets/oneplus-9-pro.png',
  '/assets/oneplus-11.png',
  '/assets/oneplus-12.png',
  '/assets/pixel-6.png',
  '/assets/pixel-7a.png',
  '/assets/pixel-8-pro.png',
  '/assets/samsung-s21-fe.png',
  '/assets/samsung-s22.png',
  '/assets/samsung-s23-ultra.png',
  '/assets/samsung-s24-ultra.png',
]);

/**
 * Returns the absolute asset URL if the file is known to exist on disk,
 * or null if the caller should fall back to a synthetic render.
 *
 * Accepts absolute http(s) URLs too — those pass through untouched on
 * the assumption an external image service has its own availability
 * guarantees.
 */
export function resolveImageUrl(url: string | undefined | null): string | null {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) return url;
  if (KNOWN_ASSETS.has(url)) return url;
  return null;
}

/**
 * When no real asset is available, pick the best synthetic category
 * key for the Claude SVG fallback. Biased toward the product's
 * ProductCategory first, falling back to keyword matching on model
 * (which is useful for accessory SKUs whose category is "Accessories"
 * but whose model gives away whether it's earbuds vs charger vs case).
 */
export function fallbackCategoryKey(category?: string, model?: string): string {
  const c = (category || '').toLowerCase();
  const m = (model || '').toLowerCase();
  if (c === 'phones' || c === 'apple' || c === 'samsung' || c === 'google') return 'phones';
  if (c === 'tablets' || c === 'ipads & tabs' || m.includes('ipad') || m.includes('tab')) return 'tablets';
  if (c === 'speakers' || m.includes('speaker') || m.includes('homepod') || m.includes('sonos')) return 'speakers';
  if (c === 'hearables' || m.includes('buds') || m.includes('airpods') || m.includes('headphone')) return 'hearables';
  if (c === 'playables' || c === 'gaming' || m.includes('ps5') || m.includes('xbox') || m.includes('switch') || m.includes('quest')) return 'playables';
  if (c === 'computing' || m.includes('macbook') || m.includes('laptop')) return 'computing';
  if (c === 'smartwatches' || m.includes('watch')) return 'smartwatches';
  if (c === 'accessories' || m.includes('charger') || m.includes('cable') || m.includes('case') || m.includes('powerbank')) return 'accessories';
  return 'default';
}
