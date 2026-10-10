/**
 * Render-time Cloudinary resizing.
 *
 * Uploads are stored as the original file with only f_auto,q_auto added
 * (see formatCloudinaryUrl in cloudinary.ts), so every product card was
 * downloading a full-size camera photo to draw it at 200px. Cloudinary will
 * resize on request; these build the URLs for that, and the srcset that
 * lets the browser pick the one that fits.
 *
 * res.cloudinary.com upload URLs and fetch URLs (/image/fetch/<transforms>/
 * <source url>, which is how most catalogue photos are linked) are
 * rewritten. A width, format and quality chosen here replace any f_ or q_
 * baked into the stored link (fetch links carry f_jpg,q_92), so a phone gets
 * a small AVIF or WebP rather than a 1600px JPEG. Anything else (a Firebase
 * Storage URL, a local /assets path) is returned untouched, because nothing
 * else understands the transformation syntax.
 */

/** Candidate widths offered in a srcset; c_limit never upscales past the original. */
export const CLOUDINARY_WIDTHS = [160, 320, 480, 640, 828, 1080, 1280, 1600] as const;

const UPLOAD = '/image/upload/';
const FETCH = '/image/fetch/';
/** Delivery settings this module chooses itself: format and quality. */
const DELIVERY = /^(f|q)_/;
// A transformation segment: comma-separated `x_value` components, e.g.
// `f_auto,q_auto` or `c_fill,w_400`. A version (`v1712345678`) is not one.
const TRANSFORM_SEGMENT = /^[a-z]{1,3}_[^/,]+(,[a-z]{1,3}_[^/,]+)*$/;

export function isCloudinaryUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.hostname === 'res.cloudinary.com' && (u.pathname.includes(UPLOAD) || u.pathname.includes(FETCH));
  } catch {
    return false;
  }
}

/**
 * The same image, limited to `width` pixels wide, in the best format the
 * browser accepts. Any transformation already in the URL is kept and runs
 * first; the default f_auto,q_auto added at upload is folded into ours
 * rather than repeated.
 */
export function cloudinaryWidthUrl(url: string, width: number): string {
  if (!isCloudinaryUrl(url)) return url;
  const kind = url.includes(UPLOAD) ? UPLOAD : FETCH;
  const at = url.indexOf(kind) + kind.length;
  const head = url.slice(0, at);
  const segments = url.slice(at).split('/');

  const existing: string[] = [];
  while (segments.length > 1 && TRANSFORM_SEGMENT.test(segments[0])) {
    const seg = (segments.shift() as string).split(',').filter(t => !DELIVERY.test(t)).join(',');
    if (seg) existing.push(seg);
  }
  const ours = `w_${Math.round(width)},c_limit,f_auto,q_auto`;
  return head + [...existing, ours, ...segments].join('/');
}

/** A `srcset` of width-limited renditions, or undefined for a non-Cloudinary URL. */
export function cloudinarySrcSet(url: string, widths: readonly number[] = CLOUDINARY_WIDTHS): string | undefined {
  if (!isCloudinaryUrl(url)) return undefined;
  return widths.map(w => `${cloudinaryWidthUrl(url, w)} ${w}w`).join(', ');
}
