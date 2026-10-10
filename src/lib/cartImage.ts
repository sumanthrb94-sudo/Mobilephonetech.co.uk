import type { Product, ProductVariant } from '../types';
import { isUploadedPhoto } from './productImages';

/** What a cart line knows about itself; extra ids ride along at runtime. */
export interface CartLineRef {
  id: string;
  imageUrl?: string;
  color?: string;
  selectedColor?: string;
  productId?: string;
  variantId?: string;
}

const firstPhoto = (v: Pick<ProductVariant, 'imageUrl' | 'galleryImages'> | undefined): string | null =>
  [v?.galleryImages?.[0], v?.imageUrl].find(isUploadedPhoto) ?? null;

/**
 * The photo a cart line shows: the product's photo as it is NOW, not the
 * link saved when the line was added. Baskets outlive catalogue edits:
 * phones added before their photos were uploaded kept a placeholder path
 * and showed "Photo coming soon" in the cart for ever after.
 *
 * Prefers the exact configuration, then any configuration in the same
 * colour, then the photo the line saved if it is a real one, then the
 * product's main photo, then whatever the line saved.
 */
export function cartLineImage(line: CartLineRef, catalogue: Product[]): string {
  const saved = line.imageUrl ?? '';
  const product = catalogue.find(p => p.id === line.productId)
    ?? catalogue.find(p => p.id === line.id)
    ?? catalogue.find(p => p.variants?.some(v => v.id === (line.variantId ?? line.id)));
  if (!product) return saved;

  const variants = product.variants ?? [];
  const exact = variants.find(v => v.id === (line.variantId ?? line.id));
  const colour = (line.selectedColor ?? exact?.color ?? line.color ?? '').trim().toLowerCase();
  const sameColour = colour ? variants.filter(v => (v.color ?? '').trim().toLowerCase() === colour) : [];

  // A saved real photo beats the product's shared one: if the line's
  // configuration has since gone, the shared photo may be another colour.
  return firstPhoto(exact)
    ?? sameColour.map(firstPhoto).find(Boolean)
    ?? (isUploadedPhoto(saved) ? saved : null)
    ?? (isUploadedPhoto(product.imageUrl) ? product.imageUrl : null)
    ?? saved;
}
