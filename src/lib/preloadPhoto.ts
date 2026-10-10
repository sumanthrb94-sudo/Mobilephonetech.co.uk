import { cloudinarySrcSet, cloudinaryWidthUrl } from './cloudinaryUrl';

export type PhotoContext = 'card' | 'hero' | 'thumb' | 'default';

/*
 * How wide the photo is drawn, per context, for `sizes`. Generous on purpose:
 * too small a guess shows a soft photo, too large merely costs bytes.
 */
const SIZES: Record<PhotoContext, string> = {
  hero: '(min-width: 1024px) 50vw, 100vw',
  card: '(min-width: 1024px) 25vw, 50vw',
  thumb: '96px',
  default: '(min-width: 1024px) 50vw, 100vw',
};

/**
 * The exact src, srcset and sizes an <img> uses for a photo. ProductImage
 * renders with these and preloadPhoto loads with these, so the browser picks
 * the same file both times and the preload is a cache hit, not a second
 * download of a different width.
 */
export function photoAttrs(url: string, context: PhotoContext = 'default') {
  const srcSet = cloudinarySrcSet(url);
  return {
    // A sized copy even for the fallback, never the original upload, which
    // for some catalogue photos is a 1.25MB PNG.
    src: srcSet ? cloudinaryWidthUrl(url, 828) : url,
    srcSet,
    sizes: srcSet ? SIZES[context] : undefined,
  };
}

const loaded = new Map<string, Promise<void>>();
const settled = new Set<string>();

/**
 * Download and decode a photo before it is shown. Resolves on success and
 * on failure alike: a broken photo is the <img>'s problem to report, and a
 * page must never wait forever on one.
 */
export function preloadPhoto(url: string, context: PhotoContext = 'default'): Promise<void> {
  const key = `${context} ${url}`;
  const known = loaded.get(key);
  if (known) return known;
  const job = new Promise<void>(resolve => {
    // jsdom never loads images; tests would otherwise sit out every timeout.
    if (import.meta.env.MODE === 'test' || typeof Image === 'undefined') { resolve(); return; }
    const img = new Image();
    const { src, srcSet, sizes } = photoAttrs(url, context);
    const done = () => resolve();
    img.onload = () => { (img.decode ? img.decode() : Promise.resolve()).then(done, done); };
    img.onerror = done;
    // sizes before srcset, so the browser chooses with the right width.
    if (sizes) img.sizes = sizes;
    if (srcSet) img.srcset = srcSet;
    img.src = src;
  });
  loaded.set(key, job);
  job.then(() => settled.add(key));
  return job;
}

/** Every photo loaded, or `timeoutMs` passed, whichever is first. */
export function preloadPhotos(
  photos: { url: string; context?: PhotoContext }[],
  timeoutMs: number,
): Promise<void> {
  const all = Promise.all(photos.map(p => preloadPhoto(p.url, p.context))).then(() => undefined);
  return Promise.race([all, new Promise<void>(r => setTimeout(r, timeoutMs))]);
}

/** Whether a photo already finished loading in this session. */
export function isPhotoLoaded(url: string, context: PhotoContext = 'default'): boolean {
  return settled.has(`${context} ${url}`);
}
