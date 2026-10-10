import { useEffect, useState } from 'react';
import { isUploadedPhoto } from '../lib/productImages';
import { photoAttrs } from '../lib/preloadPhoto';
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
  /** Render hint: 'thumb' drops the "photo coming soon" tag. */
  context?: 'card' | 'hero' | 'thumb';
}

/**
 * ProductImage — the product's uploaded photo, or a drawing of the device in
 * the chosen colour until one is uploaded.
 *
 * Only a photo someone uploaded is shown as a photo (see isUploadedPhoto):
 * the demo catalogue's shared /assets pictures and brand CDN shots showed
 * shoppers a picture that was not the stock. The drawing (DeviceMock) is
 * plainly an illustration, follows the selected colour, and carries a small
 * "Photo coming soon" tag so staff can see which products still need photos.
 */
export function ProductImage({ brand, model, imageUrl, color, category, alt, context }: ProductImageProps) {
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(false); }, [imageUrl]);

  if (!failed && isUploadedPhoto(imageUrl)) {
    // The product page's main photo is that page's largest paint: fetch it
    // straight away and ahead of everything else, not when it scrolls in.
    const isHero = context === 'hero';
    // Same attributes preloadPhoto uses, so a preloaded photo is a cache hit.
    const { src, srcSet, sizes } = photoAttrs(imageUrl, context ?? 'default');
    return (
      <img
        src={src}
        srcSet={srcSet}
        sizes={sizes}
        alt={alt ?? ''}
        loading={isHero ? 'eager' : 'lazy'}
        fetchPriority={isHero ? 'high' : undefined}
        decoding="async"
        onError={() => setFailed(true)}
        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
      />
    );
  }

  const drawing = <DeviceMock brand={brand} model={model} color={color} category={category} alt={alt} />;
  // Cards carry their own badges (grade, saving) where the tag would sit,
  // and staff see missing photos in admin; the tag stays on the product page.
  if (context === 'thumb' || context === 'card') return drawing;
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {drawing}
      <span
        style={{
          position: 'absolute', left: '50%', bottom: '4%', transform: 'translateX(-50%)',
          padding: '3px 9px', borderRadius: 999, whiteSpace: 'nowrap',
          background: 'rgba(255,255,255,0.88)', color: 'var(--grey-60)',
          fontFamily: 'var(--font-body)', fontSize: 10, fontWeight: 600,
          boxShadow: '0 1px 2px rgba(0,0,0,0.08)', pointerEvents: 'none',
        }}
      >
        Photo coming soon
      </span>
    </div>
  );
}

export default ProductImage;
