import { useState } from 'react';
import { resolveImageUrl, fallbackCategoryKey } from '../utils/productImagery';
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
 * ProductImage — three-tier resolution with graceful onError handoff:
 *
 *   1. Real photo on disk (Shopify product shot or one we ship in
 *      /public/assets/) — only when the URL isn't a known text-only
 *      placeholder host.
 *   2. DeviceMock — programmatic SVG render that knows the right form
 *      factor for every brand + model in the catalogue (iPhone modern,
 *      classic, foldable, tablet, console, audio, etc.) and paints the
 *      body in the user's selected colour. Inline SVG → zero network,
 *      sharp at every DPR, accurate per-colour without committing 130
 *      raster files.
 *   3. CategoryIllustration silhouette — the existing Claude-designed
 *      SVG keyed to the product's category. Final fallback for items
 *      DeviceMock doesn't classify.
 *
 * Each tier swaps to the next via <img onError>, so a 404 never lands
 * a broken-image glyph on the page.
 */

const PLACEHOLDER_HOST_RE = /^https?:\/\/(placehold\.co|placeholder\.com|via\.placeholder\.com|dummyimage\.com)/i;

export function ProductImage({
  imageUrl, alt, brand, model, color, category, variant, context: _ctx,
}: ProductImageProps) {
  const isPlaceholderUrl = typeof imageUrl === 'string' && PLACEHOLDER_HOST_RE.test(imageUrl);
  const [photoFailed, setPhotoFailed] = useState(false);

  // Tier 1 — real product photo we already control on disk / trusted CDN.
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

  // Tier 2 — DeviceMock SVG, exact form factor + variant colour.
  // This is the dominant path for ~125 of 133 catalogue products
  // since most ship with placehold.co URLs from the inventory import.
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

  // Tier 3 — generic category silhouette for anything left over.
  return (
    <div aria-label={alt} style={{ width: '100%', height: '100%' }}>
      <CategoryIllustration category={fallbackCategoryKey(category, model)} rounded={false} />
    </div>
  );
}

export default ProductImage;
