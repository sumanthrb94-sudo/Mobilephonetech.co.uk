/**
 * How many pictures a product carries, and how the gallery fills its frames.
 *
 * Six, because the product page's thumbnail row has six cells. Fewer simply
 * leaves cells empty; a seventh has nowhere to go — it would wrap the row
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
 * At most six; the gallery itself shows each distinct photo once.
 */
export function capImages(images: string[]): string[] {
  return images.slice(0, MAX_PRODUCT_IMAGES);
}

/**
 * The photos the gallery shows: each distinct photo once, up to six.
 *
 * It used to pad to six by repeating, so a colour with three photos showed
 * each of them twice and a colour with one showed it six times. Shoppers
 * read that as duplicates, and it is: the gallery now has as many frames as
 * there are different photos.
 *
 * "Different" is by photo, not by link: the same Cloudinary image with other
 * size or format settings, or fetched from the same source, is one photo.
 * An empty list stays empty; the caller decides what no imagery looks like.
 */
export function galleryFrames(images: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const url of images) {
    if (!url) continue;
    const key = photoKey(url);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(url);
    if (out.length === MAX_PRODUCT_IMAGES) break;
  }
  return out;
}

/** One photo's identity: its link without size, format, version or query. */
export function photoKey(url: string): string {
  let s = url.trim().split(/[?#]/)[0];
  const fetchAt = s.indexOf('/image/fetch/');
  if (fetchAt >= 0) {
    // res.cloudinary.com/<cloud>/image/fetch/<transforms>/<source url>
    s = s.slice(fetchAt + '/image/fetch/'.length).replace(/^(?:[a-z]{1,3}_[^/]*\/)+/, '');
    try { s = decodeURIComponent(s); } catch { /* keep as is */ }
    return photoKey(s);
  }
  // res.cloudinary.com/<cloud>/image/upload/<transforms>/v123/<public id>
  s = s.replace(/\/image\/upload\/(?:[a-z]{1,3}_[^/]*\/)*(?:v\d+\/)?/, '/image/upload/');
  return s.replace(/\.(png|jpe?g|webp|avif|gif)$/i, '').toLowerCase();
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

const SIDE_SHOT = /-(front|back)$/;
const fileStem = (url: string) => {
  const name = url.split(/[?#]/)[0].split('/').pop() ?? '';
  let decoded = name;
  try { decoded = decodeURIComponent(name); } catch { /* keep as is */ }
  return decoded.replace(/\.(png|jpe?g|webp|avif|gif)$/i, '').toLowerCase();
};

/**
 * The photo showing the phone's back and front together, if it has one.
 *
 * Photos are named per finish: `…-cosmic-orange-front`, `…-cosmic-orange-back`
 * and `…-cosmic-orange` for the shot with both sides. That last one is the
 * best single picture of a phone, so home page rows use it as their artwork.
 * It is recognised by name: a photo whose name is another photo's name minus
 * "-front" or "-back". Colours in stock are looked at first.
 */
export function bothSidesPhoto(product: {
  imageUrl?: string;
  galleryImages?: string[];
  variants?: { imageUrl?: string; galleryImages?: string[]; stock?: number }[];
}): string | null {
  const variants = [...(product.variants ?? [])].sort((a, b) => Number((b.stock ?? 0) > 0) - Number((a.stock ?? 0) > 0));
  const lists = [
    [product.imageUrl, ...(product.galleryImages ?? [])],
    ...variants.map(v => [v.imageUrl, ...(v.galleryImages ?? [])]),
  ];
  for (const list of lists) {
    const photos = list.filter(isUploadedPhoto);
    const stems = photos.map(fileStem);
    const i = stems.findIndex((s, k) => !SIDE_SHOT.test(s)
      && stems.some((t, j) => j !== k && SIDE_SHOT.test(t) && t.replace(SIDE_SHOT, '') === s));
    if (i >= 0) return photos[i];
  }
  return null;
}
