import { useState } from 'react';
import { resolveImageUrl, fallbackCategoryKey } from '../utils/productImagery';
import { resolveAmazonImage, amazonSrcSet } from '../utils/amazonImagery';
import { resolveAppleImage } from '../utils/appleImagery';
import { resolveSamsungImage } from '../utils/samsungImagery';
import { resolveGoogleImage } from '../utils/googleImagery';
import CategoryIllustration from './CategoryIllustration';
import BrandLogoPlaceholder from './BrandLogoPlaceholder';

export interface ProductImageProps {
  brand: string;
  model: string;
  storage?: string;
  imageUrl: string;
  /** Optional — when present, the Amazon resolver picks the colour-matched ASIN. */
  color?: string;
  /** Optional — improves the synthetic fallback's category matching. */
  category?: string;
  alt?: string;
  /** Forces the synthetic fallback even when a real asset exists. */
  variant?: 'primary' | 'synthetic';
  /** Optional render hint — defaults to 'card' (smaller srcset upper bound). */
  context?: 'card' | 'hero';
}

/**
 * ProductImage — five-tier resolution with graceful onError handoff:
 *
 *   1. Real photo on disk / trusted CDN (Shopify product shot).
 *   2. Amazon-CDN ASIN render — colour-matched per variant when a
 *      colour is provided, falls back to `_default` otherwise.
 *      Includes srcset for responsive loading.
 *   3. Per-brand fallback resolver (Apple marketing CDN, Samsung +
 *      Google routed to local /assets/ via family rules).
 *   4. Brand-logo placeholder (simpleicons.org).
 *   5. Category silhouette (Claude SVG).
 *
 * Each tier swaps to the next via <img onError>, so a CDN outage,
 * a missing slug or a corporate-network block always degrades into
 * a clean fallback instead of a broken-image glyph.
 */

const BRANDED_BRANDS = new Set([
  'apple', 'samsung', 'google', 'oneplus', 'motorola',
  'sony', 'microsoft', 'nintendo', 'meta',
  'xiaomi', 'huawei', 'nothing',
]);

const PLACEHOLDER_HOST_RE = /^https?:\/\/(placehold\.co|placeholder\.com|via\.placeholder\.com|dummyimage\.com)/i;

export function ProductImage({
  imageUrl, alt, brand, model, color, category, variant, context = 'card',
}: ProductImageProps) {
  const isPlaceholderUrl = typeof imageUrl === 'string' && PLACEHOLDER_HOST_RE.test(imageUrl);
  const [photoFailed, setPhotoFailed] = useState(false);
  const [amazonFailed, setAmazonFailed] = useState(false);
  const [brandFailed, setBrandFailed] = useState(false);

  // Tier 1 — real product shot already on disk / trusted CDN.
  const resolved =
    variant === 'synthetic' || isPlaceholderUrl || photoFailed
      ? null
      : resolveImageUrl(imageUrl);

  if (resolved) {
    return (
      <img
        src={resolved}
        alt={alt ?? ''}
        loading="lazy"
        decoding="async"
        onError={() => setPhotoFailed(true)}
        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
      />
    );
  }

  // Tier 2 — Amazon ASIN render, colour-matched.
  const amazonSize = context === 'hero' ? 1500 : 600;
  const amazonUrl = !amazonFailed
    ? resolveAmazonImage(brand, model, color, amazonSize)
    : null;
  if (amazonUrl) {
    return (
      <img
        src={amazonUrl}
        srcSet={amazonSrcSet(brand, model, color)}
        sizes={context === 'hero' ? '(min-width: 1024px) 600px, 100vw' : '(min-width: 1024px) 280px, 50vw'}
        alt={alt ?? `${brand} ${model}${color ? ` in ${color}` : ''}`}
        loading="lazy"
        decoding="async"
        onError={() => setAmazonFailed(true)}
        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
      />
    );
  }

  // Tier 3 — per-brand resolver (Apple CDN / local family fallback).
  const brandUrl = !brandFailed
    ? (resolveAppleImage(brand, model)
       ?? resolveSamsungImage(brand, model)
       ?? resolveGoogleImage(brand, model))
    : null;
  if (brandUrl) {
    return (
      <img
        src={brandUrl}
        alt={alt ?? `${brand} ${model}`}
        loading="lazy"
        decoding="async"
        onError={() => setBrandFailed(true)}
        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
      />
    );
  }

  // Tier 4 — brand-logo placeholder for vendor-identifiable products.
  const brandKey = (brand || '').trim().toLowerCase();
  if (BRANDED_BRANDS.has(brandKey)) {
    return (
      <BrandLogoPlaceholder
        brand={brand}
        model={model}
        category={fallbackCategoryKey(category, model)}
        alt={alt}
      />
    );
  }

  // Tier 5 — category illustration for everything else.
  return (
    <div aria-label={alt} style={{ width: '100%', height: '100%' }}>
      <CategoryIllustration category={fallbackCategoryKey(category, model)} rounded={false} />
    </div>
  );
}

export default ProductImage;
