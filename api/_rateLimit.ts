/**
 * Fixed-window rate limiter for the unauthenticated write routes.
 *
 * In-memory, per serverless instance — which is a real limitation worth being
 * honest about: Vercel may run several instances, each with its own counters,
 * so the effective ceiling is (limit × instances) and resets on cold start.
 * That still stops the attacks these routes actually see (a loop hammering
 * newsletter signup or review submission from one address), at zero
 * infrastructure cost. A durable shared store (Upstash Redis or a Firestore
 * counter) is the upgrade path if abuse ever outruns this.
 */

type Window = { count: number; resetAt: number };

const buckets = new Map<string, Window>();

// A bounded map, so a slow scan across many IPs cannot grow memory forever.
const MAX_KEYS = 5000;

/** First address in x-forwarded-for is the client as Vercel saw it. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function clientIp(req: any): string {
  const fwd = String(req.headers?.['x-forwarded-for'] ?? '');
  return (fwd.split(',')[0] || '').trim() || String(req.socket?.remoteAddress ?? 'unknown');
}

/**
 * Returns true when the caller is within the limit. On refusal the caller
 * should send 429 with Retry-After (rateLimitResponse below does both).
 */
export function allowRequest(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number },
): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const win = buckets.get(key);

  if (!win || now >= win.resetAt) {
    if (buckets.size >= MAX_KEYS) buckets.clear();
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  win.count += 1;
  if (win.count > limit) {
    return { allowed: false, retryAfterSeconds: Math.ceil((win.resetAt - now) / 1000) };
  }
  return { allowed: true, retryAfterSeconds: 0 };
}

/**
 * Test hook: clears all windows. Unit tests exercise the same handler many
 * times from one fake client, which is exactly the pattern the limiter
 * exists to stop — so each test starts from a clean slate instead.
 */
export function resetRateLimits(): void {
  buckets.clear();
}

/**
 * Convenience wrapper: applies the limit and, when exceeded, writes the 429
 * itself. Returns true when the request may proceed.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function enforceRateLimit(
  req: any,
  res: any,
  route: string,
  opts: { limit: number; windowMs: number },
): boolean {
  const { allowed, retryAfterSeconds } = allowRequest(`${route}:${clientIp(req)}`, opts);
  if (!allowed) {
    res.setHeader('Retry-After', String(retryAfterSeconds));
    res.status(429).json({ error: 'Too many requests — try again shortly.' });
    return false;
  }
  return true;
}
