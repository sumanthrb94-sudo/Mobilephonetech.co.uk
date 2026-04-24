import { useState } from 'react';
import { resolveImageUrl, fallbackCategoryKey } from '../utils/productImagery';
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
 * ProductImage — resolves a product's artwork in three tiers:
 *   1. a real photo on disk or a trusted CDN (the Shopify product shot),
 *   2. the vendor's official brand logo via simpleicons.org — used for
 *      phones / tablets / laptops / consoles / foldables where brand
 *      identity is the primary visual cue even when a bespoke photo
 *      isn't available,
 *   3. the Claude-designed category silhouette for generic accessories
 *      and other non-branded items.
 *
 * Never renders a broken <img>.
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

  // Tier 2 — branded fallback for vendor-identifiable products.
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

  // Tier 3 — category illustration for everything else.
  return (
    <div aria-label={alt} style={{ width: '100%', height: '100%' }}>
      <CategoryIllustration category={fallbackCategoryKey(category, model)} rounded={false} />
    </div>
  );
}

export default ProductImage;
