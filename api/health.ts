import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL ?? '';
const key = process.env.VITE_SUPABASE_ANON_KEY ?? '';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Never cache: a stale "ok" is worse than no health check at all.
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  const checks: Record<string, unknown> = {
    supabaseUrlConfigured: Boolean(url),
    supabaseKeyConfigured: Boolean(key),
  };

  if (!url || !key) {
    checks.database = 'unconfigured';
    checks.detail = 'VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY missing from the environment';
    return res.status(503).json({ status: 'degraded', checks });
  }

  const started = Date.now();

  try {
    const supabase = createClient(url, key);
    const { count, error } = await supabase
      .from('products')
      .select('id', { count: 'exact', head: true });

    if (error) throw error;

    checks.database    = 'connected';
    checks.productRows = count ?? 0;
    checks.latencyMs   = Date.now() - started;

    // Reachable but empty still cannot serve a storefront, so report it as
    // degraded rather than letting the mock-data fallback disguise it.
    if (!count) {
      checks.detail = 'products table is empty';
      return res.status(503).json({ status: 'degraded', checks });
    }

    return res.status(200).json({ status: 'ok', checks });
  } catch (err) {
    checks.database  = 'unreachable';
    checks.latencyMs = Date.now() - started;
    checks.detail    = err instanceof Error ? err.message : String(err);
    return res.status(503).json({ status: 'degraded', checks });
  }
}
