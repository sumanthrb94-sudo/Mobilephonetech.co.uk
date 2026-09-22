import { createHash } from 'node:crypto';
import { callerIsAdmin, verifyCaller } from '../_firebaseAdmin.js';
import { enforceRateLimit } from '../_rateLimit.js';

/**
 * Signs one Cloudinary upload, for a caller allowed to make it.
 *
 * Cloudinary offers unsigned upload presets, which would be a single line of
 * client code and a standing invitation: the preset name ships in the
 * browser bundle, and anyone who reads it can fill the account's storage
 * from a script. The secret never leaves the server here, and every upload
 * is signed one at a time, for a folder this route chooses.
 *
 * Who may upload what is decided here rather than in the client, because the
 * client is the thing being checked:
 *   - product and banner artwork  → staff only
 *   - review photos               → any signed-in customer, into a folder
 *                                   named after their own uid
 *
 * The folder is part of the signed payload, so Cloudinary rejects an upload
 * that tries to land anywhere other than where this route put it. A customer
 * cannot post their photo into the product-images folder by editing the
 * request, because the signature would no longer match.
 */

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const API_KEY = process.env.CLOUDINARY_API_KEY;
const API_SECRET = process.env.CLOUDINARY_API_SECRET;

const FOLDERS = {
  product: 'lehart/product-images',
  banner: 'lehart/banner-images',
  review: 'lehart/review-photos',
} as const;

type Kind = keyof typeof FOLDERS;

/**
 * Cloudinary's signature: every parameter that will be posted except the
 * file, cloud_name, resource_type and api_key, sorted by name, joined as
 * `k=v&k=v`, with the API secret appended directly — then SHA-1, hex.
 *
 * Exported for the test that checks it against Cloudinary's own published
 * worked example, which is the only way to know this is right without
 * posting a real upload at them.
 */
export function signUploadParams(
  params: Record<string, string | number>,
  secret: string,
): string {
  const serialised = Object.keys(params)
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('&');
  return createHash('sha1').update(serialised + secret).digest('hex');
}

/**
 * One path segment, with anything that could climb out of it removed.
 *
 * Dropping the separators alone is not enough: it leaves runs of dots that
 * still read as "parent directory" to anything that later treats the value
 * as a path, so those are collapsed too rather than left to be somebody
 * else's problem.
 */
function safeSegment(value: unknown): string {
  return String(value ?? '')
    .replace(/[^a-zA-Z0-9._-]/g, '')
    .replace(/\.{2,}/g, '.')
    .replace(/^[.\-]+|[.\-]+$/g, '')
    .slice(0, 80);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!enforceRateLimit(req, res, 'cloudinary-sign', { limit: 30, windowMs: 60_000 })) return;

  // Not configured is a 503 on purpose, and the client treats it as "fall
  // back to the other uploader" rather than as a failure — so a deployment
  // without Cloudinary keys behaves exactly as it did before.
  if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
    return res.status(503).json({ error: 'Cloudinary is not configured' });
  }

  const kind = String(req.body?.kind ?? '') as Kind;
  if (!Object.prototype.hasOwnProperty.call(FOLDERS, kind)) {
    return res.status(400).json({ error: 'kind must be product, banner or review' });
  }

  let folder: string;

  if (kind === 'review') {
    const caller = await verifyCaller(req);
    if (!caller?.uid) {
      return res.status(401).json({ error: 'Sign in to attach a photo.' });
    }
    // Their own uid, never one supplied by the request.
    folder = `${FOLDERS.review}/${caller.uid}`;
  } else {
    if (!(await callerIsAdmin(req))) {
      return res.status(403).json({ error: 'Staff only' });
    }
    const id = safeSegment(req.body?.id);
    folder = id ? `${FOLDERS[kind]}/${id}` : FOLDERS[kind];
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const signature = signUploadParams({ folder, timestamp }, API_SECRET);

  return res.status(200).json({ cloudName: CLOUD_NAME, apiKey: API_KEY, timestamp, signature, folder });
}
