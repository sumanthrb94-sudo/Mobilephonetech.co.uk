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
 *   - SIZE: nothing needs to be wider than a rung's dimension to look sharp
 *     in this storefront's largest image slot (the PDP gallery). A single
 *     fixed size was not always enough — a busy or high-detail source photo
 *     can still re-encode to something larger than is worth shipping, so
 *     this walks a short ladder of smaller rungs until one lands at or under
 *     a byte budget, the same idea as trading resolution for a size target
 *     rather than fixing the resolution and hoping.
 *   - FORMAT: WebP at these qualities is visually indistinguishable from a
 *     source JPEG for product photography, at roughly a third the size.
 *
 * WEBP IS NEVER TRUSTED BLINDLY
 *
 * canvas.toBlob(cb, 'image/webp', q) does not fail or throw on a browser
 * that cannot actually encode WebP — it silently hands back a PNG blob
 * instead. The bug that invites is labelling the file "image/webp" anyway,
 * because that was the format asked for: the upload then carries bytes that
 * are really a PNG under a Content-Type that says otherwise, which breaks
 * decoding wherever that Content-Type is trusted (a <img> tag, an image
 * proxy, Storage's own content-type validation). So the blob's own `.type`
 * — never the format requested — decides both what gets uploaded and what
 * extension the file is given. When the browser cannot produce WebP, this
 * asks for a JPEG re-encode instead, which has universal support and still
 * keeps the resize saving even without the format change.
 *
 * FAILS OPEN, NEVER BLOCKS AN UPLOAD
 *
 * Canvas encoding can fail — a corrupt file, an exotic colour profile, no
 * canvas in this environment. None of those are reasons to stop an admin
 * from uploading a photo. Every failure path returns the ORIGINAL file,
 * unmodified, so the upload proceeds exactly as it did before this existed;
 * validateImageFile's existing type/size checks are the backstop either way.
 *
 * NEVER MAKES A FILE BIGGER
 *
 * A handful of inputs — a small icon-like PNG, an image already saved as
 * compressed WebP — will not shrink further, and a re-encode can
 * occasionally come out larger than the source. The best rung tried is
 * compared to the original and the smaller of the two is what gets
 * returned.
 */

/** One rung of the downscale ladder: how big to draw it, and at what quality. */
interface Rung { dim: number; quality: number }

/**
 * Long edges to try, largest first, and the quality to encode each at.
 * Lower rungs exist for the source photos that do not compress well at the
 * top one — a screenshot, a busy or noisy background — not for the ordinary
 * product photo, which is expected to clear the budget on the first rung.
 */
const RUNGS: Rung[] = [
  { dim: 2000, quality: 0.85 },
  { dim: 1600, quality: 0.8 },
  { dim: 1200, quality: 0.72 },
  { dim: 900, quality: 0.65 },
];

/**
 * Stop trying further (smaller, worse-looking) rungs once a result is at or
 * under this many bytes. Generous for a product photo against a plain
 * background — this storefront does not share Firestore's per-document
 * byte cap the way an earlier design here did, because only a short URL is
 * ever stored in the document; this budget exists purely for page-load
 * weight, not to fit inside anything.
 */
const BYTE_BUDGET = 350 * 1024;

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

/** The file extension a blob's own MIME type calls for — never the format that was asked for. */
export function extensionFor(mimeType: string): string {
  if (mimeType === 'image/webp') return 'webp';
  if (mimeType === 'image/jpeg') return 'jpg';
  if (mimeType === 'image/png') return 'png';
  // Not a format this module ever asks a canvas to produce; a caller passing
  // something else has a bug worth surfacing rather than a filename to guess.
  throw new Error(`extensionFor: unexpected MIME type "${mimeType}"`);
}

/**
 * Walk the ladder, calling `encode` for each rung until one result is
 * within budget, otherwise keep the smallest result actually seen.
 *
 * The policy — which rung wins, when to stop early, downscaling only —
 * lives here and only here, as a pure function over an injected encoder.
 * `encode` is the one impure part (it draws to a real canvas), so keeping
 * it as a parameter is what lets this policy be checked with a fake encoder
 * and no browser at all; see src/__tests__/lib/imageOptimize.test.ts.
 */
export async function pickBestEncoding(
  sourceMaxDim: number,
  encode: (dim: number, quality: number) => Promise<Blob | null>,
  rungs: readonly Rung[] = RUNGS,
  budget: number = BYTE_BUDGET,
): Promise<Blob | null> {
  let best: Blob | null = null;

  for (const rung of rungs) {
    // Downscale only: a rung asking for more than the source actually has is
    // capped at the source's own size rather than upscaling into detail that
    // was never there.
    const dim = Math.min(rung.dim, sourceMaxDim);
    // Sequential on purpose — each rung is only worth trying once the one
    // above it has proven too big, and it is one canvas draw at a time either
    // way, so nothing is gained by racing them.
    // eslint-disable-next-line no-await-in-loop
    const blob = await encode(dim, rung.quality);
    if (!blob) continue;
    if (!best || blob.size < best.size) best = blob;
    if (blob.size <= budget) break;
    // Otherwise keep going: a source too small to reach a lower rung's
    // dimension still draws at that same capped size, and the lower
    // quality below it can still win back bytes the higher quality did not.
  }

  return best;
}

/** One rung's canvas draw and encode attempt — the thin, browser-only glue `pickBestEncoding` calls. */
async function encodeRung(bitmap: ImageBitmap, dim: number, quality: number): Promise<Blob | null> {
  const scale = Math.min(1, dim / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(bitmap, 0, 0, width, height);

  // See the module doc: the format actually produced, not the one asked
  // for, is what every caller downstream has to trust.
  const webp = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/webp', quality));
  if (webp && webp.type === 'image/webp') return webp;
  return new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', quality));
}

export async function optimizeImage(file: File): Promise<OptimizeResult> {
  const noChange: OptimizeResult = {
    file, optimized: false, originalBytes: file.size, finalBytes: file.size,
  };

  // SVG and anything already tiny is not worth the round trip through canvas.
  if (file.type === 'image/svg+xml') return noChange;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    // Corrupt file, unsupported codec, no createImageBitmap in this
    // environment — the original file is exactly as uploadable as it was
    // before this ran.
    return noChange;
  }

  try {
    const blob = await pickBestEncoding(
      Math.max(bitmap.width, bitmap.height),
      (dim, quality) => encodeRung(bitmap, dim, quality),
    );
    if (!blob) return noChange;

    // The one rule that matters: never hand back something bigger than what
    // came in. A source that was already small and well-compressed is left
    // exactly as it was rather than "optimised" into something larger.
    if (blob.size >= file.size) return noChange;

    const optimizedFile = new File([blob], withExt(file.name, extensionFor(blob.type)), {
      type: blob.type,
      lastModified: file.lastModified,
    });
    return {
      file: optimizedFile, optimized: true,
      originalBytes: file.size, finalBytes: optimizedFile.size,
    };
  } catch {
    return noChange;
  } finally {
    bitmap.close();
  }
}
