/**
 * How many pictures a product carries, and how the gallery fills its frames.
 *
 * Six, because the product page's gallery is a six-cell grid. The number is
 * a property of that layout rather than of storage: fewer than six leaves
 * holes in it, and a seventh has nowhere to go — it wraps the thumbnail row
 * onto a second line nobody designed.
 *
 * This lives in its own module, imported by both the shop and the admin, so
 * the editor's limit and the gallery's frame count are the same number. It
 * deliberately pulls in nothing else: the product page would otherwise drag
 * the whole admin data layer into a shopper's bundle just to read a six.
 */

export const MAX_PRODUCT_IMAGES = 6;

const PLACEHOLDER_HOSTS = /^https?:\/\/(placehold\.co|placeholder\.com|via\.placeholder\.com|dummyimage\.com)\b/i;

/**
 * Whether a stored image is a real photo staff uploaded (Cloudinary, Firebase
 * Storage, or a link pasted in the editor) rather than a stand-in.
 *
 * Local paths are not: /assets/* are the demo catalogue's shared pictures,
 * identical across models and colours, and a shop selling specific used
 * devices must not present one as the unit a buyer receives. Anything that
 * fails this shows the LeHart "photo coming soon" mark instead.
 */
export function isUploadedPhoto(url: unknown): url is string {
  return typeof url === 'string' && /^https?:\/\//i.test(url.trim()) && !PLACEHOLDER_HOSTS.test(url);
}

/**
 * The images a product is allowed to keep, in order.
 *
 * Duplicates are preserved on purpose. Six distinct photos of every device
 * is the goal, not the requirement, and a shop with two real angles is
 * better served showing them twice than showing four empty frames.
 */
export function capImages(images: string[]): string[] {
  return images.slice(0, MAX_PRODUCT_IMAGES);
}

/**
 * Exactly six frames for the gallery, whatever the product has.
 *
 * Short of six it repeats what there is, cycling from the start, so the
 * grid is always full. Beyond six it takes the first six — which only
 * happens for rows saved before the limit existed, since the editor and
 * the save path both cap it now.
 *
 * An empty list gives an empty gallery rather than six copies of nothing:
 * the caller decides what a product with no imagery looks like.
 */
export function galleryFrames(images: string[]): string[] {
  const usable = images.filter(Boolean);
  if (usable.length === 0) return [];
  return Array.from(
    { length: MAX_PRODUCT_IMAGES },
    (_, i) => usable[i % usable.length],
  );
}

/**
 * Real photos first, placeholders gone.
 *
 * Products created from the catalogue start with a bundled drawing
 * (/assets/catalogue/*.svg) as their main image. When staff later add real
 * photos by link, those land after the drawing, and the main image (which
 * decides cards, the product page hero and the home page) stayed the
 * drawing: eight in-stock iPhones had their Cloudinary photos stored and
 * none of them showed. So: as soon as one real photo exists, the main image
 * is the first real photo and the stand-ins drop out of the gallery. With no
 * real photo, nothing changes.
 */
export function photosFirst(imageUrl: unknown, gallery: unknown): { imageUrl: string; galleryImages?: string[] } {
  const primary = typeof imageUrl === 'string' ? imageUrl : '';
  const list = Array.isArray(gallery) ? gallery.filter((g): g is string => typeof g === 'string' && g.length > 0) : undefined;
  const photos = [primary, ...(list ?? [])].filter(isUploadedPhoto);
  if (!photos.length) return { imageUrl: primary, galleryImages: list };
  const unique = [...new Set(photos)];
  return { imageUrl: unique[0], galleryImages: unique };
}
