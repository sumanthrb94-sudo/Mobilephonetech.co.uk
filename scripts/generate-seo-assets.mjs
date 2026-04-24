#!/usr/bin/env node
/**
 * Generates public/sitemap.xml + public/robots.txt from the product
 * catalogue so both files ship with the bundle. Runs via the
 * `prebuild` npm script, keeping sitemap URLs in lockstep with
 * data.ts without a manual step.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT       = resolve(__dirname, '..');
const DATA_PATH  = resolve(ROOT, 'src/data.ts');
const PUBLIC_DIR = resolve(ROOT, 'public');
const ORIGIN     = 'https://mobilephonetech.co.uk';

const data = readFileSync(DATA_PATH, 'utf8');

// Cheap regex extract — avoids booting TS/bundler just for a build step.
// Only picks product-level `id:` entries (those followed by `model:` or
// `brand:` within ~400 chars); skips `variants[].id` and category IDs.
const ids = [...data.matchAll(
  /id:\s*["']([a-z0-9][a-z0-9-]+)["'][\s\S]{0,400}?(?:model|brand):/gi
)].map(m => m[1]);

const today = new Date().toISOString().slice(0, 10);

const staticRoutes = [
  { path: '/',                         priority: '1.0', freq: 'daily'   },
  { path: '/products',                 priority: '0.9', freq: 'daily'   },
  { path: '/products?category=apple',  priority: '0.9', freq: 'daily'   },
  { path: '/products?category=samsung',priority: '0.9', freq: 'daily'   },
  { path: '/products?category=google', priority: '0.9', freq: 'daily'   },
  { path: '/products?category=tablets',priority: '0.9', freq: 'daily'   },
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

const robots = `# robots.txt — MobileTech UK
User-agent: *
Allow: /
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
