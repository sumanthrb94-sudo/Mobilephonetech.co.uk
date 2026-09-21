/**
 * imageOptimize — resize and re-encode a product photo in the browser,
 * before it ever leaves the admin's machine.
 *
 * WHY THIS EXISTS
 *
 * uploadImage() in adminApi.ts sends whatever File it is given, unchanged,
 * straight to Storage. A phone camera or a "download the press photo"
 * click routinely produces a 4000px, 3-8MB JPEG — well under the 5MB cap
 * validateImageFile enforces, so nothing rejects it, and it would go
 * straight to a product card that renders the same photo at maybe 300px
 * wide. Every visitor's phone would then download a file sized for a
 * cinema screen to show something the size of a playing card.
 *
 * "Optimised" here means two independent things, both handled here:
 *   - SIZE: nothing needs to be wider than MAX_DIMENSION to look sharp in
 *     this storefront's largest image slot (the PDP gallery). Bigger than
 *     that is bytes nobody's screen can even show.
 *   - FORMAT: WebP at this quality is visually indistinguishable from a
 *     source JPEG for product photography, at roughly a third the size.
 *
 * FAILS OPEN, NEVER BLOCKS AN UPLOAD
 *
 * Canvas encoding can fail — a corrupt file, an exotic color profile, a
 * browser without WebP encode support. None of those are reasons to stop
 * an admin from uploading a photo. Every failure path returns the ORIGINAL
 * file, unmodified, so the upload proceeds exactly as it did before this
 * existed; validateImageFile's existing type/size checks are the backstop
 * either way.
 *
 * NEVER MAKES A FILE BIGGER
 *
 * A handful of inputs — a small icon-like PNG, an image already saved as
 * compressed WebP — will not shrink further, and re-encoding one can
 * occasionally come out larger than the source. The result is compared to
 * the original and the smaller of the two is what gets returned.
 */

/** Long edge nothing in this storefront's layout needs more than. */
const MAX_DIMENSION = 2000;
/** Visually lossless for product photography; far below this looks it. */
const QUALITY = 0.85;

export interface OptimizeResult {
  file: File;
  /** Whether `file` is the re-encoded version rather than the original. */
  optimized: boolean;
  originalBytes: number;
  finalBytes: number;
}

function withExt(name: string, ext: string): string {
  const dot = name.lastIndexOf('.');
  const base = dot > 0 ? name.slice(0, dot) : name;
  return `${base}.${ext}`;
}

export async function optimizeImage(file: File): Promise<OptimizeResult> {
  const noChange: OptimizeResult = {
    file, optimized: false, originalBytes: file.size, finalBytes: file.size,
  };

  // SVG and anything already tiny is not worth the round trip through canvas.
  if (file.type === 'image/svg+xml') return noChange;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) { bitmap.close(); return noChange; }
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/webp', QUALITY));
    if (!blob) return noChange;

    // The one rule that matters: never hand back something bigger than what
    // came in. A source that was already small and well-compressed is left
    // exactly as it was rather than "optimised" into something larger.
    if (blob.size >= file.size) return noChange;

    const optimizedFile = new File([blob], withExt(file.name, 'webp'), {
      type: 'image/webp',
      lastModified: file.lastModified,
    });
    return {
      file: optimizedFile, optimized: true,
      originalBytes: file.size, finalBytes: optimizedFile.size,
    };
  } catch {
    // Corrupt file, unsupported codec, no canvas in this environment — the
    // original file is exactly as uploadable as it was before this ran.
    return noChange;
  }
}
