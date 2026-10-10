import { auth } from './firebase';

/**
 * Uploads through Cloudinary, when the deployment has it configured.
 *
 * The server decides whether the caller may upload at all and which folder
 * the file lands in — see api/_routes/cloudinary-sign.ts. This side only
 * carries the signature it is given straight to Cloudinary, so nothing here
 * can widen what an upload is allowed to do.
 *
 * Returns null when Cloudinary is not set up on this deployment, which is
 * the caller's signal to use its existing uploader instead. That keeps the
 * Firebase Storage path working for the emulator suites, and means adding
 * the keys is the only step needed to switch production over.
 */

export type UploadKind = 'product' | 'banner' | 'review';

interface SignedUpload {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
}

/** Long enough for a 5MB photo on a slow connection, short enough that nobody stares at a spinner. */
export const SIGN_TIMEOUT_MS = 15_000;
export const UPLOAD_TIMEOUT_MS = 90_000;

function timeoutSignal(ms: number): AbortSignal | undefined {
  return typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal ? AbortSignal.timeout(ms) : undefined;
}

const isTimeout = (err: unknown) => ['TimeoutError', 'AbortError'].includes((err as { name?: string })?.name ?? '');

/*
 * Every outcome but "not configured" throws with the reason, and nothing
 * waits forever. Production has no Firebase Storage bucket, so a Cloudinary
 * failure that quietly fell back to Storage left the uploader spinning for
 * the ten minutes the Storage client spends retrying, and the real reason
 * was never shown to anyone.
 */
export async function uploadViaCloudinary(
  kind: UploadKind,
  file: File,
  id?: string,
): Promise<string | null> {
  const token = await auth.currentUser?.getIdToken().catch(() => null);

  let signed: Response;
  try {
    signed = await fetch('/api/cloudinary-sign', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ kind, id }),
      signal: timeoutSignal(SIGN_TIMEOUT_MS),
    });
  } catch (err) {
    throw new Error(isTimeout(err)
      ? 'The server took too long to approve the upload. Check your connection and try again.'
      : 'Could not reach the server to approve the upload. Check your connection and try again.');
  }

  // Not configured here — the caller falls back to its own uploader.
  if (signed.status === 503) return null;

  // A 401/403/400 is a real answer about this upload, so it is surfaced
  // rather than quietly retried somewhere the caller is not allowed either.
  if (!signed.ok) {
    const data = await signed.json().catch(() => ({}));
    throw new Error(data.error || 'That upload was not allowed.');
  }

  const { cloudName, apiKey, timestamp, signature, folder } = await signed.json() as SignedUpload;

  // Exactly the fields the signature covers, plus the ones Cloudinary
  // excludes from it. An extra signed field here would invalidate it.
  const form = new FormData();
  form.append('file', file);
  form.append('api_key', apiKey);
  form.append('timestamp', String(timestamp));
  form.append('signature', signature);
  form.append('folder', folder);

  let res: Response;
  try {
    res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: 'POST',
      body: form,
      signal: timeoutSignal(UPLOAD_TIMEOUT_MS),
    });
  } catch (err) {
    throw new Error(isTimeout(err)
      ? 'The upload took too long and was stopped. Try again, or try a smaller photo.'
      : 'Could not reach Cloudinary to upload the photo. Check your connection and try again.');
  }

  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    // Cloudinary's own words, e.g. "Invalid Signature" or "Unknown API key",
    // which point straight at a wrong key in the Vercel settings.
    throw new Error(`Cloudinary refused the upload: ${detail?.error?.message || `error ${res.status}`}`);
  }

  const body = await res.json() as { secure_url?: string };
  if (!body.secure_url) throw new Error('The image could not be uploaded.');
  return formatCloudinaryUrl(body.secure_url);
}

/**
 * Injects automatic format negotiation (AVIF/WebP) and automatic quality
 * into Cloudinary URLs so clients always fetch the fastest, smallest asset.
 */
export function formatCloudinaryUrl(url: string): string {
  if (!url || !url.includes('res.cloudinary.com') || url.includes('/f_auto')) return url;
  return url.replace('/image/upload/', '/image/upload/f_auto,q_auto/');
}

