import { useState } from 'react';
import { resolveImageUrl, fallbackCategoryKey } from '../utils/productImagery';
import { resolveAppleImage } from '../utils/appleImagery';
import { resolveSamsungImage } from '../utils/samsungImagery';
import { resolveGoogleImage } from '../utils/googleImagery';
import CategoryIllustration from './CategoryIllustration';
import DeviceMock from './DeviceMock';

export interface ProductImageProps {
  brand: string;
  model: string;
  storage?: string;
  imageUrl: string;
  /** Optional — DeviceMock paints the body in this colour. */
  color?: string;
  /** Optional — improves the synthetic fallback's category matching. */
  category?: string;
  alt?: string;
  /** Forces the synthetic fallback even when a real asset exists. */
  variant?: 'primary' | 'synthetic';
  /** Render hint — currently only forwarded to DeviceMock for sizing. */
  context?: 'card' | 'hero';
}

/**
 * ProductImage — four-tier resolution with graceful onError handoff:
 *
 *   1. Real photo on disk (committed asset or Shopify CDN shot).
 *   2. Curated brand-CDN render — Apple marketing CDN for every
 *      iPhone/iPad; committed /assets/ photos for Samsung + Google
 *      via family-fallback rules. Always a real device photograph.
 *   3. DeviceMock — inline SVG that draws the exact device form factor
 *      and paints it in the selected colour. Zero network, sharp at
 *      every DPR.
 *   4. CategoryIllustration — generic category silhouette for anything
 *      DeviceMock doesn't classify.
 */

const PLACEHOLDER_HOST_RE = /^https?:\/\/(placehold\.co|placeholder\.com|via\.placeholder\.com|dummyimage\.com)/i;

export function ProductImage({
  imageUrl, alt, brand, model, color, category, variant, context: _ctx,
}: ProductImageProps) {
  const isPlaceholderUrl = typeof imageUrl === 'string' && PLACEHOLDER_HOST_RE.test(imageUrl);
  const [photoFailed, setPhotoFailed] = useState(false);
  const [brandFailed, setBrandFailed] = useState(false);

  // Tier 1 — real product photo on disk / trusted CDN.
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

  // Tier 2 — curated brand CDN / committed asset render.
  const brandUrl = !brandFailed
    ? (resolveAppleImage(brand, model)
        ?? resolveSamsungImage(brand, model)
        ?? resolveGoogleImage(brand, model))
    : null;

  if (brandUrl) {
    return (
      <img
        src={brandUrl}
        alt={alt ?? ''}
        loading="lazy"
        decoding="async"
        onError={() => setBrandFailed(true)}
        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
      />
    );
  }

  // Tier 3 — DeviceMock SVG, exact form factor + variant colour.
  if (brand && model) {
    return (
      <DeviceMock
        brand={brand}
        model={model}
        color={color}
        category={category}
        alt={alt}
      />
    );
  }

  // Tier 4 — generic category silhouette.
  return (
    <div aria-label={alt} style={{ width: '100%', height: '100%' }}>
      <CategoryIllustration category={fallbackCategoryKey(category, model)} rounded={false} />
    </div>
  );
}

export default ProductImage;
