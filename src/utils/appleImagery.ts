/**
 * appleImagery — exact-render image URLs for every Apple model in
 * the catalogue.
 *
 * Source priority:
 *   1. Photos already committed to /public/assets/ — fastest, never 404.
 *   2. Apple's marketing CDN (store.storeimages.cdn-apple.com) — public,
 *      CDN-served, stable for years. Each URL points to Apple's own
 *      "select" hero render in a representative finish.
 *
 * Lookup is keyed on the canonical model string used inside data.ts
 * after Kimi's Shopify import (e.g. "iPhone 15 Pro Max", "Apple iPad
 * Air 2022 5th Gen Wifi"). Any Apple model not in the map falls
 * through to the existing brand-logo placeholder via ProductImage.
 *
 * If an Apple CDN URL ever 404s, ProductImage's <img onError> already
 * hot-swaps to the brand-logo placeholder — so the worst case is
 * still graceful.
 */

const APPLE_CDN = 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is';

/** Local /public/assets/ photos already in repo. Cheaper than a CDN
 *  hit, and these are real product photographs. */
const LOCAL: Record<string, string> = {
  'iPhone 11':           '/assets/iphone-11.png',
  'iPhone 12':           '/assets/iphone-12.png',
  'iPhone 12 Pro':       '/assets/iphone-12-pro.png',
  'iPhone 13':           '/assets/iphone-13.png',
  'iPhone 14 Pro':       '/assets/iphone-14-pro.png',
  'iPhone 15 Pro Max':   '/assets/iphone-15-pro-max.png',
};

/** Apple marketing-CDN renders. Pattern is the well-known
 *  `iphone-{family}-finish-select-{yyyymm}-{size}-{color}` — Apple
 *  has used the same URL grammar for ~7 years across launches. */
