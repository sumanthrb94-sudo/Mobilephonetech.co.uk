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
    });
  } catch {
    // The route is not reachable at all — a preview build with no API host
    // behind it, or an offline moment. Fall back rather than fail: the
    // upload has somewhere else to go.
    return null;
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

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST',
    body: form,
  });

  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error(detail?.error?.message || 'The image could not be uploaded.');
  }

  const body = await res.json() as { secure_url?: string };
  if (!body.secure_url) throw new Error('The image could not be uploaded.');
  return body.secure_url;
}
