import { useState } from 'react';
import { resolveImageUrl, fallbackCategoryKey } from '../utils/productImagery';
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
  /** Optional — improves the synthetic fallback's category matching. */
  category?: string;
  alt?: string;
  /** Forces the synthetic fallback even when a real asset exists. */
  variant?: 'primary' | 'synthetic';
}

/**
 * ProductImage — resolves a product's artwork in four tiers:
 *   1. a real photo on disk or a trusted CDN (the Shopify product shot),
 *   2. a curated brand-CDN render (Apple's marketing CDN for every
 *      iPhone / iPad model in the catalogue — see appleImagery.ts),
 *   3. the vendor's official brand logo via simpleicons.org for
 *      phones / tablets / consoles / foldables without a bespoke shot,
 *   4. the Claude-designed category silhouette for generic accessories.
 *
 * Each tier swaps to the next via <img onError>, so a broken asset
 * path, a CDN outage, or a missing simpleicons slug always degrades
 * gracefully instead of leaving a broken-image glyph on the page.
 */

const BRANDED_BRANDS = new Set([
  'apple', 'samsung', 'google', 'oneplus', 'motorola',
  'sony', 'microsoft', 'nintendo', 'meta',
  'xiaomi', 'huawei', 'nothing',
]);

// Known placeholder hosts that produce text-only images — always
// prefer the brand-logo fallback over one of these.
const PLACEHOLDER_HOST_RE = /^https?:\/\/(placehold\.co|placeholder\.com|via\.placeholder\.com|dummyimage\.com)/i;

export function ProductImage({ imageUrl, alt, brand, model, category, variant }: ProductImageProps) {
  const isPlaceholderUrl = typeof imageUrl === 'string' && PLACEHOLDER_HOST_RE.test(imageUrl);
  const [photoFailed, setPhotoFailed] = useState(false);
  const [brandFailed, setBrandFailed] = useState(false);

  // Tier 1 — real product shot already on disk / trusted CDN. Only
  // takes precedence when the imageUrl isn't a known placeholder host;
  // those text "Apple iPhone 15 Front" boxes rendered as ugly black
  // tiles on every catalogue surface.
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

  // Tier 2 — curated brand-CDN / local-asset render. Apple ships
  // marketing-CDN URLs; Samsung + Google route to the committed
  // /public/assets/ photos via family-fallback rules. Skip if the
  // resolved URL has already 404'd in this session.
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

  // Tier 3 — branded logo placeholder for vendor-identifiable products.
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

  // Tier 4 — category illustration for everything else.
  return (
    <div aria-label={alt} style={{ width: '100%', height: '100%' }}>
      <CategoryIllustration category={fallbackCategoryKey(category, model)} rounded={false} />
    </div>
  );
}

export default ProductImage;