const APPLE_REMOTE: Record<string, string> = {
  // ── iPhone 17 family ─────────────────────────────────────────────
  'iPhone 17':           `${APPLE_CDN}/iphone-17-finish-select-202509-6-3inch-misterblue`,
  'iPhone 17 Pro':       `${APPLE_CDN}/iphone-17-pro-finish-select-202509-6-3inch-deepblue`,
  'iPhone 17 Pro Max':   `${APPLE_CDN}/iphone-17-pro-max-finish-select-202509-6-9inch-deepblue`,

  // ── iPhone 16 family ─────────────────────────────────────────────
  'iPhone 16':           `${APPLE_CDN}/iphone-16-finish-select-202409-6-1inch-ultramarine`,
  'iPhone 16 Plus':      `${APPLE_CDN}/iphone-16-plus-finish-select-202409-6-7inch-teal`,
  'iPhone 16 Pro':       `${APPLE_CDN}/iphone-16-pro-finish-select-202409-6-3inch-naturaltitanium`,
  'iPhone 16 Pro Max':   `${APPLE_CDN}/iphone-16-pro-max-finish-select-202409-6-9inch-desert-titanium`,
  'iPhone 16e':          `${APPLE_CDN}/iphone-16e-finish-select-202502-6-1inch-black`,

  // ── iPhone 15 family ─────────────────────────────────────────────
  'iPhone 15':           `${APPLE_CDN}/iphone-15-finish-select-202309-6-1inch-blue`,
  'iPhone 15 Plus':      `${APPLE_CDN}/iphone-15-plus-finish-select-202309-6-7inch-pink`,
  'iPhone 15 Pro':       `${APPLE_CDN}/iphone-15-pro-finish-select-202309-6-1inch-naturaltitanium`,

  // ── iPhone 14 family ─────────────────────────────────────────────
  'iPhone 14':           `${APPLE_CDN}/iphone-14-finish-select-202209-6-1inch-blue`,
  'iPhone 14 Plus':      `${APPLE_CDN}/iphone-14-plus-finish-select-202209-6-7inch-purple`,
  'iPhone 14 Pro Max':   `${APPLE_CDN}/iphone-14-pro-max-finish-select-202209-6-7inch-deeppurple`,

  // ── iPhone 13 family ─────────────────────────────────────────────
  'iPhone 13 Mini':      `${APPLE_CDN}/iphone-13-mini-finish-select-202109-5-4inch-blue`,
  'iPhone 13 Pro':       `${APPLE_CDN}/iphone-13-pro-finish-select-202109-6-1inch-sierrablue`,
  'iPhone 13 Pro Max':   `${APPLE_CDN}/iphone-13-pro-max-finish-select-202109-6-7inch-sierrablue`,

  // ── iPhone 12 family (12 + Mini variants) ────────────────────────
  'iPhone 12 Mini':      `${APPLE_CDN}/iphone-12-mini-finish-select-202010-5-4inch-blue`,
  'iPhone 12 Pro Max':   `${APPLE_CDN}/iphone-12-pro-max-finish-select-202010-6-7inch-pacificblue`,

  // ── iPhone 11 family ─────────────────────────────────────────────
  'iPhone 11 Pro':       `${APPLE_CDN}/iphone-11-pro-finish-select-201909-5-8inch-spacegray`,
  'iPhone 11 Pro Max':   `${APPLE_CDN}/iphone-11-pro-max-finish-select-201909-6-5inch-spacegray`,

  // ── iPhone SE / older ────────────────────────────────────────────
  'iPhone SE 2020':      `${APPLE_CDN}/iphone-se-finish-select-202004-black`,
  'iPhone SE 2022':      `${APPLE_CDN}/iphone-se-finish-select-202203-midnight`,
  'iPhone X':            `${APPLE_CDN}/iphone-x-finish-select-201709-5-8inch-spacegray`,
  'iPhone XR':           `${APPLE_CDN}/iphone-xr-select-201809-6-1inch-coral`,
  'iPhone XS':           `${APPLE_CDN}/iphone-xs-finish-select-201809-5-8inch-spacegray`,
  'iPhone XS Max':       `${APPLE_CDN}/iphone-xs-max-finish-select-201809-6-5inch-gold`,
  'iPhone 8':            `${APPLE_CDN}/iphone-8-finish-select-201709-spacegray`,
  'iPhone 8 Plus':       `${APPLE_CDN}/iphone-8-plus-finish-select-201709-spacegray`,

  // ── iPad family ─────────────────────────────────────────────────
  'Apple iPad 2022 10th Gen Wifi + Cellular': `${APPLE_CDN}/ipad-10gen-finish-select-202210-blue`,
  'Apple iPad 2021 9th Gen Wifi':             `${APPLE_CDN}/ipad-9gen-finish-select-202109-spacegray`,
  'Apple iPad 2020 8th Gen Wifi + Cellular':  `${APPLE_CDN}/ipad-8gen-finish-select-202009-spacegray`,
  'Apple iPad 2019 7th Gen Wifi + Cellular':  `${APPLE_CDN}/ipad-7gen-finish-select-201909-spacegray`,
  'Apple iPad 2018 7th Gen Wifi + Cellular':  `${APPLE_CDN}/ipad-201803-finish-select-spacegray`,
  'Apple iPad 2017 5th Gen Wifi':             `${APPLE_CDN}/ipad-201703-finish-select-spacegray`,

  'Apple iPad Air 2022 5th Gen Wifi':          `${APPLE_CDN}/ipad-air-finish-select-202203-blue`,
  'Apple iPad Air 2020 4th Gen Wifi':          `${APPLE_CDN}/ipad-air-finish-select-202010-skyblue`,
  'Apple iPad Air 2019 3rd Gen Wifi':          `${APPLE_CDN}/ipad-air-201903-finish-select-spacegray`,

  'Apple iPad Mini 2021 6th Gen Wifi + Cellular': `${APPLE_CDN}/ipad-mini-finish-select-202109-purple`,
  'Apple iPad Mini 2019 5th Gen Wifi':            `${APPLE_CDN}/ipad-mini-finish-select-201903-spacegray`,

  'Apple iPad Pro 2022 6th Gen 12.9-inch WiFi + Cellular': `${APPLE_CDN}/ipad-pro-12-finish-select-202210-spacegray`,
  'Apple iPad Pro 2021 5th Gen 12.9-inch WiFi':            `${APPLE_CDN}/ipad-pro-12-finish-select-202104-spacegray`,
  'Apple iPad Pro 2020 2nd Gen 11-inch WiFi Cellular':     `${APPLE_CDN}/ipad-pro-11-finish-select-202003-spacegray`,
  'Apple iPad Pro 2018 12.9" WiFi':                        `${APPLE_CDN}/ipad-pro-12-finish-select-201810-spacegray`,
  'Apple iPad Pro 2017 2nd Gen 10.5-inch WiFi':            `${APPLE_CDN}/ipad-pro-10-finish-select-201706-rosegold`,
};

/**
 * Family-fallback resolver: for any iPhone we don't have an exact
 * mapping for, return the closest committed `/assets/` photo so the
 * card still shows a real iPhone shape rather than a generic logo.
 */
function familyFallback(model: string): string | null {
  if (/iPhone\s*(15|16|17)/.test(model)) return '/assets/iphone-15-pro-max.png';
  if (/iPhone\s*14/.test(model))         return '/assets/iphone-14-pro.png';
  if (/iPhone\s*13/.test(model))         return '/assets/iphone-13.png';
  if (/iPhone\s*12\s*Pro/i.test(model))  return '/assets/iphone-12-pro.png';
  if (/iPhone\s*12/.test(model))         return '/assets/iphone-12.png';
  if (/iPhone\s*11/.test(model))         return '/assets/iphone-11.png';
  return null;
}

/**
 * Resolve an Apple model name to its best-known image URL. Returns
 * null if no override exists; the caller's normal pipeline (real
 * photo path on disk -> brand-logo placeholder) takes over.
 */
export function resolveAppleImage(brand: string, model: string): string | null {
  if (brand !== 'Apple') return null;
  if (!model) return null;
  return LOCAL[model] ?? APPLE_REMOTE[model] ?? familyFallback(model);
}
