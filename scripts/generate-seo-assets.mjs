#!/usr/bin/env node
/**
 * Generates public/sitemap.xml + public/robots.txt so both files ship with
 * the bundle. Runs via the `prebuild` npm script; product URLs are read from
 * the live catalogue at build time (see listedProductIds below).
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT       = resolve(__dirname, '..');
const PUBLIC_DIR = resolve(ROOT, 'public');
const ORIGIN     = 'https://lehart.co.uk';

/**
 * Product URLs come from the live catalogue: listed products only, read with
 * the same service account the API uses. Without credentials (a local build,
 * a fork's CI) the sitemap carries the static pages alone. It used to read
 * the bundled demo catalogue, which advertised 134 product pages to search
 * engines whether or not those products existed.
 */
async function listedProductIds() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) {
    console.warn('[seo] FIREBASE_SERVICE_ACCOUNT not set — sitemap lists static pages only.');
    return [];
  }
  try {
    const creds = JSON.parse(raw.trim().startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8'));
    if (typeof creds.private_key === 'string') creds.private_key = creds.private_key.replace(/\\n/g, '\n');
    const { cert, initializeApp } = await import('firebase-admin/app');
    const { getFirestore } = await import('firebase-admin/firestore');
    const app = initializeApp({
      credential: cert({ projectId: creds.project_id, clientEmail: creds.client_email, privateKey: creds.private_key }),
      projectId: creds.project_id,
    }, 'seo-assets');
    const snap = await getFirestore(app).collection('products').select('listed').limit(2000).get();
    return snap.docs.filter(d => d.get('listed') !== false).map(d => d.id).sort();
  } catch (err) {
    // A sitemap without product URLs is a smaller sitemap; a failed build is
    // a site that does not deploy. Never let this step break the build.
    console.warn(`[seo] Could not read products (${err.message}) — sitemap lists static pages only.`);
    return [];
  }
}

const ids = await listedProductIds();

const today = new Date().toISOString().slice(0, 10);

const staticRoutes = [
  { path: '/',                         priority: '1.0', freq: 'daily'   },
  { path: '/products',                 priority: '0.9', freq: 'daily'   },
  { path: '/products?category=apple',  priority: '0.9', freq: 'daily'   },
  { path: '/products?category=samsung',priority: '0.9', freq: 'daily'   },
  { path: '/products?category=google', priority: '0.9', freq: 'daily'   },
  { path: '/products?category=tablets',priority: '0.9', freq: 'daily'   },
  { path: '/products?category=watches',priority: '0.8', freq: 'daily'   },
  { path: '/products?category=accessories', priority: '0.7', freq: 'weekly' },
  { path: '/products?category=speakers',    priority: '0.6', freq: 'weekly' },
  { path: '/products?category=hearables',   priority: '0.6', freq: 'weekly' },
  { path: '/products?category=playables',   priority: '0.6', freq: 'weekly' },
  { path: '/about',                    priority: '0.5', freq: 'monthly' },
  { path: '/faq',                      priority: '0.5', freq: 'monthly' },
  { path: '/sustainability',           priority: '0.4', freq: 'monthly' },
  { path: '/guides',                   priority: '0.5', freq: 'monthly' },
  { path: '/privacy',                  priority: '0.3', freq: 'yearly'  },
  { path: '/terms',                    priority: '0.3', freq: 'yearly'  },
  { path: '/returns',                  priority: '0.4', freq: 'yearly'  },
  { path: '/delivery',                 priority: '0.4', freq: 'yearly'  },
  { path: '/cookies',                  priority: '0.2', freq: 'yearly'  },
];

const urls = [
  ...staticRoutes.map(r => ({ loc: `${ORIGIN}${r.path}`, lastmod: today, priority: r.priority, changefreq: r.freq })),
  ...ids.map(id => ({ loc: `${ORIGIN}/product/${id}`,    lastmod: today, priority: '0.8', changefreq: 'weekly' })),
];

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url>
    <loc>${u.loc.replace(/&/g, '&amp;')}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>
`;

// public/robots.txt is generated, not hand-edited — `prebuild` runs this
// script and overwrites it, so any change has to be made here to survive.
const robots = `# robots.txt — LeHart
User-agent: *
Allow: /
Disallow: /admin
Disallow: /checkout
Disallow: /cart
Disallow: /wishlist
Disallow: /orders
Disallow: /*?sort=
Disallow: /*?grade=

# AI crawlers — allow but rate-limit
User-agent: GPTBot
Allow: /
User-agent: Google-Extended
Allow: /
User-agent: CCBot
Allow: /

Sitemap: ${ORIGIN}/sitemap.xml
`;

mkdirSync(PUBLIC_DIR, { recursive: true });
writeFileSync(resolve(PUBLIC_DIR, 'sitemap.xml'), sitemap, 'utf8');
writeFileSync(resolve(PUBLIC_DIR, 'robots.txt'),  robots,  'utf8');

console.log(`[seo] Wrote sitemap.xml (${urls.length} urls) and robots.txt`);
