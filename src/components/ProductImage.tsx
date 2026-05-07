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
  /** Optional — selects the color-specific marketing photo from brand CDN. */
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
 *   1. Brand CDN — color-specific marketing shot (Apple CDN per model+color,
 *      Samsung/Google committed /assets/ photos). Always a real photograph.
 *   2. Disk asset — the product's imageUrl if it's a real local/CDN photo.
 *   3. DeviceMock — inline SVG drawing the exact device form factor in the
 *      selected colour. Zero network, sharp at every DPR.
 *   4. CategoryIllustration — generic category silhouette as last resort.
 *
 * Brand CDN is tried first so color-specific Apple marketing shots take
 * priority over the shared generic /assets/ PNGs that data.ts carries as
 * imageUrl — those are identical across many models and have no color info.
 */

const PLACEHOLDER_HOST_RE = /^https?:\/\/(placehold\.co|placeholder\.com|via\.placeholder\.com|dummyimage\.com)/i;

export function ProductImage({
  imageUrl, alt, brand, model, color, category, variant, context: _ctx,
}: ProductImageProps) {
  const isPlaceholderUrl = typeof imageUrl === 'string' && PLACEHOLDER_HOST_RE.test(imageUrl);
  const [brandFailed, setBrandFailed] = useState(false);
  const [photoFailed, setPhotoFailed] = useState(false);

  // Tier 1 — color-specific brand CDN (Apple marketing CDN, Samsung/Google local assets).
  // Tried before disk so color-accurate photos win over shared generic PNGs.
  const brandUrl = variant !== 'synthetic' && !brandFailed
    ? (resolveAppleImage(brand, model, color)
        ?? resolveSamsungImage(brand, model, color)
        ?? resolveGoogleImage(brand, model, color))
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

  // Tier 2 — real product photo on disk / trusted CDN.
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
